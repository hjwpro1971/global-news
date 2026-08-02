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

        // Fetch most recent top 10 impactful articles
        const queryParams = new URLSearchParams({
            select: '*',
            order: 'id.desc',
            limit: '10'
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
