import { Router } from 'express';
import { solveProblem } from '../controllers/solver.controller';

const router = Router();

router.post('/solve', solveProblem);

export default router;
