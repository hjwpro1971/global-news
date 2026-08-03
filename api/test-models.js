export default async function handler(req, res) {
    // Debug-only endpoint - hidden behind an admin token; leaks which Gemini
    // models this account can access, not something to expose publicly.
    if (!process.env.ADMIN_DEBUG_TOKEN || req.query.admin_token !== process.env.ADMIN_DEBUG_TOKEN) {
        return res.status(404).json({ error: 'Not Found' });
    }

    try {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
        const data = await response.json();
        const models = data.models ? data.models.map(m => m.name) : data;
        res.status(200).json({ models });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
