export default async function handler(req, res) {
    try {
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        const proResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }],
                generationConfig: { temperature: 0.2 }
            })
        });

        if (!proResponse.ok) {
            const errBody = await proResponse.text();
            throw new Error(`Gemini Pro API Error: ${proResponse.status} ${errBody}`);
        }
        
        const data = await proResponse.json();
        res.status(200).json({ success: true, text: data.candidates[0].content.parts[0].text });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
