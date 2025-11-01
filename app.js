import express from 'express';
import aiRouter from './routes/ai-router.js';
import authRouter, { authMiddleware } from
'./routes/auth-router.js';
import resultsRouter from './routes/results-router.js';

const app = express();

// Middleware
app.use(express.json());

// CORS for local frontend on Vite (http://localhost:5173)
app.use((req, res, next) => {
res.header('Access-Control-Allow-Origin',
'*');
res.header('Access-Control-Allow-Methods',
'GET,POST,PUT,PATCH,OPTIONS');
res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
res.header('Access-Control-Allow-Credentials', 'true');
if (req.method === 'OPTIONS') {
return res.sendStatus(204);
}
next();
});

// Routes
app.use('/api', authRouter); // /api/public, /api/protected
app.use('/api/ai', authMiddleware, aiRouter);
app.use('/api/results', authMiddleware, resultsRouter);
export default app; // ✅ export the app