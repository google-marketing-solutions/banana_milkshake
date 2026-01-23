import {Modality, Part} from '@google/genai';
import {defineComponent, PropType, reactive, ref, watch} from 'vue';
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_TEXT_MODEL,
  PROMPT_HELPER_PROMPT,
  SUPPORTED_IMAGE_MODELS,
  useVertexAi,
} from '../constants';
import {ai, callGenAIApi} from '../services/ai';
import {
  ImageInput,
  StepResult,
  StepState,
  Template,
  TemplateStep,
  TextVariable,
} from '../types';

/**
 * A Vue component for creating and editing templates.
 * It allows users to define steps, add text variables, upload images, and generate new images using AI.
 */
export const CreationPageComponent = defineComponent({
  name: 'CreationPageComponent',
  props: {
    initialTemplate: {
      type: Object as PropType<Template | null>,
      default: null,
    },
    isSaving: {
      type: Boolean,
      required: true,
    },
    getTemplateAssets: {
      type: Function as PropType<
        (
          folderId: string,
          steps: TemplateStep[],
        ) => Promise<Record<string, string>>
      >,
      required: true,
    },
  },
  emits: [
    'save-template-to-drive',
    'change-template',
    'create-new',
    'open-preview',
  ],
  setup(props, {emit}) {
    const templateName = ref('');
    const aspectRatio = ref('1:1');
    const genaiModel = ref(DEFAULT_IMAGE_MODEL);
    const steps = reactive<StepState[]>([]);
    const results = reactive<Record<string, StepResult>>({});
    const previewImageFile = ref<File | null>(null);
    const previewImagePreview = ref<string | null>(null);
    const isLoadingTemplate = ref(false);
    const supportedModels = SUPPORTED_IMAGE_MODELS;

    const loadTemplate = async (template: Template) => {
      templateName.value = template.name;
      aspectRatio.value = template.aspect_ratio;
      genaiModel.value = template.genai_model || DEFAULT_IMAGE_MODEL;
      steps.splice(0, steps.length);
      Object.keys(results).forEach((key) => delete results[key]);
      previewImageFile.value = null;
      previewImagePreview.value = template.previewImage || null;

      let staticAssets: Record<string, string> = {};
      if (template.driveFolderId) {
        // Fetch static assets from drive
        staticAssets = await props.getTemplateAssets(
          template.driveFolderId,
          template.steps,
        );
      }

      template.steps.forEach((stepData, index) => {
        const stepId = `step-${index}`;
        const imageInputs: ImageInput[] = stepData.image_slots.map(
          (slot, i) => ({
            assetName: slot.asset_name,
            isStatic: slot.is_static,
            file: null,
            previewUrl: staticAssets[slot.asset_name] || null,
            defaultFileName: slot.default_file_name,
            isLoading: false,
          }),
        );

        const textVariables: TextVariable[] = (
          stepData.text_variables || []
        ).map((tv) => ({...tv}));

        steps.push({
          id: stepId,
          title: stepData.name,
          prompt: stepData.text_prompt,
          imageInputs,
          textVariables,
          isGeneratingPrompt: false,
        });
        results[stepId] = {
          id: `result-${index}`,
          title: stepData.name,
          imageUrl: null,
          isLoading: false,
          error: null,
        };
      });
    };

    watch(
      () => props.initialTemplate,
      async (newTemplate) => {
        if (newTemplate) {
          isLoadingTemplate.value = true;
          try {
            await loadTemplate(newTemplate);
          } catch (e) {
            console.error('Error loading template data:', e);
            alert(
              'There was a problem loading the template. Please try again.',
            );
            // Reset state on failure
            templateName.value = '';
            aspectRatio.value = '1:1';
            genaiModel.value = DEFAULT_IMAGE_MODEL;
            steps.splice(0, steps.length);
            Object.keys(results).forEach((key) => delete results[key]);
            previewImageFile.value = null;
            previewImagePreview.value = null;
          } finally {
            isLoadingTemplate.value = false;
          }
        } else {
          isLoadingTemplate.value = false;
          templateName.value = '';
          aspectRatio.value = '1:1';
          genaiModel.value = DEFAULT_IMAGE_MODEL;
          steps.splice(0, steps.length);
          Object.keys(results).forEach((key) => delete results[key]);
          previewImageFile.value = null;
          previewImagePreview.value = null;
        }
      },
      {immediate: true},
    );

    const addStep = () => {
      const stepIndex = steps.length;
      const stepId = `step-${stepIndex}`;
      steps.push({
        id: stepId,
        title: `Step ${stepIndex + 1}: Additional Edit`,
        prompt: '',
        imageInputs: [
          {
            assetName: `asset${stepIndex * 2 + 2}`,
            isStatic: false,
            file: null,
            previewUrl: null,
            isLoading: false,
          },
        ],
        textVariables: [],
        isGeneratingPrompt: false,
      });
      results[stepId] = {
        id: `result-${stepIndex}`,
        title: `Step ${stepIndex + 1}: Additional Edit`,
        imageUrl: null,
        isLoading: false,
        error: null,
      };
    };

    const addImageSlot = (stepIndex: number) => {
      const step = steps[stepIndex];
      let maxAssetNum = 0;
      steps.forEach((s) => {
        s.imageInputs.forEach((input) => {
          const match = input.assetName.match(/^asset(\d+)$/);
          if (match) {
            const num = Number(match[1]);
            if (!isNaN(num) && num > maxAssetNum) {
              maxAssetNum = num;
            }
          }
        });
      });
      const newAssetNumber = maxAssetNum + 1;
      step.imageInputs.push({
        assetName: `asset${newAssetNumber}`,
        isStatic: false,
        file: null,
        previewUrl: null,
        isLoading: false,
      });
    };

    const removeImageSlot = (stepIndex: number, imgIndex: number) => {
      steps[stepIndex].imageInputs.splice(imgIndex, 1);
    };

    const addTextVariable = (stepIndex: number) => {
      steps[stepIndex].textVariables.push({name: '', default_value: ''});
    };
    const deleteTextVariable = (stepIndex: number, varIndex: number) => {
      steps[stepIndex].textVariables.splice(varIndex, 1);
    };

    const deleteStep = (index: number) => {
      const stepId = steps[index].id;
      steps.splice(index, 1);
      delete results[stepId];
    };

    const handleFileChange = (event: Event, imageInput: ImageInput) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        imageInput.file = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          imageInput.previewUrl = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    };

    const handlePreviewFileChange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        previewImageFile.value = file;
        const reader = new FileReader();
        reader.onload = (e) => {
          previewImagePreview.value = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }
    };

    const dataUrlToBase64 = (dataUrl: string) => dataUrl.split(',')[1];

    const runStep = async (step: StepState, index: number) => {
      const result = results[step.id];
      if (!step.prompt) {
        alert(`Please provide a prompt for ${step.title}.`);
        return;
      }

      result.isLoading = true;
      result.error = null;
      result.imageUrl = null;

      try {
        const parts: Part[] = [];
        // Handle image inputs in order
        // 1. Previous step's result
        if (index > 0) {
          const prevStep = steps[index - 1];
          const prevResult = results[prevStep.id];
          if (prevResult.imageUrl) {
            const base64Data = dataUrlToBase64(prevResult.imageUrl);
            const mimeType =
              prevResult.imageUrl.match(/data:(.*);base64/)?.[1] || 'image/png';
            parts.push({inlineData: {data: base64Data, mimeType}});
          } else {
            throw new Error(
              `Please run '${prevStep.title}' to generate an image for this step.`,
            );
          }
        }

        // 2. Current step's uploaded/static images
        for (const imageInput of step.imageInputs) {
          if (imageInput.previewUrl) {
            const base64 = dataUrlToBase64(imageInput.previewUrl);
            const mimeType =
              imageInput.previewUrl.match(/data:(.*);base64/)?.[1] ||
              'image/png';
            parts.push({inlineData: {data: base64, mimeType}});
          }
        }

        if (parts.length === 0) {
          throw new Error('Please upload at least one image to run this step.');
        }

        // Substitute text variables
        let promptToSend = step.prompt;
        for (const variable of step.textVariables) {
          if (variable.name) {
            const regex = new RegExp(`{{${variable.name.trim()}}}`, 'g');
            promptToSend = promptToSend.replace(
              regex,
              variable.default_value || '',
            );
          }
        }

        parts.push({text: promptToSend});
        console.log(parts);

        const modelToUse = genaiModel.value || DEFAULT_IMAGE_MODEL;

        let response;
        if (useVertexAi) {
          response = await callGenAIApi({
            model: modelToUse,
            contents: {
              role: 'user',
              parts,
            },
            config: {
              responseModalities: [Modality.IMAGE],
              imageConfig: {aspectRatio: aspectRatio.value},
            },
          });
        } else {
          response = await ai.models.generateContent({
            model: modelToUse,
            contents: {parts},
            config: {
              responseModalities: [Modality.IMAGE],
              imageConfig: {aspectRatio: aspectRatio.value},
            },
          });
        }

        const imagePart = response.candidates?.[0]?.content?.parts?.find(
          (p: Part) => p.inlineData,
        );
        if (imagePart?.inlineData) {
          result.imageUrl = `data:image/png;base64,${imagePart.inlineData.data}`;
        } else {
          throw new Error(
            'The model did not return an image. Try a different prompt.',
          );
        }
      } catch (e: unknown) {
        console.error('Error running step:', e);
        result.error =
          e instanceof Error
            ? e.message
            : 'An error occurred while generating the image.';
      } finally {
        result.isLoading = false;
      }
    };

    const helpMeWritePrompt = (step: StepState) => {
      const inputEl = document.getElementById(`prompt-helper-input-${step.id}`);
      if (inputEl) {
        inputEl.click();
      }
    };

    const handlePromptHelperUpload = async (event: Event, step: StepState) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      step.isGeneratingPrompt = true;
      try {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const base64Data = dataUrl.split(',')[1];
        const mimeType = dataUrl.match(/data:(.*);base64/)?.[1] || 'image/png';

        const imagePart = {inlineData: {data: base64Data, mimeType}};
        const textPart = {text: PROMPT_HELPER_PROMPT};

        if (useVertexAi) {
          const response = await callGenAIApi({
            model: DEFAULT_TEXT_MODEL,
            contents: {
              role: 'user',
              parts: [imagePart, textPart],
            },
          });
          // When using the server proxy, the response is plain JSON, so we can't use the .text getter.
          step.prompt =
            response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
          const response = await ai.models.generateContent({
            model: DEFAULT_TEXT_MODEL,
            contents: {parts: [imagePart, textPart]},
          });
          step.prompt = response.text ? response.text.trim() : '';
        }
      } catch (e: unknown) {
        console.error('Error generating prompt:', e);
        let message = 'An unknown error occurred.';
        if (e instanceof Error) {
          message = e.message;
        }
        alert('Failed to generate prompt. ' + message);
      } finally {
        step.isGeneratingPrompt = false;
        // Reset the file input value so the same file can be selected again
        (event.target as HTMLInputElement).value = '';
      }
    };

    const saveTemplate = async () => {
      if (!templateName.value.trim()) {
        alert('Please enter a name for your template.');
        return;
      }
      const filesToSave: Record<string, File> = {};
      const previewImageFileName = `preview.${previewImageFile.value?.name.split('.').pop() || 'png'}`;
      if (previewImageFile.value) {
        filesToSave[previewImageFileName] = previewImageFile.value;
      }

      const templateData: Template = {
        id: `custom-${Date.now()}`,
        name: templateName.value,
        description: `Custom template created on ${new Date().toLocaleDateString()}`,
        previewImage: previewImageFile.value
          ? previewImageFileName
          : props.initialTemplate?.previewImageFileName || '',
        aspect_ratio: aspectRatio.value,
        genai_model: genaiModel.value,
        steps: steps.map((s, stepIndex) => {
          return {
            name: s.title,
            text_prompt: s.prompt,
            image_slots: s.imageInputs.map((input, inputIndex) => {
              let fileName: string | undefined;
              if (input.isStatic && input.file) {
                const extension = input.file.name.split('.').pop() || 'png';
                fileName = `step_${stepIndex}_asset_${inputIndex}.${extension}`;
                filesToSave[fileName] = input.file;
              } else if (input.isStatic && input.defaultFileName) {
                fileName = input.defaultFileName;
              }
              return {
                asset_name: input.assetName,
                is_static: input.isStatic,
                default_file_name: fileName,
              };
            }),
            text_variables: s.textVariables
              .map((tv) => ({
                name: tv.name.trim(),
                default_value: tv.default_value.trim(),
              }))
              .filter((tv) => tv.name), // Only save variables with a name
          };
        }),
        previewImageFileName: previewImageFile.value
          ? previewImageFileName
          : props.initialTemplate?.previewImageFileName,
      };
      emit('save-template-to-drive', templateData, filesToSave);
    };

    return () => (
      <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 h-full">
        {isLoadingTemplate.value ? (
          <div class="flex flex-col items-center justify-center h-full text-center py-20">
            <svg
              class="animate-spin h-12 w-12 text-primary mx-auto"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h2 class="mt-4 text-xl font-bold text-on-surface">
              Loading Template...
            </h2>
            <p class="mt-2 text-md text-on-surface-variant">
              Please wait while we prepare your creative canvas.
            </p>
          </div>
        ) : steps.length > 0 ? (
          <div class="flex flex-col space-y-8">
            {/* Top Section: Settings */}
            <div class="material-card">
              <div class="flex justify-between items-center mb-6">
                <h2 class="text-lg font-bold">Template Settings</h2>
                <button
                  onClick={() => emit('change-template')}
                  class="text-sm text-primary font-medium hover:underline">
                  &larr; Back to Library
                </button>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <label
                    for="templateName"
                    class="block text-sm font-medium text-on-surface-variant mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    id="templateName"
                    value={templateName.value}
                    onInput={(e: Event) =>
                      (templateName.value = (
                        e.target as HTMLInputElement
                      ).value)
                    }
                    class="material-input bg-white"
                    placeholder="e.g., Product Lifestyle Shot"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-on-surface-variant mb-1">
                    GenAI Model
                  </label>
                  <select
                    value={genaiModel.value}
                    onChange={(e: Event) =>
                      (genaiModel.value = (e.target as HTMLInputElement).value)
                    }
                    class="material-input bg-white">
                    {supportedModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-on-surface-variant mb-1">
                    Final Aspect Ratio
                  </label>
                  <select
                    value={aspectRatio.value}
                    onChange={(e: Event) =>
                      (aspectRatio.value = (e.target as HTMLInputElement).value)
                    }
                    class="material-input bg-white">
                    <optgroup label="Square">
                      <option>1:1</option>
                    </optgroup>
                    <optgroup label="Landscape">
                      <option>21:9</option>
                      <option>16:9</option>
                      <option>3:2</option>
                      <option>4:3</option>
                      <option>5:4</option>
                    </optgroup>
                    <optgroup label="Portrait">
                      <option>9:16</option>
                      <option>2:3</option>
                      <option>3:4</option>
                      <option>4:5</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-on-surface-variant mb-1">
                    Preview Image
                  </label>
                  <label
                    for="preview-image-file"
                    class="mt-1 block cursor-pointer">
                    <div class="p-2 border-2 border-dashed border-outline rounded-lg text-center hover:bg-gray-50 flex items-center justify-center min-h-[42px] bg-gray-50">
                      {previewImagePreview.value ? (
                        <img
                          src={previewImagePreview.value}
                          class="max-h-12 mx-auto rounded"
                          alt="Preview image"
                        />
                      ) : (
                        <div class="flex items-center space-x-2 text-xs text-on-surface-variant">
                          <svg
                            class="h-6 w-6 text-gray-400"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48">
                            <path
                              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                              stroke-width="2"
                              stroke-linecap="round"
                              stroke-linejoin="round"></path>
                          </svg>
                          <span>Click to upload</span>
                        </div>
                      )}
                    </div>
                  </label>
                  <input
                    type="file"
                    id="preview-image-file"
                    onChange={handlePreviewFileChange}
                    class="hidden"
                    accept="image/*"
                  />
                </div>
              </div>
              <div class="mt-6 text-right">
                <button
                  onClick={saveTemplate}
                  class="material-button material-button-primary"
                  disabled={props.isSaving}>
                  {props.isSaving ? (
                    <svg
                      class="animate-spin h-5 w-5 mr-2 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24">
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      class="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                      />
                    </svg>
                  )}
                  {props.isSaving ? 'Saving...' : 'Save Template to Drive'}
                </button>
              </div>
            </div>

            {/* Bottom Section: Steps & Results */}
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Steps Column */}
              <div class="lg:col-span-2 space-y-6">
                {steps.map((step, index) => (
                  <div key={step.id} class="material-card relative">
                    {steps.length > 1 && (
                      <button
                        onClick={() => deleteStep(index)}
                        class="absolute top-4 right-4 p-1 text-on-surface-variant hover:text-red-600 rounded-full hover:bg-red-100 transition-colors"
                        aria-label={'Delete ' + step.title}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                    <input
                      type="text"
                      value={step.title}
                      onInput={(e: Event) => {
                        step.title = (e.target as HTMLInputElement).value;
                        results[step.id].title = (
                          e.target as HTMLInputElement
                        ).value;
                      }}
                      class="step-title"
                    />
                    <textarea
                      value={step.prompt}
                      onInput={(e: Event) =>
                        (step.prompt = (e.target as HTMLInputElement).value)
                      }
                      class="material-input bg-white"
                      rows={3}
                      placeholder="Describe the change... e.g., use asset1, asset2 and {{CTA}} etc. for images and text"></textarea>

                    <div class="text-right mt-2 text-sm">
                      {step.isGeneratingPrompt ? (
                        <span class="text-on-surface-variant inline-flex items-center">
                          <svg
                            class="animate-spin h-4 w-4 mr-1.5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24">
                            <circle
                              class="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              stroke-width="4"></circle>
                            <path
                              class="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </span>
                      ) : (
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            helpMeWritePrompt(step);
                          }}
                          class="text-primary font-medium hover:underline">
                          Help me write the prompt
                        </a>
                      )}
                    </div>
                    <input
                      type="file"
                      id={`prompt-helper-input-${step.id}`}
                      onChange={(e) => handlePromptHelperUpload(e, step)}
                      class="hidden"
                      accept="image/*"
                    />

                    <div class="mt-4 pt-4 border-t border-outline">
                      <h4 class="text-sm font-semibold mb-2 text-on-surface-variant">
                        Text Variables
                      </h4>
                      {step.textVariables.length === 0 ? (
                        <div class="text-center text-xs text-gray-500 py-2">
                          No variables defined. Click below to add one.
                        </div>
                      ) : (
                        <div class="space-y-2">
                          {step.textVariables.map((variable, varIndex) => (
                            <div
                              key={varIndex}
                              class="flex items-center space-x-2">
                              <input
                                type="text"
                                value={variable.name}
                                onInput={(e: Event) =>
                                  (variable.name = (
                                    e.target as HTMLInputElement
                                  ).value)
                                }
                                placeholder="Variable Name (e.g., CTA)"
                                class="material-input text-sm p-2 flex-1 bg-white"
                              />
                              <input
                                type="text"
                                value={variable.default_value}
                                onInput={(e: Event) =>
                                  (variable.default_value = (
                                    e.target as HTMLInputElement
                                  ).value)
                                }
                                placeholder="Default Value (e.g., Shop Now)"
                                class="material-input text-sm p-2 flex-1 bg-white"
                              />
                              <button
                                onClick={() =>
                                  deleteTextVariable(index, varIndex)
                                }
                                class="p-1.5 text-on-surface-variant hover:text-red-600 rounded-full hover:bg-red-100 transition-colors"
                                aria-label="Delete variable">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  class="h-5 w-5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor">
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => addTextVariable(index)}
                        class="material-button material-button-secondary w-full mt-3 text-sm py-1.5">
                        Add Variable
                      </button>
                    </div>

                    {index > 0 && (
                      <div class="mt-4 p-3 border border-dashed border-outline rounded-lg text-center bg-gray-50">
                        <p class="text-sm text-on-surface-variant">
                          Uses result from Step {index} as asset1.
                        </p>
                      </div>
                    )}

                    {step.imageInputs.map((imageInput, imgIndex) => (
                      <div key={imageInput.assetName} class="mt-4 relative">
                        <label
                          for={`${step.id}-${imgIndex}-file`}
                          class="block cursor-pointer">
                          <div class="p-4 border-2 border-dashed border-outline rounded-lg text-center hover:bg-gray-50 flex items-center justify-center min-h-[100px] bg-gray-50">
                            {imageInput.previewUrl ? (
                              <img
                                src={imageInput.previewUrl}
                                class="max-h-48 mx-auto rounded-lg"
                                alt="Image preview"
                              />
                            ) : (
                              <div>
                                <svg
                                  class="mx-auto h-8 w-8 text-gray-400"
                                  stroke="currentColor"
                                  fill="none"
                                  viewBox="0 0 48 48">
                                  <path
                                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"></path>
                                </svg>
                                <p class="mt-1 text-xs text-on-surface-variant">
                                  Click to upload image for{' '}
                                  {imageInput.assetName}
                                </p>
                              </div>
                            )}
                          </div>
                        </label>
                        <input
                          type="file"
                          id={`${step.id}-${imgIndex}-file`}
                          onChange={(e) => handleFileChange(e, imageInput)}
                          class="hidden"
                          accept="image/*"
                        />
                        {imageInput.previewUrl && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              imageInput.isStatic = !imageInput.isStatic;
                            }}
                            class={`absolute top-2 left-2 p-1.5 rounded-full transition-colors ${imageInput.isStatic ? 'bg-primary text-white' : 'bg-white/80 text-on-surface-variant hover:bg-white'}`}
                            title={
                              imageInput.isStatic
                                ? 'Unpin: Ask for this image on each run'
                                : 'Pin: Save this image in the template'
                            }>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="h-5 w-5"
                              viewBox="0 0 16 16"
                              fill="currentColor">
                              <path d="M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1 -.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => removeImageSlot(index, imgIndex)}
                          class="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 text-on-surface-variant hover:bg-white hover:text-red-600 transition-colors"
                          aria-label="Remove image slot">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}

                    {((index === 0 && step.imageInputs.length < 6) ||
                      (index > 0 && step.imageInputs.length < 5)) && (
                      <button
                        onClick={() => addImageSlot(index)}
                        class="material-button material-button-secondary w-full mt-4 text-sm py-2">
                        Add Image
                      </button>
                    )}

                    <div class="mt-4">
                      <button
                        onClick={() => runStep(step, index)}
                        class="material-button material-button-primary w-full"
                        disabled={results[step.id]?.isLoading}>
                        {!results[step.id]?.isLoading ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="h-5 w-5 mr-2"
                            viewBox="0 0 20 20"
                            fill="currentColor">
                            <path
                              fill-rule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                              clip-rule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            class="animate-spin h-5 w-5 mr-2 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24">
                            <circle
                              class="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              stroke-width="4"></circle>
                            <path
                              class="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        {results[step.id]?.isLoading
                          ? 'Running...'
                          : 'Run Step'}
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addStep}
                  class="material-button material-button-secondary w-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-5 w-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Add Step
                </button>
              </div>

              {/* Results Column */}
              <div class="lg:col-span-1 space-y-6 sticky top-[80px]">
                {Object.values(results).map((result: StepResult) => (
                  <div key={result.id} class="material-card">
                    <h2 class="text-lg font-bold mb-4">
                      Result: <span class="font-medium">{result.title}</span>
                    </h2>
                    <div class="aspect-square bg-gray-100 rounded-lg flex items-center justify-center p-2">
                      {result.isLoading ? (
                        <div class="flex flex-col items-center justify-center h-full">
                          <svg
                            class="animate-spin h-8 w-8 text-primary"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24">
                            <circle
                              class="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              stroke-width="4"></circle>
                            <path
                              class="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <p class="mt-2 text-sm text-on-surface-variant">
                            Generating...
                          </p>
                        </div>
                      ) : result.imageUrl ? (
                        <div class="relative group w-full h-full">
                          <img
                            src={result.imageUrl}
                            class="w-full h-full object-contain rounded-lg"
                            alt="Generated image"
                          />
                          <div
                            onClick={() =>
                              emit('open-preview', result.imageUrl)
                            }
                            class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              class="h-10 w-10 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor">
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                              />
                            </svg>
                          </div>
                        </div>
                      ) : result.error ? (
                        <p class="text-red-500 text-center p-4 text-sm">
                          {result.error}
                        </p>
                      ) : (
                        <p class="text-on-surface-variant text-sm text-center">
                          Output will appear here
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div class="text-center flex flex-col items-center justify-center h-full">
            <svg
              class="mx-auto h-16 w-16 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.158 0a.225.225 0 0 1-.225.225h-.008a.225.225 0 0 1-.225-.225v-.008c0-.124.101-.225.225-.225h.008c.124 0 .225.101.225.225v.008Z"
              />
            </svg>
            <h2 class="mt-4 text-2xl font-bold text-on-surface">
              Start Creating Your Images
            </h2>
            <p class="mt-2 text-md text-on-surface-variant max-w-lg mx-auto">
              Choose a pre-built template from our library to get started
              quickly, or build a custom workflow from scratch to fit your exact
              needs.
            </p>
            <div class="mt-8 flex justify-center space-x-4">
              <button
                onClick={() => emit('change-template')}
                class="material-button material-button-primary">
                Browse Template Library
              </button>
              <button
                onClick={() => emit('create-new')}
                class="material-button material-button-secondary">
                Create New From Scratch
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
});
