import { Router } from 'express';
import authRoutes from './auth';
import chatRoutes from './chat';
import imageRoutes from './image';
import codeRoutes from './code';
import solverRoutes from './solverRoutes';
import writingRoutes from './writingRoutes';
import brainstormRoutes from './brainstorm';

const router = Router();

router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/images', imageRoutes);
router.use('/code', codeRoutes);
router.use('/solver', solverRoutes);
router.use('/writing', writingRoutes);
router.use('/brainstorm', brainstormRoutes);

export default router;
