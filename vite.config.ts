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

import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {defineConfig, loadEnv} from 'vite';

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const version = packageJson.version;

// FIX: __dirname is not available in ES modules. The following lines define it for use in this file.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viteConfig = defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      proxy: {
        '/generate-content': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/image-proxy': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/api-proxy': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        '/public': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/service-worker.js': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [vue(), vueJsx()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.DRIVE_API_KEY': JSON.stringify(env.DRIVE_API_KEY),
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID),
      'process.env.GOOGLE_CLOUD_PROJECT': JSON.stringify(
        env.GOOGLE_CLOUD_PROJECT,
      ),
      'process.env.GOOGLE_CLOUD_LOCATION': JSON.stringify(
        env.GOOGLE_CLOUD_LOCATION,
      ),
      'process.env.USE_VERTEX_AI': true,
      'process.env.DEFAULT_TEXT_MODEL': JSON.stringify('gemini-2.5-pro'),
      'process.env.DEFAULT_IMAGE_MODEL': JSON.stringify(
        'gemini-2.5-flash-image',
      ),
      'process.env.SUPPORTED_IMAGE_MODEL': [
        'gemini-2.5-flash-image',
        'gemini-3-pro-image-preview',
      ],
      'process.env.APP_VERSION': JSON.stringify(version),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'vue': 'vue/dist/vue.esm-bundler.js',
      },
    },
  };
});
export {viteConfig as default};
