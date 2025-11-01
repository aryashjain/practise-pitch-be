import express from 'express';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running and healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
