import { Request, Response } from 'express';
import { generateImageFromPrompt } from '../services/image';

export const generateImage = async (req: Request, res: Response) => {
  const { prompt, style, dimension } = req.body;

  try {
    const image = await generateImageFromPrompt({
      prompt,
      style,
      size: dimension
    });

    return res.json({
      image
    });
  } catch (error: any) {
    const providerError = error?.response?.data?.error;
    const message = providerError || error.message || 'Failed to generate image';

    return res.status(500).json({ error: message });
  }
};
