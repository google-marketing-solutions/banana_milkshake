import {computed, defineComponent, PropType, reactive, ref, watch} from 'vue';
import {APP_FOLDER_NAME} from '../constants';
import {TEMPLATES} from '../data/templates';
import {Template} from '../types';

/**
 * A Vue component for displaying and managing a library of templates.
 * It supports both built-in templates and user-created templates stored in Google Drive.
 */
export const LibraryPageComponent = defineComponent({
  name: 'LibraryPageComponent',
  props: {
    isSignedIn: {
      type: Boolean,
      required: true,
    },
    listTemplates: {
      type: Function as PropType<() => Promise<Template[]>>,
      required: true,
    },
    deleteTemplate: {
      type: Function as PropType<(template: Template) => Promise<void>>,
      required: true,
    },
  },
  emits: ['use-template', 'create-new', 'sign-in'],
  setup(props, {emit}) {
    const activeTab = ref('built-in');
    const searchQuery = ref('');
    const builtInTemplates = ref(TEMPLATES);
    const driveTemplates = reactive<Template[]>([]);
    const isLoadingDrive = ref(false);

    const displayedTemplates = computed(() => {
      const source =
        activeTab.value === 'built-in'
          ? builtInTemplates.value
          : driveTemplates;
      if (!searchQuery.value.trim()) {
        return source;
      }
      const lowerCaseQuery = searchQuery.value.toLowerCase();
      return source.filter(
        (template) =>
          (template.name &&
            template.name.toLowerCase().includes(lowerCaseQuery)) ||
          (template.description &&
            template.description.toLowerCase().includes(lowerCaseQuery)),
      );
    });

    const loadDriveTemplates = async () => {
      if (!props.isSignedIn) {
        driveTemplates.splice(0);
        return;
      }
      isLoadingDrive.value = true;
      try {
        const templates = await props.listTemplates();
        driveTemplates.splice(0, driveTemplates.length, ...templates);
      } catch (error) {
        console.error('Error loading Drive templates:', error);
        driveTemplates.splice(0);
        alert('Failed to load templates from Google Drive.');
      } finally {
        isLoadingDrive.value = false;
      }
    };

    const handleDeleteTemplate = async (template: Template) => {
      if (
        !confirm(
          `Are you sure you want to delete "${template.name}"?\nThis will move the template folder to your Google Drive trash.`,
        )
      ) {
        return;
      }
      try {
        await props.deleteTemplate(template);
        await loadDriveTemplates(); // Refresh the list
      } catch (error) {
        alert('Failed to delete template.');
      }
    };

    watch(
      () => props.isSignedIn,
      (isAuthed) => {
        if (activeTab.value === 'drive' && isAuthed) {
          loadDriveTemplates();
        }
      },
    );

    watch(activeTab, (newTab) => {
      if (newTab === 'drive') {
        loadDriveTemplates();
      }
    });

    return () => (
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div class="flex justify-between mt-5 gap-6">
          <h2 class="text-2xl font-bold text-gray-800">Template Library</h2>
          <button
            onClick={() => emit('create-new')}
            class="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm">
            <svg
              class="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create New Template
          </button>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div class="border-b border-gray-200">
            <nav class="flex -mb-px" aria-label="Tabs">
              <button
                onClick={() => (activeTab.value = 'built-in')}
                class={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm focus:outline-none transition-colors ${
                  activeTab.value === 'built-in'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}>
                Built-in Templates
              </button>
              <button
                onClick={() => (activeTab.value = 'drive')}
                class={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm focus:outline-none transition-colors ${
                  activeTab.value === 'drive'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}>
                My Templates (Google Drive)
              </button>
            </nav>
          </div>

          <div class="p-6">
            <div class="relative rounded-md shadow-sm">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  class="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                v-model={searchQuery.value}
                class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2"
                placeholder="Search templates..."
              />
            </div>
          </div>
        </div>

        <div class="template-grid-container">
          {activeTab.value === 'drive' && !props.isSignedIn ? (
            <div class="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
              <svg
                class="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                />
              </svg>
              <h3 class="mt-2 text-sm font-medium text-gray-900">
                Sign in to access your templates
              </h3>
              <p class="mt-1 text-sm text-gray-500">
                Connect to Google Drive to save and load your custom templates.
              </p>
              <div class="mt-6">
                <button
                  onClick={() => emit('sign-in')}
                  class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Sign in with Google
                </button>
              </div>
            </div>
          ) : activeTab.value === 'drive' && isLoadingDrive.value ? (
            <div class="flex justify-center items-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
              <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          ) : displayedTemplates.value.length === 0 ? (
            <div class="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
              <svg
                class="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 13h6m-3-3v6m5 5H6a2 2 0 01-2-2V6a2 2 0 012-2h11a2 2 0 012 2v11a2 2 0 01-2 2z"
                />
              </svg>
              <h3 class="mt-2 text-sm font-medium text-gray-900">
                No templates found
              </h3>
              <p class="mt-1 text-sm text-gray-500">
                {searchQuery.value
                  ? 'Try adjusting your search.'
                  : 'Get started by creating a new template.'}
              </p>
              {!searchQuery.value && (
                <div class="mt-6">
                  <button
                    onClick={() => emit('create-new')}
                    class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Create New Template
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {displayedTemplates.value.map((template) => (
                <div
                  key={template.id}
                  class="material-card flex flex-col relative group aspect-[4/5] bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow p-4">
                  <div class="relative mb-4 ring-1 ring-black/5 rounded-md overflow-hidden aspect-[4/3] flex-shrink-0">
                    {template.previewImage ? (
                      <img
                        src={template.previewImage}
                        alt={template.name}
                        class="w-full h-full object-cover"
                      />
                    ) : (
                      <div class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                        <svg
                          class="h-12 w-12"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}

                    {activeTab.value === 'drive' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template);
                        }}
                        class="absolute top-2 right-2 p-1.5 rounded-full bg-white text-gray-400 hover:text-red-600 hover:bg-gray-100 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Delete Template">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          class="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor">
                          <path
                            fill-rule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clip-rule="evenodd"
                          />
                        </svg>
                      </button>
                    )}
                  </div>

                  <h3 class="font-bold text-md mb-1 flex-shrink-0">
                    {template.name}
                  </h3>
                  <p class="text-sm text-on-surface-variant mb-4 overflow-y-auto flex-grow min-h-0 pr-1">
                    {template.description}
                  </p>

                  <div class="flex items-center space-x-2 flex-shrink-0">
                    <div class="group/btn relative flex-1">
                      <button
                        onClick={() => emit('use-template', template, 'use')}
                        class="material-button material-button-primary w-full">
                        Use
                      </button>
                      <span class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max rounded bg-gray-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow transition-opacity group-hover/btn:opacity-100 z-10">
                        Use in Bulk
                      </span>
                    </div>
                    <div class="group/btn relative">
                      <button
                        onClick={() => emit('use-template', template, 'edit')}
                        class="material-button material-button-secondary">
                        Edit
                      </button>
                      <span class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max rounded bg-gray-800 px-2 py-1 text-xs font-medium text-white opacity-0 shadow transition-opacity group-hover/btn:opacity-100 z-10">
                        Edit in Creation Center
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab.value === 'drive' && props.isSignedIn && (
            <div class="mt-8 pt-6 border-t border-gray-200 bg-white rounded-xl shadow-sm p-6 text-center">
              <p class="text-xs text-gray-500">
                Templates are saved in your Google Drive in the folder:{' '}
                <strong>{APP_FOLDER_NAME}</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  },
});
