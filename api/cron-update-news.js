import {
    buildRssUrls, parseRssItems, rankByHeadlineFrequency,
    screenArticles, saveShortlist, selectTopForDeepAnalysis,
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

        const allItems = [];
        for (const url of rssUrls) {
            try {
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
                    }
                });
                if (response.ok) {
                    const xmlText = await response.text();
                    const items = parseRssItems(xmlText);
                    allItems.push(...items);
                }
            } catch (e) {
                console.error('[RSS Fetch Error]', url, e.message);
            }
        }

        const uniqueMap = new Map();
        allItems.forEach(item => {
            if (item.title && item.link && !uniqueMap.has(item.link)) {
                uniqueMap.set(item.link, item);
            }
        });
        const articles = Array.from(uniqueMap.values())
            .filter(item => new Date(item.pubDate).getTime() > windowStartMs)
            .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
            .slice(0, 150);

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

        if (supabaseUrl && supabaseKey) {
            const shortlistResp = await saveShortlist(supabaseUrl, supabaseKey, shortlist);
            if (!shortlistResp.ok) {
                console.error('[Shortlist Save Error]', await shortlistResp.text());
            }
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
