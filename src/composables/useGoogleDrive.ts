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

import {computed, ref} from 'vue';
import {APP_FOLDER_NAME, TEMPLATE_JSON_FILENAME} from '../constants';
import {Template, TemplateStep} from '../types';
/**
 * A Vue composable for interacting with Google Drive.
 * It handles GAPI and GIS initialization, user sign-in/sign-out,
 * and provides functions for creating/finding app folders,
 * uploading/downloading files, and managing templates stored in Drive.
 * @param onAuthChange - Callback function invoked when the sign-in status changes.
 */
export function useGoogleDrive(onAuthChange: (isSignedIn: boolean) => void) {
  const DISCOVERY_DOCS = [
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
  ];
  // Using 'https://www.googleapis.com/auth/drive' allows the app to see folders created by
  // previous deployments (which might have different Client IDs) ensuring we reuse the same folder.
  const SCOPES = 'https://www.googleapis.com/auth/drive';

  let tokenClient: google.accounts.oauth2.TokenClient;
  const isGapiInitialized = ref(false);
  const isGisInitialized = ref(false);

  const isReady = computed(
    () => isGapiInitialized.value && isGisInitialized.value,
  );
  const isSignedIn = ref(false);

  let appFolderIdCache: string | null = null;
  let driveConfig: {googleClientId?: string; driveApiKey?: string} = {};

  const initialize = (config: {
    googleClientId?: string;
    driveApiKey?: string;
  }) => {
    driveConfig = config;
    const gapiScript = document.getElementById(
      'gapi-script',
    ) as HTMLScriptElement;
    const gisScript = document.getElementById(
      'gis-script',
    ) as HTMLScriptElement;

    const gapiLoadCallback = () => {
      gapi.load('client', initializeGapiClient);
    };
    const gisLoadCallback = () => {
      initializeGisClient();
    };

    if (typeof gapi !== 'undefined' && gapi.load) gapiLoadCallback();
    else if (gapiScript) gapiScript.onload = gapiLoadCallback;
    if (typeof google !== 'undefined' && google.accounts) gisLoadCallback();
    else if (gisScript) gisScript.onload = gisLoadCallback;
  };

  async function initializeGapiClient() {
    if (!driveConfig.driveApiKey) {
      console.warn(
        'Google Drive API Key is not configured. Drive features will be disabled.',
      );
      isGapiInitialized.value = true; // Mark as initialized to not block UI
      return;
    }
    await gapi.client.init({
      apiKey: driveConfig.driveApiKey,
      discoveryDocs: DISCOVERY_DOCS,
    });
    isGapiInitialized.value = true;
    if (gapi.client.getToken() !== null) {
      isSignedIn.value = true;
      onAuthChange(true);
    }
  }

  function initializeGisClient() {
    if (!driveConfig.googleClientId) {
      console.warn(
        'Google Client ID is not configured. Drive Sign-In will be disabled.',
      );
      isGisInitialized.value = true; // Mark as initialized to not block UI
      return;
    }
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: driveConfig.googleClientId,
      scope: SCOPES,
      callback: (resp: google.accounts.oauth2.TokenResponse) => {
        if (resp.error) {
          throw resp;
        }
        isSignedIn.value = true;
        onAuthChange(true);
      },
    });
    isGisInitialized.value = true;
  }

  function signIn() {
    if (!tokenClient) {
      console.warn(
        'Google Sign-In is not initialized. Is GOOGLE_CLIENT_ID configured?',
      );
      alert('Google Sign-In is not available. Please check the configuration.');
      return;
    }
    // Always prompt for consent to ensure we get the new scopes if they changed
    tokenClient.requestAccessToken({prompt: 'consent'});
  }

  function signOut() {
    const token = gapi.client.getToken();
    if (token !== null) {
      google.accounts.oauth2.revoke(token.access_token, () => {
        gapi.client.setToken(null);
        isSignedIn.value = false;
        onAuthChange(false);
      });
    }
  }

  async function getAppFolderId(): Promise<string | null> {
    if (appFolderIdCache) return appFolderIdCache;
    try {
      console.log(`Searching for app folder: '${APP_FOLDER_NAME}'...`);
      const response = await gapi.client.drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${APP_FOLDER_NAME}' and trashed=false`,
        fields: 'files(id, name, createdTime)',
        orderBy: 'createdTime desc', // Use the most recently created one if duplicates exist
      });
      if (response.result.files && response.result.files.length > 0) {
        // If multiple folders exist, use the most recent one.
        appFolderIdCache = response.result.files[0].id;
        console.log(
          `Found existing app folder: ${appFolderIdCache} (${response.result.files.length} found)`,
        );
        return appFolderIdCache;
      } else {
        console.log('App folder not found, creating new one...');
        const fileMetadata = {
          name: APP_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
        };
        const createResponse = await gapi.client.drive.files.create({
          resource: fileMetadata,
          fields: 'id',
        });
        appFolderIdCache = createResponse.result.id;
        console.log(`Created new app folder: ${appFolderIdCache}`);
        return appFolderIdCache;
      }
    } catch (error) {
      console.error('Error finding or creating app folder:', error);
      return null;
    }
  }

  async function findOrCreateFolder(
    name: string,
    parentId: string,
  ): Promise<string | null> {
    try {
      const response = await gapi.client.drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${name}' and '${parentId}' in parents and trashed=false`,
        fields: 'files(id)',
      });
      if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id;
      } else {
        const fileMetadata = {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        };
        const createResponse = await gapi.client.drive.files.create({
          resource: fileMetadata,
          fields: 'id',
        });
        return createResponse.result.id;
      }
    } catch (error) {
      console.error(`Error finding or creating folder "${name}":`, error);
      return null;
    }
  }

  async function uploadOrUpdateFile(
    folderId: string,
    fileName: string,
    file: File | Blob,
  ) {
    let existingFileId = null;
    try {
      const response = await gapi.client.drive.files.list({
        q: `name = '${fileName}' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id)',
      });
      if (response.result.files && response.result.files.length > 0) {
        existingFileId = response.result.files[0].id;
      }
    } catch (error) {
      console.error(`Error checking for existing file ${fileName}:`, error);
    }

    const metadata: gapi.client.drive.File = {
      name: fileName,
      mimeType: file.type,
    };
    if (!existingFileId) {
      metadata.parents = [folderId];
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const close_delim = `\r\n--${boundary}--`;

    const reader = new FileReader();
    return new Promise<void>((resolve, reject) => {
      reader.onload = async () => {
        const fileData = (reader.result as string).split('base64,')[1];
        const multipartRequestBody =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          `Content-Type: ${file.type}\r\nContent-Transfer-Encoding: base64\r\n\r\n` +
          fileData +
          close_delim;

        try {
          await gapi.client.request({
            path: existingFileId
              ? `/upload/drive/v3/files/${existingFileId}`
              : '/upload/drive/v3/files',
            method: existingFileId ? 'PATCH' : 'POST',
            params: {uploadType: 'multipart'},
            headers: {
              'Content-Type': `multipart/related; boundary="${boundary}"`,
            },
            body: multipartRequestBody,
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function saveTemplate(
    templateData: Template,
    filesToSave: Record<string, File>,
  ) {
    const appFolderId = await getAppFolderId();
    if (!appFolderId) {
      throw new Error('Could not access the app folder in Google Drive.');
    }

    const templateFolderId = await findOrCreateFolder(
      templateData.name,
      appFolderId,
    );
    if (!templateFolderId) {
      throw new Error('Could not create a folder for the template.');
    }

    // Create a clean copy for saving, removing client-side temporary properties
    const dataToSave = {...templateData};
    // The previewImage from the client is a dataURL; we need to save the filename instead.
    dataToSave.previewImage = templateData.previewImageFileName || '';
    delete dataToSave.driveFolderId;
    delete dataToSave.previewImageFileName;

    const jsonString = JSON.stringify(dataToSave, null, 2);
    const jsonBlob = new Blob([jsonString], {type: 'application/json'});

    const uploadPromises = [
      uploadOrUpdateFile(templateFolderId, TEMPLATE_JSON_FILENAME, jsonBlob),
    ];
    for (const [fileName, file] of Object.entries(filesToSave)) {
      uploadPromises.push(uploadOrUpdateFile(templateFolderId, fileName, file));
    }

    await Promise.all(uploadPromises);
    alert(
      `Template "${templateData.name}" saved successfully to Google Drive!`,
    );
  }

  async function findFileInFolder(
    folderId: string,
    fileName: string,
  ): Promise<string | null> {
    try {
      const response = await gapi.client.drive.files.list({
        q: `name = '${fileName}' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id)',
      });
      return response.result.files?.[0]?.id || null;
    } catch (error) {
      console.error(
        `Error finding file ${fileName} in folder ${folderId}:`,
        error,
      );
      return null;
    }
  }

  async function fetchFileContent<T = string | object | null>(
    fileId: string,
    asDataUrl = false,
  ): Promise<T> {
    const response = await gapi.client.drive.files.get({fileId, alt: 'media'});
    if (asDataUrl) {
      const binaryString = response.body;
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], {type: response.headers['Content-Type']});
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as unknown as T);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    // CAREFUL: gapi sometimes parses JSON in result, sometimes returns string in body.
    if (
      response.result &&
      typeof response.result === 'object' &&
      Object.keys(response.result).length > 0
    ) {
      return response.result as unknown as T;
    }
    if (response.body) {
      try {
        return JSON.parse(response.body);
      } catch (e) {
        console.warn('Raw response body is not JSON:', response.body);
        return response.body as unknown as T; // Return as string if not JSON
      }
    }
    return null;
  }

  async function listTemplates(): Promise<Template[]> {
    const folderId = await getAppFolderId();
    if (!folderId) return [];

    try {
      console.log(`Listing files in folderId: ${folderId}`);
      const foldersResponse = await gapi.client.drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
      });
      const folders = foldersResponse.result.files || [];
      console.log(
        `Found ${folders.length} template folders:`,
        folders.map((f: gapi.client.drive.File) => f.name),
      );

      const templatePromises = folders.map(
        async (folder: {id: string; name: string}) => {
          try {
            const jsonFileId = await findFileInFolder(
              folder.id,
              TEMPLATE_JSON_FILENAME,
            );
            if (!jsonFileId) {
              console.warn(
                `Skipping folder "${folder.name}": No ${TEMPLATE_JSON_FILENAME} found.`,
              );
              return null;
            }

            const templateData = await fetchFileContent<Template>(
              jsonFileId,
              false,
            );
            if (!templateData || !templateData.name) {
              console.warn(
                `Skipping folder "${folder.name}": Invalid template data in ${TEMPLATE_JSON_FILENAME}`,
                templateData,
              );
              return null;
            }

            console.log(
              `Loaded template: ${templateData.name} from folder ${folder.name}`,
            );

            let previewImageUrl =
              'https://placehold.co/400x300/e8eaed/5f6368?text=No+Preview';
            if (templateData.previewImage) {
              // templateData.previewImage is filename here
              templateData.previewImageFileName = templateData.previewImage; // Store the filename
              const previewFileId = await findFileInFolder(
                folder.id,
                templateData.previewImage,
              );
              if (previewFileId) {
                previewImageUrl = await fetchFileContent<string>(
                  previewFileId,
                  true,
                );
              } else {
                console.warn(
                  `Preview image '${templateData.previewImage}' not found in folder "${folder.name}"`,
                );
              }
            }
            templateData.previewImage = previewImageUrl; // Overwrite with dataURL for display
            templateData.driveFolderId = folder.id; // For fetching assets later
            return templateData;
          } catch (e) {
            console.error(
              `Error processing template folder ${folder.name}:`,
              e,
            );
            return null;
          }
        },
      );
      const templates = await Promise.all(templatePromises);
      return templates.filter((t): t is Template => t !== null);
    } catch (error) {
      console.error('Error listing templates from Drive:', error);
      return [];
    }
  }

  async function getTemplateAssets(
    folderId: string,
    steps: TemplateStep[],
  ): Promise<Record<string, string>> {
    const assets: Record<string, string> = {};
    const assetPromises: Array<Promise<void>> = [];

    steps.forEach((step) => {
      step.image_slots.forEach((slot) => {
        if (slot.is_static && slot.default_file_name) {
          const promise = (async () => {
            const fileId = await findFileInFolder(
              folderId,
              slot.default_file_name!,
            );
            if (fileId) {
              assets[slot.asset_name] = await fetchFileContent<string>(
                fileId,
                true,
              );
            }
          })();
          assetPromises.push(promise);
        }
      });
    });

    await Promise.all(assetPromises);
    return assets;
  }

  async function deleteTemplate(template: Template) {
    if (!template.driveFolderId) return;
    try {
      await gapi.client.drive.files.update({
        fileId: template.driveFolderId,
        resource: {trashed: true},
      });
      console.log(`Template folder ${template.driveFolderId} trashed.`);
    } catch (error) {
      console.error('Error deleting template folder:', error);
      throw error;
    }
  }

  return {
    isReady,
    isSignedIn,
    signIn,
    signOut,
    saveTemplate,
    listTemplates,
    getTemplateAssets,
    deleteTemplate,
    initialize,
  };
}
