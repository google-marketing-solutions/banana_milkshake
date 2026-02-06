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

import {GoogleGenAI} from '@google/genai';
declare const process: {env: Record<string, string | undefined>};

/**
 * An initialized instance of `GoogleGenAI`.
 * This client is used to make calls to the Google Generative AI API.
 * It is configured with an API key obtained from environment variables.
 */
export const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY || '',
});

/**
 * Calls the backend endpoint `/generate-content` with the given payload.
 * This function is used to proxy requests to the Google GenAI API
 * through a server-side endpoint, which can help manage API keys
 * and other security concerns.
 * @param payload The object to send as the request body.
 * @return The JSON response from the server.
 */
export async function callGenAIApi(payload: object) {
  const response = await fetch('/generate-content', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  return result;
}
