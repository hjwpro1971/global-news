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

        // Fetch up to 7 days of data
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const queryParams = new URLSearchParams({
            select: 'created_at, impact_score',
            order: 'created_at.asc',
            'created_at': `gte.${sevenDaysAgo.toISOString()}`
        });

        const resp = await fetch(`${supabaseUrl}/rest/v1/news_impacts?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
        
        if (resp.ok) {
            const data = await resp.json();
            
            // Group by date (MM/DD) and calculate average impact score
            const dailyData = {};
            
            data.forEach(item => {
                if (!item.created_at || item.impact_score === undefined) return;
                
                const dateObj = new Date(item.created_at);
                const dateStr = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;
                
                if (!dailyData[dateStr]) {
                    dailyData[dateStr] = { sum: 0, count: 0 };
                }
                dailyData[dateStr].sum += item.impact_score;
                dailyData[dateStr].count += 1;
            });
            
            const trend = Object.keys(dailyData).map(date => {
                return {
                    date: date,
                    avgScore: Math.round(dailyData[date].sum / dailyData[date].count)
                };
            });
            
            return res.status(200).json({ success: true, trend });
        } else {
            const errorText = await resp.text();
            return res.status(resp.status).json({ error: errorText });
        }
    } catch (error) {
        console.error('[Trend Data Fetch Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
