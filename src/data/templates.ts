/**
 * @fileoverview This file contains a list of predefined templates used for
 * generating image assets. Each template defines a specific style and
 * a series of steps for image generation.
 */

import {DEFAULT_IMAGE_MODEL} from '../constants';
import {Template} from '../types';

/**
 * An array of predefined templates used for generating image assets.
 * Each template includes a unique ID, name, description, preview image URL,
 * aspect ratio, the generative AI model to use, and a series of steps
 * detailing the image generation process.
 */
export const TEMPLATES: Template[] = [
  {
    id: 'street-snap',
    name: 'Street Snap',
    description: 'Generate a fashion street snap for the product .',
    previewImage: 'https://placehold.co/400x300/d1e3ff/1a73e8?text=Street+Snap',
    aspect_ratio: '4:3',
    genai_model: DEFAULT_IMAGE_MODEL,
    steps: [
      {
        name: 'Step 1: Generate Street Snap',
        text_prompt: `Generate a high-resolution editorial fashion photograph.
Extract the primary product from asset1. Determine the product category Men's Wear Women's Wear or Costume and the intended gender.
Enhance the product's appearance to look like high-quality real-world materials with realistic textures and stitching.
Background Scene: A dynamic realistic urban street a modern city intersection or a concrete-and-glass commercial area. The scene should be slightly blurred or out of focus to keep the product sharp and prominent. MUST: Expand the generated background to fill the entire landscape frame. DO NOT reuse the model pose or exact background from the input asset1.
Model Pose: The model is captured mid-stride or paused naturally in the city scene with a confident effortless pose that clearly displays the garment's silhouette and length.
Facial Expression: A neutral-to-serious powerful expression a confident direct gaze at the camera or a strong profile.
Art Style: Clean crisp editorial street photography. Use bright even professional lighting to eliminate harsh shadows and make the garment's color and features pop against the urban backdrop. Composition is minimalist well-framed and emphasizes the product's design detail
`,
        image_slots: [{asset_name: 'asset1', is_static: false}],
        text_variables: [],
      },
      {
        name: 'Step 2: Add Your Logo',
        text_prompt: `Place the provided "Brand Logo" (asset2) onto the final image (asset1).
1. If the final image already has a logo, replace it with the new one in the exact same position.
2. If the template does not have a logo, place the new logo in a clean, professional corner (e.g., top-right).
3.Ensure the logo is clearly visible, following contrast rules (recolor to monochrome if needed), and does not overlap the new product or any human faces. The logo's shape must be preserved.
`,
        image_slots: [{asset_name: 'asset2', is_static: false}],
        text_variables: [],
      },
    ],
  },
  {
    id: 'virtual-try-on',
    name: 'Virtual Try-On',
    description: 'Show the given product on the model.',
    previewImage:
      'https://placehold.co/400x300/e8eaed/5f6368?text=Virtual+Try-On',
    aspect_ratio: '1:1',
    genai_model: DEFAULT_IMAGE_MODEL,
    steps: [
      {
        name: 'Step 1: Add model for the product',
        text_prompt: `Generate a high-resolution, editorial fashion photograph based on the provided product image (asset1).
Core Product & Model:
1. Extract the primary apparel product(s) from asset1.
2. Determine the product category (Men's Wear, Women's Wear, or Costume) and the intended gender.
3. Select a diverse, fashion-forward model of the appropriate gender to wear the product(s) properly. If the product is a pair of wears (e.g., a couple's outfit), include two models of the specified genders.
4. Enhance the product's appearance to look like high-quality, real-world materials with realistic textures and stitching.

Staging & Background:
5.  Background Scene:
* If the product is a Costume: Use a clean, brightly lit white room with a few subtle, modern decorations.
* Otherwise (Men's/Women's Wear): Use a realistic, simple, minimalist scene (e.g., a studio set, a concrete wall, or a clean urban backdrop).
6.  MUST: Expand the generated background to fill the entire landscape frame.
7.  DO NOT reuse the model, pose, or exact background from the input asset1.

Strict Cropping and Display Rules:
8.  Model Pose & Gesture: The model stands confidently, in a controlled, intentional pose that clearly displays the garment's silhouette and length without distraction.
9.  Facial Expression: A neutral-to-serious, powerful expression; a confident, direct gaze at the camera or a strong profile. Project a modern, fashion-forward attitude—avoid excessive AI-stylization or unnatural smiles.
10. Cropping Adherence: The framing must be strict and product-focused.
Tops (e.g., Jackets, Shirts, Blouses): Upper body focus. Crop the frame from the waist or upper hips up to the base of the neck, intentionally excluding the model's head and face to keep focus on the garment.
Bottoms (e.g., Pants, Skirts, Shorts): Lower body focus. Crop the frame from just above the waistband down to the feet, showing only the lower torso and legs.
Full Garments (e.g., Dresses, Jumpsuits, Costumes): Full body shot, head-to-toe, to display the entire silhouette.

Art Style:
11. Art Style: Clean, crisp editorial photography. Use bright, even, and professional lighting (like a single softbox or reflector) to eliminate harsh shadows and make the garment's color and features pop. The composition must be minimalist, well-framed, and emphasize the product's specific design details.
`,
        image_slots: [{asset_name: 'asset1', is_static: false}],
        text_variables: [],
      },
    ],
  },
  {
    id: 'brand-guideline-based-image-generation',
    name: 'Brand Guideline Based Image Generation',
    description:
      'Generate product images that following a specific layout template or guideline',
    previewImage:
      'https://placehold.co/400x300/b39ddb/ffffff?text=Brand+Guideline',
    aspect_ratio: '4:5',
    genai_model: DEFAULT_IMAGE_MODEL,
    steps: [
      {
        name: 'Step 1: Generate Product Image Based On Sample Guideline',
        text_prompt: `
                You are a meticulous and highly skilled digital ad designer. Your sole purpose is to create a single, professional digital ad with a background style that matches the provided brand style guide (Asset 2) and generate no more than two human model from {{model_from_country}} showing the product. DO NOT use model from the the brand style guide (Asset 2). Adherence to the following rules is ABSOLUTE and NON-NEGOTIABLE.
                Provided Assets:
                    - Asset 1: A product photo.
                    - Asset 2: A brand style guide (contains fonts, colors, etc). You MUST extract the logo from this asset. Product Context: "{{product_description}}" This description provides context about the product. Use this information to inform the overall mood, background, and style of the ad, but DO NOT display this text in the ad itself unless it is also included in the headlines or features.
                Core Task:
                    Generate one image ad. Create a clean, professional, and visually appealing layout that follows modern design principles. The layout should complement the product and brand identity.
                NON-NEGOTIABLE DESIGN RULES:
                    1.  BACKGROUND FIRST: Create a new, clean, professional background for the ad. The background's color scheme and style MUST be exclusively derived from the provided brand style guide (Asset 2).
                    2.  PRODUCT PLACEMENT: Generate no more than two human models from {{model_from_country}} using the product in a daily life use case. Expertly cut out the product from the product photo and place it onto the new background. The product must be the clear focal point, big and eye catching, but it must NOT cover more than 50% of the total ad space to ensure a clean layout. Add original product image (Asset 1) to the bottom right corner in a small way.
                    3.  STRICT SEPARATION (CRITICAL): The text elements and the product image MUST NOT overlap under any circumstances. There must be clear, visible space between the product and all text. Position the text in a dedicated area (e.g., to the side, above, or below the product)
                    4.  BRAND IDENTITY (CRITICAL):
                        - Colors: The ENTIRE ad's color palette (background, text, graphics) MUST strictly use the colors found in the guide (Asset 2).
                        - Typography: The font style for all text MUST be professional, legible, and derived from or complementary to the typography in the brand style guide (Asset 2).
                        - Logo: An official logo file is NOT provided. You MUST meticulously extract the company logo from the brand style guide (Asset 2). Ensure the extraction is clean and accurate. DO NOT use any logo from the product photo.
                    5.  TEXT SOURCE OF TRUTH (MOST CRITICAL RULE):
                        - The brand style guide (Asset 2) is for VISUAL styles reference ONLY. You MUST IGNORE ALL other text that is not the logo.
                        - The text provided below MUST be added to the final ad image EXACTLY. Do NOT add, remove, or alter it in any way. You may add other related highlighting text.
                        - Headlines: {{Headline}}
                        - Features: {{Feature}}
                        - Call to Action: {{CTA}}
                        - Any number in headlines added to the image should be highlighted to make them different from other text.
                    6.  FINAL QUALITY CHECK:
                        - The final image must be high-resolution and professional.
                        - No watermarks or artifacts.
                        - The product from the brand style guide (Asset 2) MUST NOT be present on the result image.
                        - All text must be perfectly legible. Number should be highlighted and different from other words.
                        - Only one Logo presents and MUST be at the top left corner of the image. The logo should not be from the product photo.
                        - ABSOLUTELY NO text from the brand style guide (Asset 2) should be present on result images.
                        - The product (Asset 1) should be exactly the same as provided.
                        - Models from the brand style guide (Asset 2) MUST NOT be present on the result images.
                        - The product image added to the bottom right should use the product image provided (Asset 1)

                Failure to follow any of these rules, especially rule #6, is a complete failure. Generate the ad now, following these instructions with extreme precision.
            `,
        image_slots: [
          {asset_name: 'product_image', is_static: false},
          {asset_name: 'guideline_sample', is_static: false},
        ],
        text_variables: [
          {
            name: 'product_description',
            default_value: 'Simple product description here...',
          },
          {
            name: 'model_from_country',
            default_value: 'e.g., Brazil, California',
          },
          {
            name: 'Headline',
            default_value: 'e.g. Up to 30% off!',
          },
          {
            name: 'Feature',
            default_value: 'e.g. Freeshipping Any Where',
          },
          {
            name: 'CTA',
            default_value: 'e.g. Shop Now!',
          },
        ],
      },
    ],
  },
  {
    id: 'brand-guideline-based-multi-product-image-generation',
    name: 'Brand Guideline Based Multi-product Image Generation',
    description:
      'Generate image contain 3 products that following a specific layout template or guideline',
    previewImage:
      'https://placehold.co/400x300/b39ddb/ffffff?text=Multi+Product-in-One',
    aspect_ratio: '16:9',
    genai_model: DEFAULT_IMAGE_MODEL,
    steps: [
      {
        name: 'Step 1: Generate Product Image Based On Sample Guideline',
        text_prompt: `
                You are an expert promotional graphic designer with a deep understanding of cultural and regional diversity.
                Your task is to create a new promotional image that perfectly simulates the visual style, color palette, and typography of the provided style reference image (Asset 1).

                The new image MUST adhere to the following strict requirements:

                1.  Logo Handling:
                    ·   You MUST identify and accurately extract any logo present in the style reference image (Asset 1).
                    ·   This extracted logo MUST be integrated seamlessly and tastefully onto the new promotional graphic.
                    ·   The logo's placement should be professional, respecting visual hierarchy, and should not obscure key elements like the model's face or the main product.
                    ·   The logo MUST be placed at top left corner of the result image.

                2.  Text Content:
                    ·   It must legibly include the following text elements. Any numbers in the headline or feature should be highlighted (e.g., larger font, bold, different color, or a combination). DO NOT use '*' for highlighting.
                    ·   Headline: "{{Headline}}"
                    ·   Feature: "{{Feature}}"
                    ·   Call to Action: "{{CTA}}"

                3.  Human Model and Product Interaction:
                    ·   It is absolutely critical that the image features a real human model representative of the specified region: {{model_from_country}}. Pay close attention to this requirement to ensure accurate and respectful representation.
                    ·   The model should be realistically using, holding, or presenting "Product 1" (Asset 2).
                    ·   Crucially, "Product 1" (Asset 2) itself must be large and a primary focal point of the interaction, not just an accessory. It should be clearly visible and highlighted.

                4.  Product Display:
                    ·   All three products must be large, prominent, and clearly visible** in the final graphic.
                    ·   "Product 1" is featured with the model as described above.
                    ·   ALL "Product 1" (Asset 2)and "Product 2" (Asset 3)and "Product 3" (Asset 4) MUST each be displayed in their own separate, large, and prominent placeholders. The products inside these placeholders should be the main focus of their respective areas, displayed clearly and at a large scale.

                5.  Strict Text Rule:
                    ·   DO NOT add any extra text to the result images other than the provided Headline, Feature, and Call to Action.
                    ·   The product should be exactly the same as provided.
                    ·   For result image, there MUST be 3 placeholders containing product in a large and prominent style and a human model with product interaction.
                    ·   Human Model should outside of 3 placeholders presenting Product 1 (Asset 2).

                Do not include the original reference style image in the final output; only use it for styling guidance. The final image should be a high-quality, seamless composition that looks like a professional advertisement.
            `,
        image_slots: [
          {asset_name: 'guideline_sample', is_static: false},
          {asset_name: 'product_image1', is_static: false},
          {asset_name: 'product_image2', is_static: false},
          {asset_name: 'product_image3', is_static: false},
        ],
        text_variables: [
          {
            name: 'model_from_country',
            default_value: 'e.g., Brazil, California',
          },
          {
            name: 'Headline',
            default_value: 'e.g. Up to 30% off!',
          },
          {
            name: 'Feature',
            default_value: 'e.g. Freeshipping Any Where',
          },
          {
            name: 'CTA',
            default_value: 'e.g. Shop Now!',
          },
        ],
      },
    ],
  },
  {
    id: 'holiday-season',
    name: 'Holiday Season',
    description:
      'Generate image asset for a holiday season following a sample guideline image',
    previewImage:
      'https://placehold.co/400x300/c62828/ffffff?text=Holiday+Season',
    aspect_ratio: '1:1',
    genai_model: DEFAULT_IMAGE_MODEL,
    steps: [
      {
        name: 'Step 1: Generate Product Image Based On Sample Guideline',
        text_prompt: `
                You are a meticulous and highly skilled digital ad designer. Your sole purpose is to create a single, professional digital ad with a background style that matches the provided brand style guide (Asset 2) and generate no more than two human model from {{model_from_country}} showing the product. DO NOT use model from the the brand style guide (Asset 2). Adherence to the following rules is ABSOLUTE and NON-NEGOTIABLE.
                Provided Assets:
                    - Asset 1: A product photo.
                    - Asset 2: A brand style guide (contains fonts, colors, etc). You MUST extract the logo from this asset. Product Context: "{{product_description}}" This description provides context about the product. Use this information to inform the overall mood, background, and style of the ad, but DO NOT display this text in the ad itself unless it is also included in the headlines or features.
                Core Task:
                    Generate one image ad. Create a clean, professional, and visually appealing layout that follows modern design principles. The layout should complement the product and brand identity.
                NON-NEGOTIABLE DESIGN RULES:
                    1.  BACKGROUND FIRST: Create a new, clean, professional background for the ad. The background's color scheme and style MUST be exclusively derived from the provided brand style guide (Asset 2).
                    2.  PRODUCT PLACEMENT: Generate no more than two human models from {{model_from_country}} using the product in a daily life use case. Expertly cut out the product from the product photo and place it onto the new background. The product must be the clear focal point, big and eye catching, but it must NOT cover more than 50% of the total ad space to ensure a clean layout. Add original product image (Asset 1) to the bottom right corner in a small way.
                    3.  STRICT SEPARATION (CRITICAL): The text elements and the product image MUST NOT overlap under any circumstances. There must be clear, visible space between the product and all text. Position the text in a dedicated area (e.g., to the side, above, or below the product)
                    4.  BRAND IDENTITY (CRITICAL):
                        - Colors: The ENTIRE ad's color palette (background, text, graphics) MUST strictly use the colors found in the guide (Asset 2).
                        - Typography: The font style for all text MUST be professional, legible, and derived from or complementary to the typography in the brand style guide (Asset 2).
                        - Logo: An official logo file is NOT provided. You MUST meticulously extract the company logo from the brand style guide (Asset 2). Ensure the extraction is clean and accurate. DO NOT use any logo from the product photo.
                    5.  TEXT SOURCE OF TRUTH (MOST CRITICAL RULE):
                        - The brand style guide (Asset 2) is for VISUAL styles reference ONLY. You MUST IGNORE ALL other text that is not the logo.
                        - The text provided below MUST be added to the final ad image EXACTLY. Do NOT add, remove, or alter it in any way. You may add other related highlighting text.
                        - Headlines: {{Headline}}
                        - Features: {{Feature}}
                        - Call to Action: {{CTA}}
                        - Any number in headlines added to the image should be highlighted to make them different from other text.
                    6.  FINAL QUALITY CHECK:
                        - The final image must be high-resolution and professional.
                        - No watermarks or artifacts.
                        - The product from the brand style guide (Asset 2) MUST NOT be present on the result image.
                        - All text must be perfectly legible. Number should be highlighted and different from other words.
                        - Only one Logo presents and MUST be at the top left corner of the image. The logo should not be from the product photo.
                        - ABSOLUTELY NO text from the brand style guide (Asset 2) should be present on result images.
                        - The product (Asset 1) should be exactly the same as provided.
                        - Models from the brand style guide (Asset 2) MUST NOT be present on the result images.
                        - The product image added to the bottom right should use the product image provided (Asset 1)

                Failure to follow any of these rules, especially rule #6, is a complete failure. Generate the ad now, following these instructions with extreme precision.
            `,
        image_slots: [
          {asset_name: 'product_image', is_static: false},
          {asset_name: 'guideline_sample', is_static: false},
        ],
        text_variables: [
          {
            name: 'model_from_country',
            default_value: 'e.g., Brazil, California',
          },
          {
            name: 'Headline',
            default_value: 'e.g. Up to 30% off!',
          },
          {
            name: 'Feature',
            default_value: 'e.g. Freeshipping Any Where',
          },
          {
            name: 'CTA',
            default_value: 'e.g. Shop Now!',
          },
        ],
      },
      {
        name: 'Step 2: Generate Image For a Holiday Season',
        text_prompt: `
                Add {{holiday_season}} Shopping season element to the image, do not block original logo, product, model and text.
            `,
        image_slots: [],
        text_variables: [
          {
            name: 'holiday_season',
            default_value: 'e.g. Christmas, Black Friday',
          },
        ],
      },
    ],
  },
  {
    id: 'Text_only_with_model',
    name: 'Text Only With Model',
    description: 'Generate ads image with text and 2-3 local human model only',
    previewImage:
      'https://placehold.co/400x300/228B22/FFF?text=Text+Only+With+Model',
    aspect_ratio: '16:9',
    genai_model: DEFAULT_IMAGE_MODEL,
    steps: [
      {
        name: 'Step 1: Generate',
        text_prompt: `You are an ads Creative Specialist. Your task is to generate an ad image for {{Country}} market with no product but 2-3 local human model and some promotional elements. You will be given one reference style guideline image (Asset 1). From this guideline image, carefully extract the logo and put it onto your result image. The logo MUST be exactly the same as the style guideline image (Asset 1). For styling and layout of result image, follow rules below:
1. Any product on the style guideline image MUST NOT appear on the result image and also you MUST NOT generate any product as well.
2. The overall styling like background color, text font should be similar to styling guideline (Asset 1).
3. There MUST be 2 - 3 human model from {{Country}} in the result image.
4. The logo should be exactly the same as the style guideline image (Asset 1)

You are also provided with some text element including headline: {{Headline}}, feature: {{Feature}}, cta: {{CTA}}. For text elements, follow the rule:
1. Provided headline, feature and cta MUST be put on the result image in a correct way.
2. You should also add additional text like text from style guideline (Asset 1) to the result image relative to the content.
3. Any number in the headline and feature should be highlighted (e.g. Bold, Different Color, etc) from other text.
4. Make CTA button-like.
`,
        image_slots: [{asset_name: 'template_image', is_static: false}],
        text_variables: [
          {
            name: 'Country',
            default_value: 'United States',
          },
          {
            name: 'Headline',
            default_value: '30% Off Any Order',
          },
          {
            name: 'Feature',
            default_value: 'Great Buy',
          },
          {
            name: 'CTA',
            default_value: 'SHOP NOW',
          },
        ],
      },
    ],
  },
  {
    id: 'Text_only',
    name: 'Text Only',
    description: 'Generate ads image with text only',
    previewImage: 'https://placehold.co/400x300/227C55/FFF?text=Text+Only',
    aspect_ratio: '16:9',
    genai_model: DEFAULT_IMAGE_MODEL,
    steps: [
      {
        name: 'Step 1: Generate',
        text_prompt: `You are an ads Creative Specialist. Your task is to generate an ad image {{Country}} market with no product but only promotional text elements. You will be given one reference style guideline image (Asset 1). From this guideline image, carefully extract the logo and put it onto your result image. The logo MUST be exactly the same as the style guideline image (Asset 1). For styling and layout of result image, follow rules below:
1. Any product on the style guideline image MUST NOT appear on the result image and also you MUST NOT generate any product as well.
2. The overall styling like background color, text font should be similar to styling guideline (Asset 1).
3. The logo should be exactly the same as the style guideline image (Asset 1).
4. There should be only text and logo in the result image. DO NOT add any human model from style guideline image (Asset 1) to the result image.

You are also provided with some text element including headline: {{Headline}}, feature: {{Feature}}, cta: {{CTA}}. For text elements, follow the rule:
1. Provided headline, feature and cta MUST be put on the result image in a correct way.
2. You should also add additional text like text from style guideline (Asset 1) to the result image relative to the content.
3. Any number in the headline and feature should be highlighted (e.g. Bold, Different Color, etc) from other text.
4. Make CTA button-like.
`,
        image_slots: [{asset_name: 'template_image', is_static: false}],
        text_variables: [
          {
            name: 'Country',
            default_value: 'United States',
          },
          {
            name: 'Headline',
            default_value: '30% Off Any Order',
          },
          {
            name: 'Feature',
            default_value: 'Great Buy',
          },
          {
            name: 'CTA',
            default_value: 'SHOP NOW',
          },
        ],
      },
    ],
  },
  {
    id: 'basic_version',
    name: 'Basic Version',
    description:
      'Transfer a product to image creative based on a template image.',
    previewImage:
      'https://placehold.co/400x300/fce8b2/e8710a?text=Basic+Version',
    aspect_ratio: '16:9',
    genai_model: DEFAULT_IMAGE_MODEL,
    steps: [
      {
        name: 'Step 1: Generate',
        text_prompt: `# ROLE & GOAL
You are an expert AI Art Director. Your goal is to create one professional, high-quality digital image ad using the provided assets and instructions.

# ASSETS
You will be provided with three images and optional text copy.
- **ASSET 1: Product/Lifestyle Photo:** The main visual for the ad.
- **ASSET 2: Brand Style Guide/Ad Template:** A reference for style ONLY.
- **ASSET 3: Brand Logo:** The official brand logo.
- **Ad Copy:**
HEADLINE: "{{Headline}}",
DESCRIPTION: "{{Description}}",
Call to Action: "{{CTA}}",

# CREATIVE DIRECTION
For this specific ad, follow this direction: **High-Fidelity Template Adaptation:** Your primary goal is to recreate the "Brand Style Guide/Ad Template" (ASSET 2) using the provided new assets.
    1.  Analyze the template's layout: the positioning, scale, and alignment of its core components (image areas, text area, logo placement).
    2.  **CRITICAL** Construct a new ad that mirrors this *structure and style*, but is replaced entirely with the new assets (ASSET 1 + ASSET 3 + user provided Ad Copy). REMOVE AND DO NOT INCLUDE any original text or ad copy, logo or images from the template (ASSET 2).
    3.  The final ad should still feel like it perfectly fits within the brand's established design system.

# EXECUTION RULES
Follow these rules meticulously.

### 1. How to Use the Style Guide (ASSET 2)
- **USE ONLY THE STYLE:** Extract and use only the stylistic elements from ASSET 2:
    - Color palette
    - Typography (font styles, weights)
    - General layout and design ideas (shapes, patterns).
- **DO NOT USE THE CONTENT (CRITICAL):** You are strictly forbidden from using any of the original *content* from ASSET 2. All of the following must be completely removed and ignored:
    - **Any logos.**
    - **Any text and ad copy.**
    - **Any existing products.**
    - **Any images.**
- The final ad must be a new creation inspired only by the *style* of ASSET 2.

### 2. Image Integration (ASSET 1)
- **If ASSET 1 is a Product Photo (on a simple background):** Cleanly isolate the product and place it into your new ad composition.
- **If ASSET 1 is a Lifestyle Photo:** Your goal is to create a visually engaging lifestyle ad that promotes the product within the photo by using one of the two methods below:
  - ** Method 1:** Outpainting.** Seamlessly extend the photo's actual content (outpainting) to fill the relevant space or entire canvas. Make it look like one continuous photo.
  - ** Method 2:** If outpainting is not feasible or looks unnatural with the provided Brand Guide/Ad Template (ASSET 2), you may creatively isolate the key person along with the product, and use graphical elements, colors, and textures inspired by the "Brand Style Guide/Ad Template" (ASSET 2) to create a cohesive, well-designed ad.
- **Do not alter the product** within the photo.

### 3. Logo Integration (ASSET 3)
- **CRITICAL RULE:** Treat ASSET 3 (the Brand Logo) as an immutable digital asset. It MUST be placed directly onto the final ad without ANY modification.
- **DO NOT RE-DRAW, RE-INTERPRET, OR TRACE THE LOGO.** You are strictly forbidden from altering the logo's pixels. This includes its colors, shape, proportions, and design elements. It must be a perfect copy.
- **VISIBILITY IS KEY (CRITICAL):** Place the logo in a professional, standard location (e.g., a corner). The logo **must** be clearly legible. To ensure this, it must have high contrast against its immediate background. If the logo has light-colored elements (like white text) that might blend into a light background, you MUST place it on a darker area of the ad.
- Ensure the logo is legible but not dominant, occupying roughly 5-10% of the ad area.

### 4. Text Integration

- Render the provided ad copy using the typography found in the "Brand Style Guide" (ASSET 2).
- If a copy element like 'Description' is not provided in the list above, do not invent one or create a placeholder for it.
- Ensure all text is perfectly legible with high contrast against its background.
- Use only the exact ad copy provided. Do not add, omit, or change any words.
:
- **Create Natural Negative Space:** Since ad copy is skipped, design a visually complete ad with clean, uncluttered areas where text and ad copy could be added in later. This space should be an organic part of the design.
- **NO PLACEHOLDERS (CRITICAL):** Do not create any shapes that look like text placeholders (e.g., empty boxes or rectangles). Also, do not attempt to add your own text since no copy is explicitely provided. The ad must look like a polished, text-free visual, that is ready for the end user to add their own copy at a later stage.


# FINAL QUALITY CHECK
Before finishing, verify:
1.  **No Obstruction:** No text, graphical elements, or logos cover any human faces or the product in the final image ad.
2.  **Professional Finish:** The ad is clean, sharp, and high-resolution. It should look like a digital image ad that is professionally designed with well composed and placed visual elements.
3.  **NO solid borders:** The ad MUST NOT have any odd solid borders at the sides or top/bottom.
4.  **Asset Integrity:** The brand logo (ASSET 3) is an exact, pixel-for-pixel copy of the provided asset and has not been distorted or re-drawn. The product within the main photo (ASSET 1) is also completely unaltered.
5.  **Rule Compliance:** You have followed all the execution rules above.

`,
        image_slots: [
          {asset_name: 'product_image', is_static: false},
          {asset_name: 'template_image', is_static: false},
          {asset_name: 'logo_image', is_static: false},
        ],
        text_variables: [
          {
            name: 'Headline',
            default_value: 'Hot Deals',
          },
          {
            name: 'Description',
            default_value: 'Discover the Latest Trends',
          },
          {
            name: 'CTA',
            default_value: 'SHOP NOW',
          },
        ],
      },
    ],
  },
];
