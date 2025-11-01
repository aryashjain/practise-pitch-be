import express from 'express';
import { createAuthedSupabaseClient } from './auth-router.js';

const router = express.Router();

// Supabase client reused from auth-router.js

// --- POST / (create a quiz result) ---
// Body: { topic: string, timeMs: number, questions: any, solutions: any }
router.post('/', async (req, res) => {
try {
const user = req.user;
if (!user?.id) {
return res.status(401).json({ status: 'error',
message: 'Unauthorized' });
}

const authHeader = req.headers.authorization;
const token = authHeader?.split(' ')[1];
if (!token) {
return res.status(401).json({ status: 'error',
message: 'Missing bearer token' });
}

const supabase = createAuthedSupabaseClient(token);

const { topic, timeMs, questions, solutions } = req.body
?? {};

if (!topic || typeof topic !== 'string') {
return res.status(400).json({ status: 'error',
message: "Field 'topic' is required" });
}

const safeTimeMs = Number.isFinite(Number(timeMs)) ?
Number(timeMs) : 0;

const row = {
user_id: user.id,
topic,
time_ms: safeTimeMs,
questions, // JSONB in DB
solutions, // JSONB in DB
};

const { data, error } = await supabase
.from('quiz_results')
.insert(row)
.select('id, topic, created_at')
.single();

if (error) {
return res.status(500).json({ status: 'error',
message: 'Failed to save result', details: error.message });
}

return res.json({ status: 'success', data });
} catch (err) {
return res.status(500).json({ status: 'error', message:
'Unexpected error saving result' });
}
});

// --- GET / (list current user's results) ---
router.get('/', async (req, res) => {
try {

const user = req.user;
if (!user?.id) {
return res.status(401).json({ status: 'error',
message: 'Unauthorized' });
}

const authHeader = req.headers.authorization;
const token = authHeader?.split(' ')[1];
if (!token) {
return res.status(401).json({ status: 'error',
message: 'Missing bearer token' });
}

const supabase = createAuthedSupabaseClient(token);

// Pagination: latest first, default 5
const rawLimit = Number(req.query.limit);
const rawPage = Number(req.query.page);
const limit = Number.isFinite(rawLimit) && rawLimit > 0 ?
Math.min(Math.floor(rawLimit), 50) : 5;
const page = Number.isFinite(rawPage) && rawPage > 0 ?
Math.floor(rawPage) : 0;
const from = page * limit;
const to = from + limit - 1;

const { data, error, count } = await supabase
.from('quiz_results')
.select('id, topic, created_at', { count: 'exact' })
.eq('user_id', user.id)
.order('created_at', { ascending: false })
.range(from, to);

if (error) {
return res.status(500).json({ status: 'error',
message: 'Failed to fetch results', details: error.message });
}

const total = typeof count === 'number' ? count :
undefined;
const hasMore = typeof total === 'number' ? to + 1 <
total : (data?.length === limit);
return res.json({ status: 'success', data, meta: { page,
limit, total, hasMore } });
} catch (err) {
return res.status(500).json({ status: 'error', message:
'Unexpected error fetching results' });
}
});

export default router;

// --- GET /:id (fetch details for a specific test) ---
router.get('/:id', async (req, res) => {
try {
const user = req.user;
if (!user?.id) {
return res.status(401).json({ status: 'error',
message: 'Unauthorized' });
}

const authHeader = req.headers.authorization;
const token = authHeader?.split(' ')[1];

if (!token) {
return res.status(401).json({ status: 'error',
message: 'Missing bearer token' });
}

const supabase = createAuthedSupabaseClient(token);
const testId = req.params.id;

const { data, error } = await supabase
.from('quiz_results')
.select('id, topic, time_ms, questions, solutions, created_at')
.eq('id', testId)
.eq('user_id', user.id)
.single();

if (error) {
if (error.code === 'PGRST116') { // No rows found
return res.status(404).json({ status: 'error',
message: 'Result not found' });
}
return res.status(500).json({ status: 'error',
message: 'Failed to fetch result', details: error.message });
}

return res.json({ status: 'success', data });
} catch (err) {
return res.status(500).json({ status: 'error', message:
'Unexpected error fetching result' });
}
});