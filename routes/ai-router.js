import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai'; // <-- This line is now fixed

const router = express.Router();

// --- Gemini Initialization ---
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("FATAL: GEMINI_API_KEY is not set.");
    // In a real app, you might want to throw an error 
    // to prevent the server from running without the key.
}

const ai = new GoogleGenerativeAI(apiKey);
const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" }); // Using the FAST model

/**
 * @route GET /api/ai/health
 * @description A simple endpoint for keep-alive services (like UptimeRobot)
 * to prevent the server from sleeping on free tiers.
 */
router.get('/health', (req, res) => {
    res.status(200).json({ 
        status: "ok", 
        message: "Server is awake." 
    });
});

/**
 * @route POST /api/ai/generate-questions
 * @description Generates exam questions based on a structured JSON payload.
 * @body {
 * "exam": "UPSC",
 * "q_no": 5,
 * "difficulty": "Medium",
 * "topic": "Indian Monsoon",
 * "questionType": "MCQ" | "Subjective"
 * }
 */
router.post('/generate-questions', async (req, res) => {
    try {
        // 1. Extract and validate structured input from the client
        const { 
            exam, 
            q_no = 5, // Default to 5 questions
            difficulty = "medium", 
            topic, 
            questionType = "MCQ" // Default to MCQ
        } = req.body;

        if (!exam || !topic) {
            return res.status(400).json({ 
                status: "error", 
                message: "Missing required fields: 'exam' and 'topic' are required." 
            });
        }

        // 2. Build the dynamic prompt for Gemini
        
        // Base instructions for the AI
        const basePrompt = `You are an expert AI exam assistant. Your task is to generate ${q_no} ${exam}-style questions on the topic of ${topic}. The difficulty must be ${difficulty}. The questions should be relevant and mimic the style of previous years' questions.`;
        
        let formatInstructions;

        // Dynamically set the format instructions based on questionType
        if (questionType.toUpperCase() === 'MCQ') {
            formatInstructions = `You MUST return ONLY a single-line, minified JSON string. Do not use any newline characters like \\n or tab characters like \\t. Do not use any escaping backslashes. The required format is: { "questionType" : "MCQ", "QuestionArray" :[ { "No": 1, "Q": "Question text...", "Options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"] }, { "No": 2, ... } ], "AnswerArray" : ["Correct answer for Q1", "Correct answer for Q2", ...] }`;
        } else { // Default to Subjective
            formatInstructions = `You MUST generate Subjective (long answer) questions. You MUST return ONLY a single-line, minified JSON string. Do not use any newline characters like \\n or tab characters like \\t. Do not use any escaping backslashes. The required format is: { "questionType": "Subjective", "QuestionArray": ["Question 1 text...", "Question 2 text..."] }`;
        }

        const finalPrompt = `${basePrompt} ${formatInstructions}`;

        // 3. Call the Gemini API
        const result = await model.generateContent(finalPrompt);
        const response = await result.response;
        const rawText = response.text();

        // 4. --- NEW: Convert raw text to JSON on the server ---
        let jsonResponse;
        try {
            // Clean the text: remove whitespace and markdown backticks
            let cleanedText = rawText.trim();
            if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.replace(/^```json?/, '').replace(/```$/, '');
            }
            
            jsonResponse = JSON.parse(cleanedText);

        } catch (err) {
            console.error("Failed to parse JSON from Gemini:", err);
            console.error("Raw text was:", rawText); // Log the problematic text
            // Send a structured error, but still with a 200 OK
            // so the frontend can handle this as a "failed generation"
            return res.status(200).json({ 
                status: "error",
                message: "Failed to parse AI response.",
                data: { error: "Malformed AI response", rawText: rawText }
            });
        }

        // 5. --- NEW: Send proper JSON to frontend ---
        res.json({
            status: "success",
            data: jsonResponse
        });

    } catch (error) {
        console.error("Error in /generate-questions:", error.message);
        res.status(500).json({ 
            status: "error", 
            message: "Failed to generate questions.",
            details: error.message 
        });
    }
});

// We keep the old endpoint for simple text generation if you still need it
router.post('/generate-text', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({
                status: "error",
                message: "Missing 'prompt' in request body."
            });
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        res.status(200).json({
            status: "success",
            generatedText: text
        });

    } catch (error) {
        console.error("Error in /generate-text:", error.message);
        res.status(500).json({
            status: "error",
            message: "Failed to generate text.",
            details: error.message
        });
    }
});

export default router;

