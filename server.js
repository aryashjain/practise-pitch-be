// server.js
import 'dotenv/config';
import app from './app.js';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`🚀 AI Exam Platform Server running on http://localhost:${port}`);
  console.log(`Open API route: POST http://localhost:${port}/api/ai/generate-text`);
});
