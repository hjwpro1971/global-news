export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Server is missing Supabase Environment Variables' });
        }

        // Calculate timestamp for 12 hours ago
        const twelveHoursAgo = new Date();
        twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);
        
        // Fetch up to 20 articles from the last 12 hours, ordered by most recent
        const queryParams = new URLSearchParams({
            select: '*',
            order: 'created_at.desc',
            limit: '20',
            'created_at': `gte.${twelveHoursAgo.toISOString()}`
        });

        const resp = await fetch(`${supabaseUrl}/rest/v1/news_impacts?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (!resp.ok) {
            const errorText = await resp.text();
            return res.status(resp.status).json({ error: errorText });
        }
        
        const data = await resp.json();
        
        if (data && data.length > 0) {
            return res.status(200).json({ success: true, hasNews: true, data: data });
        } else {
            return res.status(200).json({ success: true, hasNews: false, data: [] });
        }
    } catch (error) {
        console.error('[Supabase Fetch Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
