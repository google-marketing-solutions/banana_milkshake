/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {PropType, computed, defineComponent, ref, watch} from 'vue';
import {SUPPORTED_IMAGE_MODELS} from '../constants';
import {BulkJob, Template, TemplateStep} from '../types';

/**
 * A Vue component for the bulk image creation page.
 * It allows users to select a template, upload a CSV with data, configure generation settings,
 * and review the results of the bulk image generation process.
 */
export const BulkCreationPageComponent = defineComponent({
  name: 'BulkCreationPageComponent',
  props: {
    selectedTemplate: {
      type: Object as PropType<Template | null>,
      default: null,
    },
    jobs: {type: Array as PropType<BulkJob[]>, required: true},
    isProcessing: {type: Boolean, required: true},
    isDownloading: {type: Boolean, required: true},
    progress: {type: Number, required: true},
    completedCount: {type: Number, required: true},
    successCount: {type: Number, required: true},
    temperature: {type: Number, required: true},
    model: {type: String, required: true},
    aspectRatio: {type: String, required: true},
    resolution: {type: String, required: true},
  },
  emits: [
    'change-template',
    'file-upload',
    'start-generation',
    'download-zip',
    'open-preview',
    'rerun-selected',
    'update:temperature',
    'update:model',
    'update:aspectRatio',
    'update:resolution',
  ],
  setup(props, {emit}) {
    const fileInputRef = ref<HTMLInputElement | null>(null);
    const selectAllRef = ref(false);
    const supportedModels = SUPPORTED_IMAGE_MODELS;

    const requiredColumns = computed(() => {
      const columns = new Set<string>(['id']); // Always include 'id'
      if (props.selectedTemplate) {
        props.selectedTemplate.steps.forEach((step: TemplateStep) => {
          step.image_slots.forEach((slot) => {
            if (!slot.is_static) {
              columns.add(slot.asset_name);
            }
          });
          if (step.text_variables) {
            step.text_variables.forEach((variable) => {
              columns.add(variable.name);
            });
          }
        });
      }
      return Array.from(columns).sort();
    });

    const isAnyRowSelected = computed(() =>
      props.jobs.some((j: BulkJob) => j.selected),
    );

    const toggleSelectAll = () => {
      const isChecked = selectAllRef.value;
      props.jobs.forEach((j: BulkJob) => (j.selected = isChecked));
    };

    watch(
      () => props.jobs,
      (newJobs: BulkJob[]) => {
        if (newJobs.length > 0 && newJobs.every((j) => j.selected)) {
          selectAllRef.value = true;
        } else {
          selectAllRef.value = false;
        }
      },
      {deep: true},
    );

    watch(
      () => props.jobs,
      (newJobs, oldJobs) => {
        if (newJobs.length === 0 && oldJobs && oldJobs.length > 0) {
          if (fileInputRef.value) {
            (fileInputRef.value as HTMLInputElement).value = '';
          }
        }
      },
      {deep: true},
    );

    const handleFileUpload = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      emit('file-upload', file);
    };

    const startBulkGeneration = () => {
      emit('start-generation');
    };
    const downloadZip = async () => {
      emit('download-zip');
    };
    const rerunSelected = () => {
      emit('rerun-selected');
      selectAllRef.value = false;
    };

    const resolutionOptions = computed(() => {
      if (props.model && props.model.includes('3')) {
        // assuming 'gemini-3...'
        return ['1K', '2K', '4K'];
      }
      return ['1K'];
    });

    return () => (
      <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {!props.selectedTemplate ? (
          <div class="text-center material-card p-12">
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
                d="M4.26 10.147a60.436 60.436 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
              />
            </svg>
            <h2 class="mt-4 text-2xl font-bold text-on-surface">
              Select a Template to Begin
            </h2>
            <p class="mt-2 text-md text-on-surface-variant max-w-lg mx-auto">
              To start a bulk creation job, please go to the library and choose
              a template to use.
            </p>
            <div class="mt-8">
              <button
                onClick={() => emit('change-template')}
                class="material-button material-button-primary">
                Go to Template Library
              </button>
            </div>
          </div>
        ) : (
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Setup */}
            <div class="lg:col-span-1 space-y-6 sticky top-[80px]">
              <div class="material-card">
                <h2 class="text-lg font-bold mb-4">1. Selected Template</h2>
                <div class="p-4 border border-outline rounded-lg flex items-center">
                  <img
                    src={props.selectedTemplate.previewImage}
                    class="w-16 h-12 object-cover rounded-md mr-4 bg-gray-100"
                    alt="Template thumbnail"
                  />
                  <div>
                    <p class="font-semibold">{props.selectedTemplate.name}</p>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        emit('change-template');
                      }}
                      class="text-sm text-primary font-medium">
                      Change template
                    </a>
                  </div>
                </div>
              </div>
              <div class="material-card">
                <h2 class="text-lg font-bold mb-4">2. Upload Data</h2>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  accept=".csv"
                  class="material-input p-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary hover:file:bg-blue-100"
                  disabled={props.isProcessing}
                />
                <div class="mt-3 text-xs text-on-surface-variant bg-gray-50 p-3 rounded-lg">
                  <p class="font-semibold mb-1">
                    Your CSV must contain a unique{' '}
                    <code class="text-primary">id</code> column to name each
                    output image.
                  </p>
                  {requiredColumns.value.length > 1 ? (
                    <div>
                      <p class="font-semibold mt-2 mb-1">
                        It must also contain columns for dynamic image assets
                        and text variables:
                      </p>
                      <code class="text-primary">
                        {requiredColumns.value
                          .filter((c) => c !== 'id')
                          .join(', ')}
                      </code>
                      <p class="mt-2">
                        Image asset values should be public image URLs. Max 100
                        rows.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p class="mt-2">
                        This template has no dynamic assets, but you can upload
                        a CSV with just an <code class="text-primary">id</code>{' '}
                        column to generate multiple named images.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div class="material-card">
                <h2 class="text-lg font-bold mb-4">3. Generation Settings</h2>

                <div class="mb-4">
                  <label class="block text-sm font-medium text-on-surface-variant mb-1">
                    GenAI Model
                  </label>
                  <select
                    value={props.model}
                    onInput={(e: Event) =>
                      emit(
                        'update:model',
                        (e.target as HTMLSelectElement).value,
                      )
                    }
                    class="material-input bg-white">
                    {supportedModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div class="mb-4">
                  <label class="block text-sm font-medium text-on-surface-variant mb-1">
                    Aspect Ratio
                  </label>
                  <select
                    value={props.aspectRatio}
                    onInput={(e: Event) =>
                      emit(
                        'update:aspectRatio',
                        (e.target as HTMLSelectElement).value,
                      )
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

                <div class="mb-4">
                  <label class="block text-sm font-medium text-on-surface-variant mb-1">
                    Resolution
                  </label>
                  <select
                    value={props.resolution}
                    onInput={(e: Event) =>
                      emit(
                        'update:resolution',
                        (e.target as HTMLSelectElement).value,
                      )
                    }
                    class="material-input bg-white">
                    {resolutionOptions.value.map((res) => (
                      <option key={res} value={res}>
                        {res}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    for="temperature-slider"
                    class="flex justify-between text-sm font-medium text-on-surface-variant mb-1">
                    <span>Temperature</span>
                    <span class="font-bold text-primary">
                      {props.temperature.toFixed(1)}
                    </span>
                  </label>
                  <input
                    type="range"
                    id="temperature-slider"
                    value={props.temperature}
                    onInput={(e: Event) => {
                      const value = Number(
                        (e.target as HTMLInputElement).value,
                      );
                      if (!isNaN(value)) {
                        emit('update:temperature', value);
                      }
                    }}
                    min="0"
                    max="1.0"
                    step="0.1"
                    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <p class="text-xs text-on-surface-variant mt-2">
                    Controls randomness. Lower values are more predictable,
                    higher values are more creative.
                  </p>
                </div>
              </div>
              <button
                onClick={startBulkGeneration}
                class="material-button material-button-primary w-full"
                disabled={
                  props.isProcessing ||
                  (props.jobs.length === 0 && requiredColumns.value.length > 1)
                }>
                {props.isProcessing ? (
                  <svg
                    class="animate-spin h-5 w-5 mr-2"
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
                    viewBox="0 0 20 20"
                    fill="currentColor">
                    <path d="M10 3.5a1.5 1.5 0 01.874 2.862l-1.52 1.52a1.5 1.5 0 11-2.122-2.122L8.75 4.242A1.5 1.5 0 0110 3.5zM8.5 6.5a.5.5 0 000 1l1.52-1.52a.5.5 0 00-1-1L7.5 6.5a.5.5 0 001 0z" />
                    <path d="M12.862 10.126a1.5 1.5 0 112.122 2.122l-1.52 1.52a1.5 1.5 0 01-2.122-2.122l1.52-1.52zM13.5 11.5a.5.5 0 00-1 1l1.52 1.52a.5.5 0 001-1l-1.52-1.52z" />
                    <path d="M10 16.5a1.5 1.5 0 01-2.862-.874l1.52-1.52a1.5 1.5 0 112.122 2.122L11.25 15.758A1.5 1.5 0 0110 16.5zM11.5 13.5a.5.5 0 000-1l-1.52 1.52a.5.5 0 001 1l.52-.52z" />
                    <path d="M7.138 10.126a1.5 1.5 0 11-2.122 2.122l-1.52-1.52a1.5 1.5 0 012.122-2.122l1.52 1.52zM6.5 8.5a.5.5 0 001-1l-1.52-1.52a.5.5 0 00-1 1l1.52 1.52z" />
                  </svg>
                )}
                {props.isProcessing
                  ? 'Generating...'
                  : 'Generate ' +
                    (props.jobs.length > 0 ? props.jobs.length : '') +
                    ' Images'}
              </button>
            </div>

            {/* Right Column: Results */}
            <div class="lg:col-span-2 material-card">
              {props.jobs.length === 0 ? (
                <div class="text-center py-16">
                  <h2 class="text-lg font-bold">4. Review Results</h2>
                  <p class="mt-2 text-on-surface-variant">
                    Upload a CSV file to get started, or press "Generate" for
                    templates with no dynamic assets. Results will appear here.
                  </p>
                </div>
              ) : (
                <div>
                  <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-bold">4. Review Results</h2>
                    <div class="flex items-center space-x-2">
                      <button
                        onClick={rerunSelected}
                        class="material-button material-button-secondary"
                        disabled={
                          !isAnyRowSelected.value || props.isProcessing
                        }>
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
                            d="M4 4v5h5M20 20v-5h-5M4 4l5 5M20 20l-5-5M4 20h5v-5M20 4h-5v5"
                          />
                        </svg>
                        Rerun Selected
                      </button>
                      <button
                        onClick={downloadZip}
                        class="material-button material-button-primary"
                        disabled={
                          props.isDownloading ||
                          props.isProcessing ||
                          props.successCount === 0
                        }>
                        {props.isDownloading ? (
                          <svg
                            class="animate-spin h-5 w-5 mr-2"
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
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                        )}
                        {props.isDownloading
                          ? 'Zipping...'
                          : 'Download All (' + props.successCount + ')'}
                      </button>
                    </div>
                  </div>
                  {(props.isProcessing ||
                    (props.completedCount < props.jobs.length &&
                      props.jobs.length > 0)) && (
                    <div class="mb-4">
                      <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          class="bg-primary h-2.5 rounded-full transition-all duration-300"
                          style={{width: props.progress + '%'}}></div>
                      </div>
                      <p class="text-center text-sm text-on-surface-variant mt-2">
                        {props.completedCount} of {props.jobs.length} complete.
                      </p>
                    </div>
                  )}

                  {/* Results Table */}
                  <div class="space-y-2">
                    {/* Header */}
                    <div class="grid grid-cols-12 gap-4 items-center px-4 py-2 font-semibold text-on-surface-variant text-sm border-b border-outline">
                      <div class="col-span-1 flex items-center">
                        <input
                          type="checkbox"
                          v-model={selectAllRef.value}
                          onChange={toggleSelectAll}
                          class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </div>
                      <div class="col-span-2">ID</div>
                      <div class="col-span-3">Input Image</div>
                      <div class="col-span-3">Output Image</div>
                      <div class="col-span-3">Status</div>
                    </div>

                    {/* Job Rows */}
                    {props.jobs.map((job) => (
                      <div
                        key={job.id}
                        class="grid grid-cols-12 gap-4 items-center px-4 py-3 rounded-lg hover:bg-gray-50 border-b border-outline last:border-b-0">
                        <div class="col-span-1 flex items-center">
                          <input
                            type="checkbox"
                            v-model={job.selected}
                            class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </div>
                        <div
                          class="col-span-2 text-sm font-medium truncate"
                          title={job.rowData.id}>
                          {job.rowData.id}
                        </div>
                        <div class="col-span-3">
                          <div class="aspect-square bg-gray-100 rounded-md w-full max-w-[100px] flex items-center justify-center">
                            {job.inputImageUrl ? (
                              <img
                                src={job.inputImageUrl}
                                onError={(e: Event) =>
                                  ((
                                    e.target as HTMLImageElement
                                  ).style.display = 'none')
                                }
                                class="w-full h-full object-contain rounded-md"
                                alt="Input Asset"
                              />
                            ) : (
                              <span class="text-xs text-on-surface-variant">
                                N/A
                              </span>
                            )}
                          </div>
                        </div>
                        <div class="col-span-3">
                          <div class="aspect-square bg-gray-100 rounded-md w-full max-w-[100px] flex items-center justify-center">
                            {job.status === 'processing' ? (
                              <div class="p-2">
                                <svg
                                  class="animate-spin h-6 w-6 text-primary"
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
                              </div>
                            ) : job.status === 'success' &&
                              job.resultImageUrl ? (
                              <div class="w-full h-full relative group">
                                <img
                                  src={job.resultImageUrl}
                                  class="w-full h-full object-contain rounded-md"
                                />
                                <div
                                  onClick={() =>
                                    emit('open-preview', job.resultImageUrl)
                                  }
                                  class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg cursor-pointer">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-8 w-8 text-white"
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
                            ) : job.status === 'failed' ? (
                              <div
                                class="p-2 text-center"
                                title={job.error || 'Failed'}>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  class="h-6 w-6 text-red-500 mx-auto"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor">
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </div>
                            ) : (
                              <div class="text-xs text-on-surface-variant">
                                Pending
                              </div>
                            )}
                          </div>
                        </div>
                        <div class="col-span-3 text-sm">
                          {job.status === 'success' ? (
                            <div class="flex items-center text-green-600 font-semibold">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="h-4 w-4 mr-1.5"
                                viewBox="0 0 20 20"
                                fill="currentColor">
                                <path
                                  fill-rule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clip-rule="evenodd"
                                />
                              </svg>
                              Success
                            </div>
                          ) : job.status === 'failed' ? (
                            <div class="text-red-600">
                              <div class="flex items-center font-semibold mb-1">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  class="h-4 w-4 mr-1.5 flex-shrink-0"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor">
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                Failed
                              </div>
                              <span class="text-xs block break-words leading-tight">
                                {job.error}
                              </span>
                            </div>
                          ) : job.status === 'processing' ? (
                            <div class="flex items-center text-primary font-semibold">
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
                              Processing
                            </div>
                          ) : (
                            <div class="text-gray-500">Pending</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
});
