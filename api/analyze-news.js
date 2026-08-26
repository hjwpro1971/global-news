import {
    rankByHeadlineFrequency, screenArticles, translateTitlesToKorean, saveShortlist, selectTopForDeepAnalysis,
    deepAnalyzeArticles, reconcileSentiment,
    purgeOldNews, insertNews, acquireAnalysisLock, releaseAnalysisLock
} from './_lib/newsAnalysis.js';

export const maxDuration = 60;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-supabase-url, x-supabase-key');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY environment variable. Please configure it in Vercel.' });
    }

    // Lock uses the server's own Supabase credentials (not a user-supplied override) so
    // a manual trigger and the scheduled cron - which always use the env credentials -
    // actually contend on the same lock row.
    const lockSupabaseUrl = process.env.SUPABASE_URL;
    const lockSupabaseKey = process.env.SUPABASE_KEY;
    let lockAcquired = false;

    try {
        if (lockSupabaseUrl && lockSupabaseKey) {
            lockAcquired = await acquireAnalysisLock(lockSupabaseUrl, lockSupabaseKey);
            if (!lockAcquired) {
                return res.status(409).json({ error: 'Another analysis run is already in progress. Please try again shortly.' });
            }
        }

        const { articles } = req.body;

        if (!articles || !Array.isArray(articles)) {
            return res.status(400).json({ error: 'Invalid input. Expected an array of articles.' });
        }

        // Local, zero-cost pre-filter before spending any Gemini tokens.
        const candidates = rankByHeadlineFrequency(articles);

        // STEP 1: Screening + categorization - produces the "list", saved before any
        // deep-analysis call (same structure as cron-update-news.js).
        const shortlist = await screenArticles(candidates, GEMINI_API_KEY);

        if (shortlist.length === 0) {
            return res.status(200).json({ success: true, dataset: [] });
        }

        // [2026-08-14] Same separate translation pass as cron-update-news.js - see
        // translateTitlesToKorean's comment for why this is kept out of screenArticles'
        // structured JSON schema call.
        const translatedTitles = await translateTitlesToKorean(shortlist.map(a => a.title), GEMINI_API_KEY);
        shortlist.forEach((a, i) => { a.titleKr = translatedTitles[i]; });

        const supabaseUrlForShortlist = req.headers['x-supabase-url'] || process.env.SUPABASE_URL;
        const supabaseKeyForShortlist = req.headers['x-supabase-key'] || process.env.SUPABASE_KEY;
        // [2026-08-27] Was previously fire-and-forget: a failed shortlistResp only logged
        // server-side (console.error, invisible to whoever clicked the button) while the
        // response body unconditionally said "Shortlist saved" regardless of what actually
        // happened - observed directly: analyze-news returned success with that message,
        // but get-shortlist kept showing a multi-day-old batch, meaning the save silently
        // failed with no way for the caller to tell. Track the real outcome and surface it.
        let shortlistSaveError = null;
        if (supabaseUrlForShortlist && supabaseKeyForShortlist) {
            try {
                const shortlistResp = await saveShortlist(supabaseUrlForShortlist, supabaseKeyForShortlist, shortlist);
                if (!shortlistResp.ok) {
                    shortlistSaveError = await shortlistResp.text();
                    console.error('[Shortlist Save Error]', shortlistSaveError);
                }
            } catch (saveErr) {
                shortlistSaveError = saveErr.message;
                console.error('[Shortlist Save Error]', saveErr);
            }
        } else {
            shortlistSaveError = 'Supabase URL/Key missing';
        }

        // [2026-08-12] Deep analysis paused at user request - see cron-update-news.js
        // for the full reasoning, including why this is opt-in (!== 'true') rather than
        // opt-out. Shortlist above already saved, so screening/collection quality review
        // can continue without spending Gemini Pro deep-analysis cost.
        if (process.env.DEEP_ANALYSIS_ENABLED !== 'true') {
            return res.status(200).json({
                success: true,
                dataset: [],
                message: shortlistSaveError
                    ? `Deep analysis is paused (set DEEP_ANALYSIS_ENABLED=true to resume). Shortlist save FAILED: ${shortlistSaveError}`
                    : 'Deep analysis is paused (set DEEP_ANALYSIS_ENABLED=true to resume). Shortlist saved.',
                shortlistSaveError
            });
        }

        // STEP 2: Deep analysis - only the top N of the shortlist, capped per category.
        const selectedArticles = selectTopForDeepAnalysis(shortlist);
        // Screening-stage category by originalId - re-applied below regardless of what
        // Gemini echoes back during deep analysis (see cron-update-news.js for why).
        const screeningCategoryById = new Map(selectedArticles.map(a => [a.originalId, a.category]));
        const analyzedData = await deepAnalyzeArticles(selectedArticles, GEMINI_API_KEY);

        // Merge original article URLs and Dates back into the selected articles
        const finalDataset = analyzedData.map((item, idx) => {
            const originalArticle = articles[item.originalId];

            let timestamp = originalArticle?.pubDate;
            if (timestamp) {
                const dateObj = new Date(timestamp);
                if (!isNaN(dateObj.getTime())) {
                    const yyyy = dateObj.getFullYear();
                    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const dd = String(dateObj.getDate()).padStart(2, '0');
                    const hh = String(dateObj.getHours()).padStart(2, '0');
                    const min = String(dateObj.getMinutes()).padStart(2, '0');
                    timestamp = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
                }
            }

            const sentiment = reconcileSentiment(item.sentiment, item.phase2DeepAnalysis?.targetStocks);

            return {
                id: `news-${idx + 1}`,
                titleKr: item.titleKr,
                titleEn: originalArticle?.title || "",
                url: originalArticle?.link || "",
                source: originalArticle?.source || "Global News",
                timestamp: timestamp || new Date().toISOString(),
                category: screeningCategoryById.get(item.originalId) || item.category || "글로벌 매크로",
                impactScore: (sentiment === "BEARISH" ? -1 : 1) * Math.abs(item.impactScore || 50),
                scoreReason: item.scoreReason || '',
                sentiment: sentiment,
                summary: item.summary || "",
                phase1Filtering: { passed: true, matchKeywords: [], priorityScore: 90 },
                phase2DeepAnalysis: item.phase2DeepAnalysis || { targetStocks: [] }
            };
        });

        // ==========================================
        // Supabase Data Insertion
        // ==========================================
        const supabaseUrl = supabaseUrlForShortlist;
        const supabaseKey = supabaseKeyForShortlist;

        if (supabaseUrl && supabaseKey) {
            try {
                const supabasePayload = finalDataset.map(item => ({
                    title: item.titleKr,
                    original_title: item.titleEn,
                    summary: item.summary,
                    source: item.source,
                    published_at: item.timestamp,
                    sector: item.category,
                    theme: item.phase2DeepAnalysis?.articleContext || '',
                    impact_score: item.impactScore,
                    score_reason: item.scoreReason,
                    target_stocks: item.phase2DeepAnalysis?.targetStocks || [],
                    transmission_mechanism: item.phase2DeepAnalysis?.transmissionMechanism || '',
                    url: item.url || '',
                    article_context: item.phase2DeepAnalysis?.articleContext || '',
                    step_by_step_path: item.phase2DeepAnalysis?.stepByStepPath || [],
                    short_term_outlook: item.phase2DeepAnalysis?.shortTermOutlook || '',
                    long_term_outlook: item.phase2DeepAnalysis?.longTermOutlook || ''
                }));

                await purgeOldNews(supabaseUrl, supabaseKey, 14);

                const resp = await insertNews(supabaseUrl, supabaseKey, supabasePayload);

                let dbErrorMsg = null;
                if (resp.ok) {
                    console.log('[Supabase] Successfully saved', supabasePayload.length, 'news items.');
                } else {
                    const errorText = await resp.text();
                    console.error('[Supabase] Failed to save to DB. Status:', resp.status, errorText);
                    dbErrorMsg = `Status ${resp.status}: ${errorText}`;
                }
                return res.status(200).json({ success: true, dataset: finalDataset, dbError: dbErrorMsg });
            } catch (dbErr) {
                console.error('[Supabase] Error constructing payload:', dbErr);
                return res.status(200).json({ success: true, dataset: finalDataset, dbError: dbErr.message });
            }
        } else {
            console.warn('[Supabase] Keys missing. Data will not be saved to DB.');
            return res.status(200).json({ success: true, dataset: finalDataset, dbError: 'Supabase URL/Key missing' });
        }
    } catch (error) {
        console.error('[Gemini Analysis Error]', error);
        return res.status(500).json({ error: error.message });
    } finally {
        if (lockAcquired && lockSupabaseUrl && lockSupabaseKey) {
            await releaseAnalysisLock(lockSupabaseUrl, lockSupabaseKey);
        }
    }
}
