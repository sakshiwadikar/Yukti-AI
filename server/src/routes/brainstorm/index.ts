import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { verifyToken, type AuthPayload } from '../../services/auth';
import {
  buildSourceFromInput,
  generateBrainstormResult,
  getHistoryById,
  getUserBrainstormHistory,
  regenerateSingleSection,
  saveBrainstormHistory,
  type BrainstormSectionKey,
  type Difficulty,
  type StudyMode
} from '../../services/brainstorm';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024,
    files: 1
  }
});

const ALLOWED_FILE_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]);

const ALLOWED_DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];
const ALLOWED_STUDY_MODES: StudyMode[] = ['Quick Revision Mode', 'Practice Mode', 'Challenge Mode'];
const ALLOWED_SECTIONS: BrainstormSectionKey[] = [
  'cueCards',
  'mcqQuiz',
  'fillInTheBlanks',
  'matchThePairs',
  'trueFalse',
  'riddleBasedLearning'
];

interface AuthedRequest extends Request {
  authUser?: AuthPayload;
}

const authMiddleware = (req: AuthedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authorization token is required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }

  req.authUser = decoded;
  next();
};

router.use(authMiddleware);

router.get('/history', async (req: AuthedRequest, res: Response) => {
  try {
    const history = await getUserBrainstormHistory(req.authUser!.id);
    return res.status(200).json({ success: true, history });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch brainstorm history' });
  }
});

router.post('/generate', upload.single('file'), async (req: AuthedRequest, res: Response) => {
  const file = req.file;

  if (file && !ALLOWED_FILE_TYPES.has(file.mimetype)) {
    return res.status(400).json({ success: false, error: `Unsupported file type: ${file.mimetype}` });
  }

  const topic = (req.body?.topic || '').toString();
  const pastedContent = (req.body?.pastedContent || '').toString();
  const difficulty = (req.body?.difficulty || '').toString() as Difficulty;
  const studyMode = (req.body?.studyMode || '').toString() as StudyMode;

  if (!ALLOWED_DIFFICULTIES.includes(difficulty)) {
    return res.status(400).json({ success: false, error: 'difficulty must be one of Easy, Medium, Hard' });
  }

  if (!ALLOWED_STUDY_MODES.includes(studyMode)) {
    return res.status(400).json({ success: false, error: 'studyMode must be Quick Revision Mode, Practice Mode, or Challenge Mode' });
  }

  try {
    const source = await buildSourceFromInput({ topic, pastedContent, file });
    const result = await generateBrainstormResult({
      sourceText: source.sourceText,
      topic: source.topic,
      difficulty,
      studyMode
    });

    const record = await saveBrainstormHistory({
      userId: req.authUser!.id,
      topic: source.topic,
      difficulty,
      studyMode,
      sourceType: source.sourceType,
      sourceText: source.sourceText,
      result
    });

    return res.status(200).json({
      success: true,
      brainstorm: record
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to generate brainstorm' });
  }
});

router.post('/regenerate-section', async (req: AuthedRequest, res: Response) => {
  const brainstormId = (req.body?.brainstormId || '').toString();
  const section = (req.body?.section || '').toString() as BrainstormSectionKey;

  if (!brainstormId) {
    return res.status(400).json({ success: false, error: 'brainstormId is required' });
  }

  if (!ALLOWED_SECTIONS.includes(section)) {
    return res.status(400).json({ success: false, error: 'Invalid section key' });
  }

  try {
    const record = await getHistoryById(brainstormId, req.authUser!.id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Brainstorm record not found for this user' });
    }

    const updated = await regenerateSingleSection({
      historyRecord: record,
      section
    });

    return res.status(200).json({ success: true, brainstorm: updated, section });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Failed to regenerate section' });
  }
});

export default router;
