import { GoogleGenAI } from '@google/genai';

export interface CloudflareImageParams {
  prompt: string;
  model?: string;
  num_steps?: number;
  steps?: number;
  width?: number;
  height?: number;
  guidance?: number;
  seed?: number;
  negative_prompt?: string;
}

export const SUPPORTED_MODELS = [
  {
    id: '@cf/black-forest-labs/flux-1-schnell',
    name: 'FLUX.1 Schnell (Recommended)',
    provider: 'Black Forest Labs',
    speed: 'Ultra Fast (1-3s)',
    quality: 'Exceptional (State-of-the-Art)',
    description: 'Next-generation 12B parameter rectified flow transformer model offering unmatched prompt adherence and hyper-realistic detail.',
    recommendedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4']
  },
  {
    id: '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    name: 'Stable Diffusion XL (SDXL 1.0)',
    provider: 'Stability AI',
    speed: 'Fast (3-5s)',
    quality: 'High Definition',
    description: 'Flagship open-weights model specialized in photorealism, rich cinematic lighting, and artistic compositions.',
    recommendedAspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:2']
  },
  {
    id: '@cf/bytedance/stable-diffusion-xl-lightning',
    name: 'SDXL Lightning',
    provider: 'ByteDance',
    speed: 'Instant (1-2s)',
    quality: 'High Speed Quality',
    description: 'High-speed progressive adversarial diffusion distilled model optimized for instantaneous 4-step generation.',
    recommendedAspectRatios: ['1:1', '16:9', '9:16']
  },
  {
    id: '@cf/lykon/dreamshaper-8-lcm',
    name: 'DreamShaper 8 LCM',
    provider: 'Lykon',
    speed: 'Instant (1-2s)',
    quality: 'Artistic & Fantasy',
    description: 'Versatile style model tuned for fantasy art, anime aesthetics, concept art, and digital portraits.',
    recommendedAspectRatios: ['1:1', '4:5', '9:16']
  }
];

export async function generateCloudflareImage(
  accountId: string,
  apiToken: string,
  params: CloudflareImageParams
): Promise<{ buffer: Buffer; contentType: string; seed?: number }> {
  if (!accountId || !apiToken) {
    throw new Error('Cloudflare Account ID and API Token are required.');
  }

  const model = params.model || '@cf/black-forest-labs/flux-1-schnell';
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  // Build model-specific payload strictly adhering to Cloudflare Workers AI schema
  let payload: Record<string, any> = {
    prompt: params.prompt,
  };

  const isFlux = model.includes('flux') || model.includes('black-forest-labs');

  if (isFlux) {
    // Cloudflare Workers AI flux-1-schnell only accepts 'prompt' and optionally 'steps' (4-8)
    // Extra properties like width, height, seed, num_steps, guidance cause 400 Bad Input error.
    if (params.steps) {
      payload.steps = Math.min(Math.max(params.steps, 4), 8);
    } else if (params.num_steps) {
      payload.steps = Math.min(Math.max(params.num_steps, 4), 8);
    }
  } else {
    // SDXL / DreamShaper models accept standard SD parameters
    if (params.num_steps) payload.num_steps = Math.min(Math.max(params.num_steps, 1), 20);
    if (params.guidance) payload.guidance = params.guidance;
    if (params.seed !== undefined && params.seed !== null) payload.seed = params.seed;
    if (params.negative_prompt) payload.negative_prompt = params.negative_prompt;
    if (params.width) payload.width = Math.min(Math.max(params.width, 256), 1024);
    if (params.height) payload.height = Math.min(Math.max(params.height, 256), 1024);
  }

  let response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  // Resilient fallback: If Cloudflare rejects extra properties, retry with clean minimal prompt
  if (!response.ok && response.status === 400) {
    const errorText = await response.text().catch(() => '');
    if (
      errorText.includes('Additional or unevaluated properties') ||
      errorText.includes('Bad input') ||
      errorText.includes('schema')
    ) {
      // Retry with stripped minimal prompt payload
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: params.prompt }),
      });
    }
  }

  if (!response.ok) {
    let errorText = await response.text().catch(() => '');
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.errors && errorJson.errors.length > 0) {
        errorText = errorJson.errors.map((e: any) => e.message).join(', ');
      }
    } catch {
      // Use raw text
    }
    throw new Error(`Cloudflare AI API Error (${response.status}): ${errorText || response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || 'image/png';

  // Check if response is raw binary image or JSON with image base64
  if (contentType.includes('application/json')) {
    const json = await response.json() as any;
    if (json.result && json.result.image) {
      const base64Data = json.result.image;
      const buffer = Buffer.from(base64Data, 'base64');
      return { buffer, contentType: 'image/png', seed: params.seed };
    } else if (json.image) {
      const buffer = Buffer.from(json.image, 'base64');
      return { buffer, contentType: 'image/png', seed: params.seed };
    } else {
      throw new Error('Cloudflare AI response did not contain image data in JSON response.');
    }
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return { buffer, contentType, seed: params.seed };
}

// Enhance prompts using Cloudflare Llama 3.1 or Gemini API fallback
export async function enhancePromptWithAI(
  rawPrompt: string,
  cloudflareAccountId?: string,
  cloudflareApiToken?: string
): Promise<string> {
  const systemInstruction = `You are an expert AI prompt engineer for state-of-the-art text-to-image models (FLUX.1, SDXL).
Your task is to take a raw user concept and expand it into a visually stunning, highly descriptive, master-quality image prompt.
Focus on:
1. Exact visual subject, lighting (e.g. volumetric lighting, rim light, golden hour, neon refraction, subsurface scattering)
2. Composition & camera lens (e.g. 85mm f/1.4 lens, dynamic angle, depth of field, wide shot)
3. Artistic style, color palette, atmospheric depth, texture, render engine aesthetics (e.g. Unreal Engine 5, octane render, 8k masterpiece)
4. Do NOT output conversational filler or preamble. Return ONLY the enhanced image prompt string. Keep it under 80 words.`;

  // Try Cloudflare Llama 3.1 first if credentials are provided
  if (cloudflareAccountId && cloudflareApiToken) {
    try {
      const cfLlamaUrl = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`;
      const response = await fetch(cfLlamaUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: `Enhance this image prompt: "${rawPrompt}"` },
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json() as any;
        const enhanced = data.result?.response?.trim();
        if (enhanced && enhanced.length > 5) {
          return enhanced.replace(/^["']|["']$/g, '');
        }
      }
    } catch (err) {
      console.warn('Cloudflare prompt enhancer error, falling back:', err);
    }
  }

  // Fallback to Gemini API if GEMINI_API_KEY is available
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Expand this user prompt for an AI image generator into a rich visual prompt (lighting, composition, textures, colors, 8k quality). Return ONLY the prompt text:\n\nPrompt: ${rawPrompt}`,
      });
      const text = res.text?.trim();
      if (text && text.length > 5) {
        return text.replace(/^["']|["']$/g, '');
      }
    } catch (err) {
      console.warn('Gemini prompt enhancer error:', err);
    }
  }

  // Algorithmic enhancer fallback if no LLM credentials work
  const styles = [
    '8k resolution, photorealistic, cinematic lighting, intricate details, highly detailed textures',
    'masterpiece, octane render, dynamic atmosphere, soft volumetric glow, 35mm photograph',
    'hyper-detailed, award winning photography, sharp focus, vibrant aesthetic, depth of field',
  ];
  const chosen = styles[Math.floor(Math.random() * styles.length)];
  return `${rawPrompt}, ${chosen}`;
}
