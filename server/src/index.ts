import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { serverEnv } from './config/env';

import apiRoutes from './routes';
import chatRoutes from './routes/chat';
import conversationRoutes from './routes/conversations';
import codeRoutes from './routes/code';
import solverRoutes from './routes/solverRoutes';
import writingRoutes from './routes/writingRoutes';

const app = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

app.use(cors());

// 2. Body Parsing Middleware
app.use(express.json());

// 3. Route Registration
app.use('/api/v1', apiRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/code', codeRoutes);
app.use('/api/solver', solverRoutes);
app.use('/api/writing', writingRoutes);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Yukti AI Backend is running' });
});

// 4. Error Handling Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err.stack || err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = serverEnv.PORT;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
