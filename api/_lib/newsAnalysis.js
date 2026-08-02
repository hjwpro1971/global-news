// Shared pipeline logic for analyze-news.js (user-triggered) and cron-update-news.js (scheduled).
// Keeping this in one place avoids the two routes drifting apart when prompts/models change.

export function parseRssItems(xmlText) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(xmlText)) !== null) {
        const itemContent = match[1];
        const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(itemContent);
        const linkMatch = /<link>([\s\S]*?)<\/link>/i.exec(itemContent);
        const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(itemContent);
        const sourceMatch = /<source[^>]*>([\s\S]*?)<\/source>/i.exec(itemContent);

        let rawTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
        let link = linkMatch ? linkMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
        let pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toUTCString();
        let source = sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : 'Google News';

        if (rawTitle.includes(' - ')) {
            const parts = rawTitle.split(' - ');
            if (parts.length > 1) {
                source = parts.pop().trim();
                rawTitle = parts.join(' - ').trim();
            }
        }

        if (rawTitle && link) {
            items.push({ title: rawTitle, link, pubDate, source });
        }
    }
    return items;
}

export function buildScreeningPrompt(articles) {
    return `
You are a highly efficient news screener for the South Korean Stock Market.
I will provide you with a list of global news articles.
Your task is to identify the top MAXIMUM 10 articles that have the HIGHEST impact on the Korean stock market (KOSPI/KOSDAQ).
Ignore duplicates, low-impact news, or generic opinions.

Raw articles:
${JSON.stringify(articles.map((a, i) => ({ id: i, title: a.title, source: a.source })), null, 2)}

Output exactly a JSON array containing the selected article IDs. Do NOT wrap in markdown blocks, just raw JSON:
[
  {
    "id": 0,
    "reason": "1 sentence reason why this is high impact"
  }
]
`;
}

export function buildDeepAnalysisPrompt(selectedArticles) {
    return `
You are a top-tier Macroeconomics and Stock Market Analyst in South Korea (여의도 애널리스트).
I will provide you with a highly filtered list of critical global news articles.
Your task follows a strict PDCA methodology to analyze their deep impact on the South Korean Stock Market (KOSPI/KOSDAQ).

1. DO (Base Sentiment & Scoring Matrix):
   - Determine Sentiment strictly using this logic:
     * Monetary Policy: Rate Cut/Dovish -> BULLISH. Rate Hike/Hawkish -> BEARISH.
     * Macro Data: Goldilocks/Soft-landing -> BULLISH. Stagflation/Recession -> BEARISH.
     * Corporate/Tech: Megacap Earnings beat, AI CAPEX up -> BULLISH. Earnings miss, inventory up -> BEARISH.
     * Geopolitics: De-escalation -> BULLISH. Escalation -> BEARISH.
   - Assign Base Impact Score (50-100).
2. CHECK (Korea-Specific Calibration):
   - Calibrate the base sentiment and score specifically for the South Korean market (e.g. semiconductor exports, USD/KRW).
3. ACT (Final Output Generation & CRITICAL LOGIC CHECK):
   - Finalize the calibrated impactScore (50-100) and sentiment (BULLISH/BEARISH/NEUTRAL).
   - Identify the exact domestic target stocks/sectors that will absorb this impact.
   - **CRITICAL LOGIC CHECK**: Ensure absolute logical consistency. The overall 'sentiment' MUST reflect the actual impact on the target stocks. If the article discusses a "plunge", "crash", "uncertainty", or "risk" that negatively impacts the target stocks (BEARISH), the overall 'sentiment' MUST be BEARISH. Do NOT mistakenly label an article as BULLISH just because it speculates about a future "rebound".
   - **MANDATORY RULE**: If the majority of the \`targetStocks\` are BEARISH, the top-level \`sentiment\` field MUST ALSO be BEARISH.

Here are the selected critical articles:
${JSON.stringify(selectedArticles, null, 2)}

Output exactly a JSON array containing the deep analysis for EACH of the provided articles. Do NOT wrap in markdown blocks, just raw JSON:
[
  {
    "originalId": (the originalId from the input),
    "titleKr": "Translate the title to Korean dynamically and naturally",
    "category": "e.g., 통화정책/금융, 반도체/IT, 거시경제",
    "impactScore": (integer between 50 and 100),
    "sentiment": "BULLISH" or "BEARISH" or "NEUTRAL",
    "summary": "2-3 sentences summarizing the news",
    "phase2DeepAnalysis": {
      "articleContext": "Detailed context and background of the news (Korean)",
      "stepByStepPath": ["1단계: ...", "2단계: ...", "3단계: ..."],
      "transmissionMechanism": "A paragraph explaining the transmission mechanism to the Korean market (Korean)",
      "targetStocks": [
        {
          "name": "Stock Name",
          "ticker": "005930",
          "sentiment": "BULLISH" or "BEARISH",
          "impactLevel": "최상 (Very High)",
          "reasoning": "Reason for impact"
        }
      ],
      "shortTermOutlook": "Short term outlook",
      "longTermOutlook": "Long term outlook"
    }
  }
]
`;
}

