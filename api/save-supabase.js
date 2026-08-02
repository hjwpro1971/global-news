export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { payload } = req.body;
        
        if (!payload || !Array.isArray(payload)) {
            return res.status(400).json({ error: 'Invalid payload format' });
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Server is missing Supabase Environment Variables' });
        }

        // 1. Cleanup old data (older than 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        try {
            await fetch(`${supabaseUrl}/rest/v1/news_impacts?created_at=lt.${sevenDaysAgo.toISOString()}`, {
                method: 'DELETE',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
        } catch (e) {
            console.error('[Supabase Cleanup Error]', e);
        }

        // 2. Insert new data
        const resp = await fetch(`${supabaseUrl}/rest/v1/news_impacts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(payload)
        });
        
        if (resp.ok) {
            return res.status(200).json({ success: true, count: payload.length });
        } else {
            const errorText = await resp.text();
            return res.status(resp.status).json({ error: errorText });
        }
    } catch (error) {
        console.error('[Supabase Save Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
