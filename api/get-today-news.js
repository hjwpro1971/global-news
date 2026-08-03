const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// Returns [startOfTodayUTC, endOfTodayUTC] as ISO strings for "today" in KST,
// expressed as UTC instants (published_at is stored as a UTC timestamptz).
function kstTodayRangeUtc() {
    const nowKst = new Date(Date.now() + KST_OFFSET_MS);
    const y = nowKst.getUTCFullYear();
    const m = nowKst.getUTCMonth();
    const d = nowKst.getUTCDate();
    const startUtc = new Date(Date.UTC(y, m, d, 0, 0, 0) - KST_OFFSET_MS);
    const endUtc = new Date(Date.UTC(y, m, d + 1, 0, 0, 0) - KST_OFFSET_MS);
    return [startUtc.toISOString(), endUtc.toISOString()];
}

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

        const headers = {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        };

        const [startIso, endIso] = kstTodayRangeUtc();
        const todayParams = new URLSearchParams({
            select: '*',
            order: 'id.desc',
            limit: '10',
            'published_at': `gte.${startIso}`
        });
        // published_at upper bound as a second query param with the same key isn't
        // supported by URLSearchParams directly, so append it manually.
        const todayUrl = `${supabaseUrl}/rest/v1/news_impacts?${todayParams.toString()}&published_at=lt.${encodeURIComponent(endIso)}`;

        const todayResp = await fetch(todayUrl, { headers });
        if (!todayResp.ok) {
            const errorText = await todayResp.text();
            return res.status(todayResp.status).json({ error: errorText });
        }

        const todayData = await todayResp.json();
        if (todayData && todayData.length > 0) {
            return res.status(200).json({ success: true, hasNews: true, isStale: false, data: todayData });
        }

        // No news published today (KST) yet - fall back to the latest available
        // records so the UI isn't empty, but flag it so the frontend can say so.
        const fallbackParams = new URLSearchParams({ select: '*', order: 'id.desc', limit: '10' });
        const fallbackResp = await fetch(`${supabaseUrl}/rest/v1/news_impacts?${fallbackParams.toString()}`, { headers });
        if (!fallbackResp.ok) {
            const errorText = await fallbackResp.text();
            return res.status(fallbackResp.status).json({ error: errorText });
        }
        const fallbackData = await fallbackResp.json();

        return res.status(200).json({
            success: true,
            hasNews: fallbackData.length > 0,
            isStale: fallbackData.length > 0,
            data: fallbackData
        });
    } catch (error) {
        console.error('[Supabase Fetch Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
