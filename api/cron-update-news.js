import {
    buildRssUrls, fetchAllRssItems, rankByHeadlineFrequency,
    screenArticles, translateTitlesToKorean, saveShortlist, selectTopForDeepAnalysis,
    deepAnalyzeArticles, reconcileSentiment,
    purgeOldNews, insertNews,
    acquireAnalysisLock, releaseAnalysisLock, markFetchedNow,
    getFetchState, resolveCollectionWindowStart
} from './_lib/newsAnalysis.js';
import { requireBatchAuth } from './_lib/batchAuth.js';

export const maxDuration = 60; // Allow up to 60s for Hobby users if opted in

// 🕐 이 라우트를 부르는 스케줄은 저장소 밖에 있다: cron-job.org (KST 06:00, 매일).
//    Vercel Cron은 쓰지 않는다 — Hobby 플랜은 하루 1회만 실행되고 시각 보장도 없어
//    형제 저장소(my-stock-app)에서 배치가 통째로 누락된 실사고가 있었다(2026-08-03).
//    스케줄 변경은 cron-job.org 대시보드에서 하며, 인증은 X-Batch-Key 헤더다.
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    // 🔒 실행마다 Gemini 비용이 발생하므로 무인 호출은 사전 공유 키를 요구한다.
    if (requireBatchAuth(req, res)) return;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    let lockAcquired = false;

    try {
        if (supabaseUrl && supabaseKey) {
            lockAcquired = await acquireAnalysisLock(supabaseUrl, supabaseKey);
            if (!lockAcquired) {
                return res.status(409).json({ success: false, message: 'Another analysis run is already in progress.' });
            }
        }

        // 1. Fetch RSS News (windowed by last_fetched_at so a delayed/missed cron
        // doesn't lose articles, and a fresh run doesn't re-collect a fixed 24h every time)
        const windowStartMs = supabaseUrl && supabaseKey
            ? resolveCollectionWindowStart((await getFetchState(supabaseUrl, supabaseKey)).last_fetched_at)
            : Date.now() - 24 * 60 * 60 * 1000;

        const rssUrls = buildRssUrls();
        const allItems = await fetchAllRssItems(rssUrls);

        const uniqueMap = new Map();
        allItems.forEach(item => {
            if (item.title && item.link && !uniqueMap.has(item.link)) {
                uniqueMap.set(item.link, item);
            }
        });
        // [2026-08-11] Was capped at 150, but the window (up to 30h) typically contains
        // 1200-1300 unique items on a busy day - the 150 cap silently dropped ~88% of
        // them, collapsing the intended 30h window down to effectively just the last few
        // hours (since results are sorted newest-first before the cap). That's what was
        // causing "too few / repetitive news" - real coverage from earlier in the window
        // (e.g. right after US market close) never reached rankByHeadlineFrequency at
        // all. Raised well above the observed daily volume; rankByHeadlineFrequency below
        // still narrows this down to MAX_CANDIDATES before any Gemini call, so this only
        // costs a bit more local computation, not more API spend.
        const articles = Array.from(uniqueMap.values())
            .filter(item => new Date(item.pubDate).getTime() > windowStartMs)
            .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
            .slice(0, 600);

        if (articles.length === 0) {
            if (supabaseUrl && supabaseKey) await markFetchedNow(supabaseUrl, supabaseKey);
            return res.status(200).json({ success: true, message: 'No articles to process.' });
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');

        // 2. Local, zero-cost pre-filter: rank by cross-outlet headline frequency and
        // dedupe near-identical stories before spending any Gemini tokens.
        const candidates = rankByHeadlineFrequency(articles);

        // STEP 1: Screening + categorization (single cheap Gemini call). This produces
        // the "list" - saved to news_shortlist BEFORE any deep-analysis call, so the
        // selection/categorization/diversity logic can be verified on its own instead
        // of only being visible after the expensive step below has already run.
        const shortlist = await screenArticles(candidates, GEMINI_API_KEY);

        if (shortlist.length === 0) {
            if (supabaseUrl && supabaseKey) await markFetchedNow(supabaseUrl, supabaseKey);
            return res.status(200).json({ success: true, message: 'No high impact articles found.' });
        }

        // [2026-08-14] Separate, unstructured translation pass instead of asking
        // screenArticles' JSON-schema call to also translate - see translateTitlesToKorean's
        // own comment for why that combination proved unstable. Failure here falls back to
        // English titles rather than blocking the whole run.
        const translatedTitles = await translateTitlesToKorean(shortlist.map(a => a.title), GEMINI_API_KEY);
        shortlist.forEach((a, i) => { a.titleKr = translatedTitles[i]; });

        // [2026-08-27] Was fire-and-forget (log-only on failure) while the response always
        // unconditionally said "Shortlist saved" - see analyze-news.js's matching comment
        // for the direct evidence this silently failed with no visible signal.
        let shortlistSaveError = null;
        if (supabaseUrl && supabaseKey) {
            try {
                const shortlistResp = await saveShortlist(supabaseUrl, supabaseKey, shortlist);
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

        // [2026-08-12] Deep analysis paused at user request while the collection/
        // screening quality (volume, duplicates) is under review - news_shortlist keeps
        // filling in normally so that work isn't blocked, but no Gemini Pro deep-analysis
        // cost is spent and news_impacts stops updating. Flipped from opt-out
        // (=== 'false') to opt-in (!== 'true') because the opt-out form silently did
        // nothing when the Vercel dashboard env var was never actually added - deep
        // analysis kept running against the user's explicit instruction. This way the
        // pause is the default with zero Vercel configuration required; set
        // DEEP_ANALYSIS_ENABLED=true to resume.
        if (process.env.DEEP_ANALYSIS_ENABLED !== 'true') {
            return res.status(200).json({
                success: true,
                message: shortlistSaveError
                    ? `Deep analysis is paused (set DEEP_ANALYSIS_ENABLED=true to resume). Shortlist save FAILED: ${shortlistSaveError}`
                    : 'Deep analysis is paused (set DEEP_ANALYSIS_ENABLED=true to resume). Shortlist saved, no news_impacts update.',
                shortlistCount: shortlist.length,
                shortlistSaveError
            });
        }

        // STEP 2: Deep analysis - only the top N of the shortlist, capped per category
        // so one dominant event (e.g. today's oil/Iran story) can't consume the whole
        // deep-analysis budget even if it dominates the shortlist itself.
        const selectedArticles = selectTopForDeepAnalysis(shortlist);
        // Screening-stage category by originalId, so it can be re-applied after deep
        // analysis regardless of what Gemini echoes back there (belt-and-suspenders on
        // top of the prompt instruction below - the two stages must not disagree, since
        // the per-category cap above was computed using THIS category).
        const screeningCategoryById = new Map(selectedArticles.map(a => [a.originalId, a.category]));
        const analyzedData = await deepAnalyzeArticles(selectedArticles, GEMINI_API_KEY);

        // 3. Save to Supabase
        if (supabaseUrl && supabaseKey) {
            const supabasePayload = analyzedData.map(item => {
                const orig = articles[item.originalId] || {};
                const timestamp = orig.pubDate || new Date().toISOString();
                const sentiment = reconcileSentiment(item.sentiment, item.phase2DeepAnalysis?.targetStocks);

                return {
                    title: item.titleKr,
                    original_title: orig.title || '',
                    summary: item.summary,
                    source: orig.source || 'Global News',
                    published_at: timestamp,
                    sector: screeningCategoryById.get(item.originalId) || item.category,
                    theme: item.phase2DeepAnalysis?.articleContext || '',
                    impact_score: (sentiment === "BEARISH" ? -1 : 1) * Math.abs(item.impactScore || 50),
                    score_reason: item.scoreReason || '',
                    target_stocks: item.phase2DeepAnalysis?.targetStocks || [],
                    transmission_mechanism: item.phase2DeepAnalysis?.transmissionMechanism || '',
                    url: orig.link || '',
                    article_context: item.phase2DeepAnalysis?.articleContext || '',
                    step_by_step_path: item.phase2DeepAnalysis?.stepByStepPath || [],
                    short_term_outlook: item.phase2DeepAnalysis?.shortTermOutlook || '',
                    long_term_outlook: item.phase2DeepAnalysis?.longTermOutlook || ''
                };
            });

            // Delete old records older than 14 days to preserve history while maintaining clean DB
            await purgeOldNews(supabaseUrl, supabaseKey, 14);

            const dbResp = await insertNews(supabaseUrl, supabaseKey, supabasePayload);

            if (!dbResp.ok) {
                console.error('[Supabase Error]', await dbResp.text());
                throw new Error('Failed to save to Supabase');
            }

            // Only the scheduled cron advances the incremental-collection watermark.
            // A manual /api/analyze-news trigger must not, or the next cron could
            // skip articles published between the manual run and the real schedule.
            await markFetchedNow(supabaseUrl, supabaseKey);
        }

        return res.status(200).json({
            success: true,
            message: 'Cron Job Completed Successfully',
            shortlistCount: shortlist.length,
            deepAnalyzedCount: analyzedData.length,
            count: analyzedData.length // kept for backward compatibility with any existing log parsing
        });
    } catch (error) {
        console.error('[Cron Job Error]', error);
        return res.status(500).json({ error: error.message });
    } finally {
        if (lockAcquired && supabaseUrl && supabaseKey) {
            await releaseAnalysisLock(supabaseUrl, supabaseKey);
        }
    }
}
