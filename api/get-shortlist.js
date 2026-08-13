import { LIST_SIZE } from './_lib/newsAnalysis.js';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// Returns [startOfTodayUTC, endOfTodayUTC] as ISO strings for "today" in KST,
// expressed as UTC instants (created_at is stored as a UTC timestamptz).
function kstTodayRangeUtc() {
    const nowKst = new Date(Date.now() + KST_OFFSET_MS);
    const y = nowKst.getUTCFullYear();
    const m = nowKst.getUTCMonth();
    const d = nowKst.getUTCDate();
    const startUtc = new Date(Date.UTC(y, m, d, 0, 0, 0) - KST_OFFSET_MS);
    const endUtc = new Date(Date.UTC(y, m, d + 1, 0, 0, 0) - KST_OFFSET_MS);
    return [startUtc.toISOString(), endUtc.toISOString()];
}

// Returns today's screening/categorization output (news_shortlist) - the pipeline's
// "list" stage, saved independently of whether deep analysis (news_impacts) ran.
// Same created_at/KST-day/fallback pattern as get-today-news.js.
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
            // [2026-08-13] Was hardcoded to 12, silently truncating a full 20-item
            // shortlist (LIST_SIZE) below what screenArticles() actually saved -
            // looked like "screening still isn't reaching 20" when the real cause was
            // this display-layer cap. Track LIST_SIZE directly so the two can't drift.
            limit: String(LIST_SIZE),
            'created_at': `gte.${startIso}`
        });
        const todayUrl = `${supabaseUrl}/rest/v1/news_shortlist?${todayParams.toString()}&created_at=lt.${encodeURIComponent(endIso)}`;

        const todayResp = await fetch(todayUrl, { headers });
        if (!todayResp.ok) {
            const errorText = await todayResp.text();
            return res.status(todayResp.status).json({ error: errorText });
        }

        const todayData = await todayResp.json();
        if (todayData && todayData.length > 0) {
            return res.status(200).json({ success: true, hasList: true, isStale: false, data: todayData });
        }

        const fallbackParams = new URLSearchParams({ select: '*', order: 'id.desc', limit: String(LIST_SIZE) });
        const fallbackResp = await fetch(`${supabaseUrl}/rest/v1/news_shortlist?${fallbackParams.toString()}`, { headers });
        if (!fallbackResp.ok) {
            const errorText = await fallbackResp.text();
            return res.status(fallbackResp.status).json({ error: errorText });
        }
        const fallbackData = await fallbackResp.json();

        return res.status(200).json({
            success: true,
            hasList: fallbackData.length > 0,
            isStale: fallbackData.length > 0,
            data: fallbackData
        });
    } catch (error) {
        console.error('[Shortlist Fetch Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
