import {Modality, Part} from '@google/genai';
import {JSZip} from 'jszip';
import {computed, reactive, Ref, ref, watch} from 'vue';
import {DEFAULT_IMAGE_MODEL, useVertexAi} from '../constants';
import {ai, callGenAIApi} from '../services/ai';
import {BulkJob, Template, TemplateStep} from '../types';

/**
 * A composable function for managing the bulk creation of images.
 * It handles:
 * - Parsing a CSV file to get data for each bulk job.
 * - Loading static assets from Google Drive for the selected template.
 * - Generating multiple images by calling the GenAI API for each row in the CSV,
 *   replacing variables in the prompt and using specified image slots.
 * - Managing the state of bulk jobs (pending, processing, success, failed).
 * - Providing functionality to start, rerun, and download results as a ZIP file.
 * @param currentTemplateForBulk A Vue Ref containing the currently selected Template for bulk creation.
 * @param getTemplateAssets A function to fetch static assets for a given template from a folder ID.
 */
export function useBulkCreation(
  currentTemplateForBulk: Ref<Template | null>,
  getTemplateAssets: (
    folderId: string,
    steps: TemplateStep[],
  ) => Promise<Record<string, string>>,
) {
  const bulkJobs = reactive<BulkJob[]>([]);
  const isBulkProcessing = ref(false);
  const isBulkDownloading = ref(false);
  const bulkStaticAssets = reactive<Record<string, Part>>({});
  const bulkTemperature = ref(0.4);
  const bulkGenaiModel = ref(DEFAULT_IMAGE_MODEL);
  const bulkAspectRatio = ref('1:1');
  const bulkResolution = ref('1K');

  const bulkProgress = computed(() => {
    if (bulkJobs.length === 0) return 0;
    const completed = bulkJobs.filter(
      (j) => j.status === 'success' || j.status === 'failed',
    ).length;
    return Math.round((completed / bulkJobs.length) * 100);
  });
  const bulkCompletedCount = computed(
    () =>
      bulkJobs.filter((j) => j.status === 'success' || j.status === 'failed')
        .length,
  );
  const bulkSuccessCount = computed(
    () => bulkJobs.filter((j) => j.status === 'success').length,
  );

  const resetBulkState = () => {
    if (!isBulkProcessing.value) {
      bulkJobs.splice(0);
    }
  };

  watch(currentTemplateForBulk, async (newTemplate) => {
    resetBulkState();
    Object.keys(bulkStaticAssets).forEach((k) => delete bulkStaticAssets[k]);

    if (newTemplate) {
      bulkGenaiModel.value = newTemplate.genai_model || DEFAULT_IMAGE_MODEL;
      bulkAspectRatio.value = newTemplate.aspect_ratio || '1:1';

      if (newTemplate.driveFolderId && getTemplateAssets) {
        try {
          const assetDataUrls = await getTemplateAssets(
            newTemplate.driveFolderId,
            newTemplate.steps,
          );
          for (const [assetName, dataUrl] of Object.entries(assetDataUrls)) {
            const urlString = dataUrl as string;
            const base64 = urlString.split(',')[1];
            const mimeType =
              urlString.match(/data:(.*);base64/)?.[1] || 'image/png';
            bulkStaticAssets[assetName] = {
              inlineData: {data: base64, mimeType},
            };
          }
        } catch (e) {
          console.error('Failed to load static assets for bulk creation:', e);
          alert(
            'There was an error loading the static assets for this template. Bulk creation may fail.',
          );
        }
      }
    }
  });

  watch(bulkGenaiModel, (newModel) => {
    if (newModel.includes('2.5')) {
      bulkResolution.value = '1K';
    }
  });

  const parseCSV = (text: string): Array<Record<string, string>> => {
    const rows = text
      .trim()
      .split('\n')
      .map((r) => r.trim());
    if (rows.length < 2) {
      return [];
    }
    const headers = rows[0].split(',').map((h) => h.trim());
    return rows.slice(1).map((row) => {
      const values = row.split(',');
      return headers.reduce(
        (obj, header, index) => {
          obj[header] = values[index]?.trim() || '';
          return obj;
        },
        {} as Record<string, string>,
      );
    });
  };

  const handleBulkFileUpload = (file: File) => {
    if (isBulkProcessing.value) {
      alert(
        'A bulk generation is already in progress. Please wait for it to complete.',
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const data = parseCSV(text);

      if (data.length > 100) {
        alert('Please upload a CSV with a maximum of 100 rows.');
        return;
      }

      const requiredColumnsSet = new Set<string>(['id']);
      currentTemplateForBulk.value?.steps.forEach((step: TemplateStep) => {
        step.image_slots.forEach((slot) => {
          if (!slot.is_static) {
            requiredColumnsSet.add(slot.asset_name);
          }
        });
        if (step.text_variables) {
          step.text_variables.forEach((variable) => {
            requiredColumnsSet.add(variable.name);
          });
        }
      });
      const requiredColumns = Array.from(requiredColumnsSet);

      const csvHeaders = Object.keys(data[0] || {});
      const missingColumns = requiredColumns.filter(
        (col) => !csvHeaders.includes(col),
      );
      if (missingColumns.length > 0) {
        alert(
          `Your CSV is missing required columns: ${missingColumns.join(', ')}`,
        );
        return;
      }

      const ids = new Set<string>();
      for (const row of data) {
        const id = row['id']?.trim();
        if (!id) {
          alert(
            'CSV validation failed: Each row must have a non-empty value in the "id" column.',
          );
          return;
        }
        if (ids.has(id)) {
          alert(
            `CSV validation failed: Duplicate ID found: "${id}". All IDs must be unique.`,
          );
          return;
        }
        ids.add(id);
      }

      let firstInputAsset = '';
      if (currentTemplateForBulk.value) {
        const firstStep = currentTemplateForBulk.value.steps[0];
        const firstDynamicSlot = firstStep?.image_slots.find(
          (slot) => !slot.is_static,
        );
        if (firstDynamicSlot) {
          firstInputAsset = firstDynamicSlot.asset_name;
        }
      }

      bulkJobs.splice(
        0,
        bulkJobs.length,
        ...data.map(
          (row, index): BulkJob => ({
            id: index,
            rowData: row,
            status: 'pending',
            resultImageUrl: null,
            error: null,
            selected: false,
            inputImageUrl: firstInputAsset ? row[firstInputAsset] : null,
          }),
        ),
      );
    };
    reader.readAsText(file);
  };

  const blobToGeminiPart = (blob: Blob) => {
    if (blob.size === 0) {
      throw new Error(
        `Fetched image blob is empty. The URL may be invalid or the resource is unavailable.`,
      );
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = (reader.result as string)?.split(',')[1];
        if (!base64data) {
          reject(new Error('Failed to read image data as base64.'));
          return;
        }
        resolve({inlineData: {data: base64data, mimeType: blob.type}});
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const urlToGeminiPart = async (url: string) => {
    const CORS_PROXY_URL = 'https://corsproxy.io/?';

    try {
      const response = await fetch(CORS_PROXY_URL + encodeURIComponent(url), {
        referrerPolicy: 'no-referrer',
      });
      if (!response.ok) {
        throw new Error(
          `Proxy fetch failed with status: ${response.statusText} (${response.status})`,
        );
      }
      const blob = await response.blob();
      return await blobToGeminiPart(blob);
    } catch (proxyError: unknown) {
      console.warn(
        `CORS proxy fetch for ${url} failed: ${proxyError instanceof Error ? proxyError.message : String(proxyError)}. Attempting direct fetch as a fallback.`,
      );
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Direct fetch failed with status: ${response.statusText} (${response.status})`,
          );
        }
        const blob = await response.blob();
        return await blobToGeminiPart(blob);
      } catch (directError: unknown) {
        console.error(`Direct fetch for ${url} also failed:`, directError);
        const combinedMessage = `Could not load image from URL. Proxy failed: (${proxyError instanceof Error ? proxyError.message : String(proxyError)}). Direct fetch also failed: (${directError instanceof Error ? directError.message : String(directError)}). Please ensure the URL is correct and publicly accessible.`;
        throw new Error(combinedMessage);
      }
    }
  };

  const generateImageForRow = async (job: BulkJob) => {
    job.status = 'processing';
    let lastResultPart: Part | null = null;
    const MAX_RETRIES = 1;
    const modelToUse = bulkGenaiModel.value;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (!currentTemplateForBulk.value) {
          throw new Error('No bulk template selected.');
        }

        for (const [
          index,
          step,
        ] of currentTemplateForBulk.value.steps.entries()) {
          const parts: Part[] = [];

          if (index > 0) {
            if (lastResultPart) {
              parts.push(lastResultPart);
            } else {
              throw new Error("Previous step's result is missing.");
            }
          }

          for (const slot of step.image_slots) {
            if (!slot.is_static) {
              if (job.rowData[slot.asset_name]) {
                parts.push(await urlToGeminiPart(job.rowData[slot.asset_name]));
              } else {
                throw new Error(
                  `Missing URL for required asset: ${slot.asset_name}`,
                );
              }
            } else {
              if (bulkStaticAssets[slot.asset_name]) {
                parts.push(bulkStaticAssets[slot.asset_name]);
              } else if (currentTemplateForBulk.value.driveFolderId) {
                throw new Error(
                  `Static asset '${slot.asset_name}' was not loaded from Google Drive.`,
                );
              }
            }
          }

          let promptForStep = step.text_prompt;
          if (step.text_variables) {
            for (const variable of step.text_variables) {
              if (job.rowData.hasOwnProperty(variable.name)) {
                const regex = new RegExp(`{{${variable.name}}}`, 'g');
                promptForStep = promptForStep.replace(
                  regex,
                  job.rowData[variable.name],
                );
              } else {
                console.warn(
                  `Missing column for text variable '${variable.name}' in CSV row. It will not be replaced.`,
                );
              }
            }
          }

          parts.push({text: promptForStep});

          let response;
          const commonConfig = {
            responseModalities: [Modality.IMAGE],
            imageConfig: {
              aspectRatio: bulkAspectRatio.value,
              imageSize: bulkResolution.value,
            },
            temperature: bulkTemperature.value,
          };

          if (useVertexAi) {
            response = await callGenAIApi({
              model: modelToUse,
              contents: {
                role: 'user',
                parts,
              },
              config: commonConfig,
            });
          } else {
            response = await ai.models.generateContent({
              model: modelToUse,
              contents: {parts},
              config: commonConfig,
            });
          }

          const imagePart = response.candidates?.[0]?.content?.parts?.find(
            (p: Part) => p.inlineData,
          );
          if (!imagePart) {
            throw new Error('Model did not return an image.');
          }
          lastResultPart = imagePart;
        }

        if (lastResultPart && lastResultPart.inlineData) {
          job.resultImageUrl = `data:image/png;base64,${lastResultPart.inlineData.data}`;
          job.status = 'success';
          return;
        } else {
          throw new Error('Final step did not produce an image.');
        }
      } catch (e: unknown) {
        console.error(`Attempt ${attempt + 1} failed for job ${job.id}:`, e);
        if (attempt === MAX_RETRIES) {
          job.status = 'failed';
          job.error =
            e instanceof Error ? e.message : 'An unknown error occurred.';
        }
      }
    }
  };

  const startBulkGeneration = async () => {
    if (isBulkProcessing.value) {
      return;
    }

    const hasDynamicSlots = currentTemplateForBulk.value?.steps.some(
      (s) =>
        s.image_slots.some((slot) => !slot.is_static) ||
        (s.text_variables && s.text_variables.length > 0),
    );
    if (!hasDynamicSlots && bulkJobs.length === 0) {
      bulkJobs.push({
        id: 0,
        rowData: {id: `image-${Date.now()}`},
        status: 'pending',
        resultImageUrl: null,
        error: null,
        selected: false,
        inputImageUrl: null,
      });
    }

    isBulkProcessing.value = true;
    const jobsToRun = bulkJobs.filter((j) => j.status === 'pending');
    for (const job of jobsToRun) {
      if (!isBulkProcessing.value) {
        break;
      }
      await generateImageForRow(job);
    }
    isBulkProcessing.value = false;
  };

  const rerunSelectedJobs = async () => {
    if (isBulkProcessing.value) {
      return;
    }
    const jobsToRerun = bulkJobs.filter((j) => j.selected);
    if (jobsToRerun.length === 0) {
      alert('Please select at least one row to rerun.');
      return;
    }

    jobsToRerun.forEach((job) => {
      job.status = 'pending';
      job.resultImageUrl = null;
      job.error = null;
      job.selected = false;
    });
    await startBulkGeneration();
  };

  const downloadBulkZip = async () => {
    if (isBulkDownloading.value) {
      return;
    }
    isBulkDownloading.value = true;
    try {
      const zip = new JSZip();
      const successfulJobs = bulkJobs.filter(
        (j) => j.status === 'success' && j.resultImageUrl,
      );

      await Promise.all(
        successfulJobs.map(async (job) => {
          const response = await fetch(job.resultImageUrl!);
          const blob = await response.blob();
          zip.file(`${job.rowData.id}.png`, blob);
        }),
      );

      const content = await zip.generateAsync({type: 'blob'});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `banana_milkshake_bulk_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error creating ZIP file:', error);
      alert('Failed to create ZIP file.');
    } finally {
      isBulkDownloading.value = false;
    }
  };

  return {
    bulkJobs,
    isBulkProcessing,
    isBulkDownloading,
    bulkProgress,
    bulkCompletedCount,
    bulkSuccessCount,
    bulkTemperature,
    bulkGenaiModel,
    bulkAspectRatio,
    bulkResolution,
    handleBulkFileUpload,
    startBulkGeneration,
    downloadBulkZip,
    rerunSelectedJobs,
  };
}
