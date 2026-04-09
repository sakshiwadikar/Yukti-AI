import { Router } from 'express';
import { generateImage } from '../../controllers/image.controller';
import { validateImageRequest } from '../../middlewares/validateImage';

const router = Router();

router.post('/generate', validateImageRequest, generateImage);

export default router;