// app.js
import express from 'express';
import aiRouter from './routes/ai-router.js';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/api/ai', aiRouter);

export default app; // ✅ export the app
