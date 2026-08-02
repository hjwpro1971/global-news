export default async function handler(req, res) {
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
