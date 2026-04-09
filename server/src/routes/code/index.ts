import { Router } from 'express';
import { generateCode } from '../../controllers/code.controller';

const router = Router();

router.post('/generate-code', generateCode);

export default router;
