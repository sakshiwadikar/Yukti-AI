import { Router } from 'express';
import { generateWriting } from '../controllers/writing.controller';

const router = Router();

router.post('/generate', generateWriting);

export default router;
