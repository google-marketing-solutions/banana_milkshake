<!--
Copyright 2026 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->
# Banana Milkshake Pro

## Introduction
Banana Milkshake Pro is a gTech solution that provides an AI (Gemini)based image generator that designed to help the advertisers create quality retail/commerce/fashion image ads & feeds at scale with powerful features


## Banana Milkshake AI Studio Gemini App Proxy Server

This nodejs proxy server lets you run your AI Studio Gemini application unmodified, without exposing your API key in the frontend code.


## Detailed Setup & Deployment Instructions

### Prerequisites

1.  **Google Cloud SDK**: Install and initialize the [gcloud CLI](https://cloud.google.com/sdk/docs/install).
2.  **Google Cloud Project**: You need a Google Cloud Project. Set your current project in the CLI:
    ```bash
    gcloud config set project YOUR_PROJECT_ID
    ```
3.  **Billing**: Ensure billing is enabled for your Google Cloud Project.

---

### Step 1: Enable Required APIs

Enable the necessary APIs for Cloud Run, Cloud Build, Secret Manager, and Google Drive:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  drive.googleapis.com
```

*(Optional)* If you plan to use Vertex AI instead of Gemini API key, also enable:
```bash
gcloud services enable aiplatform.googleapis.com
```

---

### Step 2: Configure Google OAuth Credentials (for Google Drive)

The template library features require access to the user's Google Drive. You must set up OAuth credentials:

1.  Go to the **APIs & Services > OAuth consent screen** in the Cloud Console.
2.  Configure the consent screen (Internal is recommended if you are within a Google workspace organization).
3.  Go to **APIs & Services > Credentials**.
4.  Click **Create Credentials** and select **OAuth client ID**.
5.  Select **Web application** as the application type.
6.  Add **Authorized JavaScript origins**:
    *   For local testing: `http://localhost:3000` (and `http://localhost:3001` if running backend directly).
    *   For deployed version: The URL of your Cloud Run service (you will get this after deployment, you can update credentials later).
7.  Click **Create** and note down the **Client ID**.

You also need an **API Key** for the GAPI client initialization:
1.  On the **Credentials** page, click **Create Credentials** and select **API key**.
2.  (Recommended) Restrict the key to only call the **Google Drive API**.
3.  Note down the **API Key**.

---

### Step 3: Configure Secrets

Sensitive keys must be stored in Secret Manager so the Cloud Run service can access them securely.

1.  **Drive API Key**:
    ```bash
    echo -n "YOUR_DRIVE_API_KEY" | gcloud secrets create drive_api_key --data-file=-
    ```
2.  **Gemini API Key** (If using Gemini API directly):
    ```bash
    echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini_api_key --data-file=-
    ```

---

### Step 4: Deploy to Cloud Run

Deploy the application. This command will build the Docker container using Cloud Build and deploy it to Cloud Run.

Replace `YOUR_GOOGLE_CLIENT_ID` with the OAuth Client ID you created in Step 2.

```bash
gcloud run deploy banana-milkshake \
  --source=. \
  --region=us-west1 \
  --update-secrets=GEMINI_API_KEY=gemini_api_key:latest,DRIVE_API_KEY=drive_api_key:latest \
  --set-env-vars=GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
```

*Note: If you are not using Gemini API key (e.g. using Vertex AI), you can omit `GEMINI_API_KEY=gemini_api_key:latest` from the `--update-secrets` flag.*

After deployment, Cloud Run will output the Service URL. Remember to add this URL to your OAuth Client ID's **Authorized JavaScript origins** in the Cloud Console (Step 2).

---

### Local Development

To run the application locally:

1.  Create a `.env` file in the `server` directory:
    ```env
    # server/.env
    DRIVE_API_KEY=your_drive_api_key
    GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
    GEMINI_API_KEY=your_gemini_api_key
    ```
2.  Start the backend server:
    ```bash
    cd server
    npm install
    npm start
    ```
3.  In a separate terminal, start the frontend development server:
    ```bash
    npm install
    npm run dev
    ```
4.  Open `http://localhost:3000` in your browser.
