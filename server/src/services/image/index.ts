import axios from 'axios';
import { InferenceClient } from '@huggingface/inference';

interface GenerateImageInput {
  prompt: string;
  style?: string;
  size?: string;
}

const sizeMap: Record<string, string> = {
  '1024x1024': '1024x1024',
  '16:9 (1920x1080)': '1920x1080',
  '9:16 (1080x1920)': '1080x1920'
};

const getDimensions = (size?: string): { width: number; height: number } => {
  const normalized = sizeMap[size || ''] || '1024x1024';
  const [width, height] = normalized.split('x').map((value) => Number(value));

  return {
    width: Number.isFinite(width) ? width : 1024,
    height: Number.isFinite(height) ? height : 1024
  };
};

const buildPrompt = (prompt: string, style?: string): string => {
  if (!style) {
    return prompt;
  }

  return `${prompt}, ${style} style, highly detailed`;
};

export const generateImageFromPrompt = async ({ prompt, style, size }: GenerateImageInput): Promise<string> => {
  const apiKey = process.env.HUGGINGFACE_API_KEY;

  const { width, height } = getDimensions(size);
  const finalPrompt = buildPrompt(prompt, style);

  if (apiKey) {
    try {
      const client = new InferenceClient(apiKey);
      const imageOutput = await client.textToImage({
        model: 'black-forest-labs/FLUX.1-dev',
        inputs: finalPrompt,
        parameters: {
          width,
          height
        }
      });

      if (typeof imageOutput === 'string') {
        return imageOutput.startsWith('data:') ? imageOutput : `data:image/png;base64,${imageOutput}`;
      }

      if (imageOutput && typeof (imageOutput as Blob).arrayBuffer === 'function') {
        const imageBuffer = Buffer.from(await (imageOutput as Blob).arrayBuffer());
        return `data:image/png;base64,${imageBuffer.toString('base64')}`;
      }

      throw new Error('Unexpected Hugging Face image response format');
    } catch (hfError) {
      console.error('Hugging Face image generation failed, trying fallback provider:', hfError);
    }
  }

  const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=${width}&height=${height}&model=flux&nologo=true`;
  const fallbackResponse = await axios.get<ArrayBuffer>(fallbackUrl, {
    responseType: 'arraybuffer',
    headers: {
      Accept: 'image/*'
    }
  });

  const fallbackBuffer = Buffer.from(fallbackResponse.data);
  return `data:image/png;base64,${fallbackBuffer.toString('base64')}`;
};