const FLASH_MODEL = 'gemini-2.5-flash';
const PRO_MODEL = 'gemini-2.5-pro';

// Gemini can return an empty/blocked response (safety filters, quota) with no `candidates`.
// Extracting this in one place turns that into a readable error instead of a raw TypeError.
function extractGeminiText(data, label) {
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string' || text.length === 0) {
        const blockReason = data?.promptFeedback?.blockReason;
        throw new Error(`${label} returned no usable content${blockReason ? ` (blockReason: ${blockReason})` : ''}: ${JSON.stringify(data).slice(0, 500)}`);
    }
    return text;
}

export async function screenArticles(articles, apiKey) {
    const flashResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${FLASH_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: buildScreeningPrompt(articles) }] }],
            generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
        })
    });

    if (!flashResponse.ok) {
        const errBody = await flashResponse.text();
        throw new Error(`Gemini Flash API Error: ${flashResponse.status} ${errBody}`);
    }

    const flashData = await flashResponse.json();
    const screenedList = JSON.parse(extractGeminiText(flashData, 'Gemini Flash screening'));

    return screenedList.map(item => ({
        originalId: item.id,
        title: articles[item.id]?.title,
        source: articles[item.id]?.source
    })).filter(a => a.title);
}

export async function deepAnalyzeArticles(selectedArticles, apiKey) {
    const proResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${PRO_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: buildDeepAnalysisPrompt(selectedArticles) }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        })
    });

    if (!proResponse.ok) {
        const errBody = await proResponse.text();
        throw new Error(`Gemini Pro API Error: ${proResponse.status} ${errBody}`);
    }

    const data = await proResponse.json();
    const responseText = extractGeminiText(data, 'Gemini Pro deep analysis');

    try {
        return JSON.parse(responseText);
    } catch (parseErr) {
        console.error('Failed to parse Gemini output:', responseText);
        throw new Error('Gemini output was not valid JSON');
    }
}

// Post-processing logical consistency check: overall sentiment must agree with the
// majority direction of targetStocks (the model occasionally contradicts itself).
export function reconcileSentiment(sentiment, targetStocks) {
    let resolved = sentiment || "NEUTRAL";
    if (targetStocks && targetStocks.length > 0) {
        const bearishCount = targetStocks.filter(s => s.sentiment === "BEARISH").length;
        const bullishCount = targetStocks.filter(s => s.sentiment === "BULLISH").length;
        if (bearishCount > 0 && bullishCount === 0 && resolved === "BULLISH") {
            resolved = "BEARISH";
        } else if (bullishCount > 0 && bearishCount === 0 && resolved === "BEARISH") {
            resolved = "BULLISH";
        }
    }
    return resolved;
}

export async function purgeOldNews(supabaseUrl, supabaseKey, olderThanDays) {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    try {
        await fetch(`${supabaseUrl}/rest/v1/news_impacts?created_at=lt.${cutoff}`, {
            method: 'DELETE',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });
    } catch (delErr) {
        console.warn('[Supabase Cleanup Warning]', delErr);
    }
}

export async function insertNews(supabaseUrl, supabaseKey, payload) {
    return fetch(`${supabaseUrl}/rest/v1/news_impacts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
    });
}
