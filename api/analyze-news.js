export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const GEMINI_API_KEY = req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY environment variable. Please configure it in Vercel or provide it in the UI.' });
    }

    try {
        const { articles } = req.body;
        
        if (!articles || !Array.isArray(articles)) {
            return res.status(400).json({ error: 'Invalid input. Expected an array of articles.' });
        }

        const promptText = `
You are a top-tier Macroeconomics and Stock Market Analyst in South Korea (여의도 애널리스트).
I will provide you with a list of global news articles (titles and sources).
Your task follows the PDCA methodology:
- Plan: Understand the macro context.
- Do: Select the top 3-5 MOST IMPACTFUL and DISTINCT news articles for the Korean stock market (KOSPI/KOSDAQ) or specific Korean sectors. CRITICAL: Ensure NO DUPLICATE topics or similar news stories are selected. Each selected article MUST cover a completely different macro event or sector issue.
- Check: Deeply analyze the transmission mechanism and target stocks for the selected articles.
- Act: Format the output strictly as a JSON array of objects.

Here are the raw articles:
${JSON.stringify(articles.map((a, i) => ({ id: i, title: a.title, source: a.source })), null, 2)}

Output exactly a JSON array containing ONLY the selected 3-5 articles in the following structure. Do NOT wrap in markdown blocks, just raw JSON:
[
  {
    "originalId": (the id from the input),
    "titleKr": "Translate the title to Korean dynamically and naturally",
    "category": "e.g., 통화정책/금융, 반도체/IT, 거시경제",
    "impactScore": (integer between 0 and 100 representing magnitude of impact on KR market),
    "sentiment": "BULLISH" or "BEARISH" or "NEUTRAL",
    "summary": "2-3 sentences summarizing the news and its direct implication in Korean",
    "phase2DeepAnalysis": {
      "articleContext": "Detailed context and background of the news (Korean)",
      "stepByStepPath": [
        "1단계: ...",
        "2단계: ...",
        "3단계: ..."
      ],
      "transmissionMechanism": "A paragraph explaining the transmission mechanism to the Korean market (Korean)",
      "targetStocks": [
        {
          "name": "Stock Name (e.g., 삼성전자)",
          "ticker": "005930",
          "sentiment": "BULLISH" or "BEARISH",
          "impactLevel": "최상 (Very High)",
          "reasoning": "Reason for impact (Korean)"
        }
      ],
      "shortTermOutlook": "Short term outlook (Korean)",
      "longTermOutlook": "Long term outlook (Korean)"
    }
  }
]
`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Gemini API Error: ${response.status} ${errBody}`);
        }

        const data = await response.json();
        const responseText = data.candidates[0].content.parts[0].text;
        
        let analyzedData;
        try {
            analyzedData = JSON.parse(responseText);
        } catch (parseErr) {
            console.error('Failed to parse Gemini output:', responseText);
            throw new Error('Gemini output was not valid JSON');
        }

        // Merge original article URLs and Dates back into the selected articles
        const finalDataset = analyzedData.map((item, idx) => {
            const originalArticle = articles[item.originalId];
            
            let timestamp = originalArticle.pubDate;
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

            return {
                id: `news-${idx + 1}`,
                titleKr: item.titleKr,
                titleEn: originalArticle.title,
                url: originalArticle.link,
                source: originalArticle.source || "Global News",
                timestamp: timestamp || new Date().toISOString(),
                category: item.category || "글로벌 매크로",
                impactScore: item.impactScore || 50,
                sentiment: item.sentiment || "NEUTRAL",
                summary: item.summary || "",
                phase1Filtering: { passed: true, matchKeywords: [], priorityScore: 90 },
                phase2DeepAnalysis: item.phase2DeepAnalysis || { targetStocks: [] }
            };
        });

        // ==========================================
        // Supabase Data Insertion (Background Task)
        // ==========================================
        const supabaseUrl = req.headers['x-supabase-url'] || process.env.SUPABASE_URL;
        const supabaseKey = req.headers['x-supabase-key'] || process.env.SUPABASE_KEY;

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
                    target_stocks: item.phase2DeepAnalysis?.targetStocks || [],
                    transmission_mechanism: item.phase2DeepAnalysis?.transmissionMechanism || '',
                    url: item.url || '',
                    article_context: item.phase2DeepAnalysis?.articleContext || '',
                    step_by_step_path: item.phase2DeepAnalysis?.stepByStepPath || [],
                    short_term_outlook: item.phase2DeepAnalysis?.shortTermOutlook || '',
                    long_term_outlook: item.phase2DeepAnalysis?.longTermOutlook || ''
                }));

                // Await the fetch so Vercel does not freeze the lambda before completion
                const resp = await fetch(`${supabaseUrl}/rest/v1/news_impacts`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(supabasePayload)
                });
                
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
    }
}
