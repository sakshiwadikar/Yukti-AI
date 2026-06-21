import { Router } from 'express';
import { generateImage, imageHealthCheck } from '../../controllers/image.controller';
import { validateImageRequest } from '../../middlewares/validateImage';

const router = Router();

router.post('/generate', validateImageRequest, generateImage);
router.get('/health', imageHealthCheck);

export default router;