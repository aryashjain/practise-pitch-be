import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// --- Supabase Initialization ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
console.error('FATAL ERROR: Supabase URL and Anon Key are not set.');
console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY in your environment (.env).');
}

export const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '');
export const createAuthedSupabaseClient = (token) => {
    return createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '', {
        global: {
            headers: { Authorization: `Bearer ${token}` }
        }
    });
};
const DEV_BYPASS_TOKEN = process.env.DEV_BYPASS_TOKEN; // optional, for local dev only

// --- Auth Middleware ---
export const authMiddleware = async (req, res, next) => {
const authHeader = req.headers.authorization;
if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header provided' });
}

const token = authHeader.split(' ')[1];
if (!token) {
return res.status(401).json({ error: 'Malformed authorization header' });
}

try {
// Dev bypass (optional): if DEV_BYPASS_TOKEN is set and matches, allow
if (DEV_BYPASS_TOKEN && token === DEV_BYPASS_TOKEN) {
req.user = { id: 'dev-bypass', email:
'dev@example.com', aud: 'authenticated' };
return next();
}

const { data: { user }, error } = await
supabase.auth.getUser(token);
if (error) {
return res.status(401).json({ error: 'Invalid token',
details: error.message });
}
if (!user) {
return res.status(401).json({ error: 'No user found for this token' });
}

req.user = user;
next();
} catch (err) {
    console.log("Auth Middleware Error:", err.message);
return res.status(500).json({ error: 'Internal server error during auth' });
}
};

// --- Routes ---
router.get('/public', (req, res) => {
res.json({ message: 'This is a public route. Anyone can see this!' });
});

router.get('/protected', authMiddleware, (req, res) => {
res.json({
message: `Hello, ${req.user.email}! You have accessed a
protected route.`,
userId: req.user.id,
aud: req.user.aud
});
});

export default router;