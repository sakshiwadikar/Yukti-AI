import { Request, Response, NextFunction } from 'express';

export const validateImageRequest = (req: Request, res: Response, next: NextFunction) => {
  const { prompt } = req.body;
  
  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'A valid text prompt is explicitly required to generate an image.' });
  }
  
  next();
};
