/**
 * Represents a slot for an image asset within a template step.
 * asset_name: The name of the asset.
 * is_static: Whether the image is static or user-provided.
 * default_file_name: Optional, the default file name for static assets.
 */
export interface ImageSlot {
  asset_name: string;
  is_static: boolean;
  default_file_name?: string;
}

/**
 * Represents a variable that can be filled with text.
 * name: The name of the variable.
 * default_value: The default value for the variable.
 */
export interface TextVariable {
  name: string;
  default_value: string;
}

/**
 * Represents a single step in a template.
 * name: The name of the step.
 * text_prompt: The text prompt for the step.
 * image_slots: The image slots for the step.
 * text_variables: The text variables for the step.
 */
export interface TemplateStep {
  name: string;
  text_prompt: string;
  image_slots: ImageSlot[];
  text_variables: TextVariable[];
}

/**
 * Represents a template.
 * id: The ID of the template.
 * name: The name of the template.
 * description: The description of the template.
 * previewImage: The preview image for the template.
 * aspect_ratio: The aspect ratio for the template.
 * steps: The steps for the template.
 * driveFolderId: Optional, the ID of the Google Drive folder for the template.
 * previewImageFileName: Optional, the filename of the preview image.
 * genai_model: Optional, the model to use for the template.
 */
export interface Template {
  id: string;
  name: string;
  description: string;
  previewImage: string; // Filename for Drive, dataURL for display
  aspect_ratio: string;
  steps: TemplateStep[];
  driveFolderId?: string;
  previewImageFileName?: string; // To store original filename from Drive
  genai_model?: string;
}

/**
 * Represents a single bulk job.
 * id: The ID of the job.
 * rowData: The row data for the job.
 * status: The status of the job.
 * resultImageUrl: The result image URL for the job.
 * error: The error message for the job.
 * selected: Whether the job is selected.
 * inputImageUrl: The input image URL for the job.
 */
export interface BulkJob {
  id: number;
  rowData: Record<string, string>;
  status: 'pending' | 'processing' | 'success' | 'failed';
  resultImageUrl: string | null;
  error: string | null;
  selected: boolean;
  inputImageUrl: string | null;
}

/**
 * Represents an image input for a step.
 * assetName: The name of the asset.
 * isStatic: Whether the image is static.
 * file: The file for the image.
 * previewUrl: The preview URL for the image.
 * defaultFileName: Optional, the default filename for the image.
 * isLoading: Whether the image is loading.
 */
export interface ImageInput {
  assetName: string;
  isStatic: boolean;
  file: File | null;
  previewUrl: string | null;
  defaultFileName?: string;
  isLoading: boolean;
}

/**
 * Represents the state of a step in the creation process.
 * id: The ID of the step.
 * title: The title of the step.
 * prompt: The prompt for the step.
 * imageInputs: The image inputs for the step.
 * textVariables: The text variables for the step.
 * isGeneratingPrompt: Whether the prompt is being generated.
 */
export interface StepState {
  id: string;
  title: string;
  prompt: string;
  imageInputs: ImageInput[];
  textVariables: TextVariable[];
  isGeneratingPrompt: boolean;
}

/**
 * Represents the result of processing a single step in a template.
 * id: The ID of the step.
 * title: The title of the step.
 * imageUrl: The URL of the generated image for the step, if successful.
 * isLoading: Whether the result for this step is currently being loaded or generated.
 * error: An error message if the step processing failed.
 */
export interface StepResult {
  id: string;
  title: string;
  imageUrl: string | null;
  isLoading: boolean;
  error: string | null;
}
