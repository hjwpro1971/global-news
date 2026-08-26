import { LIST_SIZE } from './_lib/newsAnalysis.js';

// Returns today's screening/categorization output (news_shortlist) - the pipeline's
// "list" stage, saved independently of whether deep analysis (news_impacts) ran.
//
// [2026-08-26] Was filtered by a KST-midnight "today" window, sorted by
// headline_frequency_score.desc across the WHOLE window. Observed directly: a run from
// 21:00 the previous day and two runs from earlier today (03:48, 09:13) all fell inside
// that one window and competed on score together - yesterday's higher-scoring stories
// (336, 327, 296...) filled most of the 20 slots, crowding out this morning's freshly
// collected articles. From the button-clicker's perspective this looked exactly like
// "collection isn't happening" even though every run had saved correctly.
// Now: find the single most recent saved batch (its created_at, which is identical
// across every row from the same run) and show only that batch, sorted by score WITHIN
// it. A fresh run is never diluted by however many older runs also happened today.
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

        const latestParams = new URLSearchParams({ select: 'created_at', order: 'created_at.desc', limit: '1' });
        const latestResp = await fetch(`${supabaseUrl}/rest/v1/news_shortlist?${latestParams.toString()}`, { headers });
        if (!latestResp.ok) {
            const errorText = await latestResp.text();
            return res.status(latestResp.status).json({ error: errorText });
        }
        const latestRows = await latestResp.json();
        if (!latestRows || latestRows.length === 0) {
            return res.status(200).json({ success: true, hasList: false, isStale: false, data: [] });
        }
        const latestCreatedAt = latestRows[0].created_at;

        const batchParams = new URLSearchParams({
            select: '*',
            order: 'headline_frequency_score.desc',
            // [2026-08-13] Was hardcoded to 12, silently truncating a full 20-item
            // shortlist (LIST_SIZE) below what screenArticles() actually saved -
            // looked like "screening still isn't reaching 20" when the real cause was
            // this display-layer cap. Track LIST_SIZE directly so the two can't drift.
            limit: String(LIST_SIZE),
            'created_at': `eq.${latestCreatedAt}`
        });
        const batchResp = await fetch(`${supabaseUrl}/rest/v1/news_shortlist?${batchParams.toString()}`, { headers });
        if (!batchResp.ok) {
            const errorText = await batchResp.text();
            return res.status(batchResp.status).json({ error: errorText });
        }
        const batchData = await batchResp.json();

        // isStale means "this is the latest we have, but it's from a while ago" - the
        // frontend uses this to show a "showing older data" hint. A batch counts as
        // stale if it's more than a day old, regardless of KST calendar boundaries.
        const ageMs = Date.now() - new Date(latestCreatedAt).getTime();
        const isStale = ageMs > 24 * 60 * 60 * 1000;

        return res.status(200).json({ success: true, hasList: batchData.length > 0, isStale, data: batchData });
    } catch (error) {
        console.error('[Shortlist Fetch Error]', error);
        return res.status(500).json({ error: error.message });
    }
}
