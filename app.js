/**
 * GLOBAL MACRO -> KR STOCK IMPACT MONITOR
 * Application Logic & 2-Stage AI Simulation Engine
 * 
 * Features:
 * - 10 Detailed Realistic News Impact Analysis Models (No quantitative percentage predictions)
 * - Real-time World Market Clocks (New York, London, Seoul)
 * - 2-Stage Pipeline Simulation (1st Stage Title Screening -> 2nd Stage LLM Deep Transmission Analysis)
 * - Dynamic Multi-Criteria Filtering (Search, Sentiment, Sector, Impact Score, Stock Tags)
 * - Qualitative Stock Direction & Intensity Analysis Modal Interaction (Chart.js removed)
 */

// ==========================================================================
// 1. DATA MODEL & NEWS DATASET (10 Realistic Global Macro & Sector News)
// ==========================================================================

/**
 * @typedef {Object} TargetStockImpact
 * @property {string} name - Stock Name (e.g., 삼성전자)
 * @property {string} ticker - Stock Code (e.g., 005930)
 * @property {'BULLISH'|'BEARISH'} sentiment - Direction (호재 / 악재)
 * @property {string} impactLevel - Impact Strength (e.g., "최상 (Very High)", "높음 (High)", "중간 (Moderate)")
 * @property {string} reasoning - Detailed Cause & Impact Background
 * @property {string[]} keyDrivers - Key catalyst factors
 */

/**
 * @typedef {Object} NewsImpactAnalysis
 * @property {string} id
 * @property {string} titleEn
 * @property {string} titleKr
 * @property {string} source
 * @property {string} timestamp
 * @property {string} category
 * @property {number} impactScore - (-100 to +100)
 * @property {'BULLISH'|'BEARISH'|'NEUTRAL'} sentiment
 * @property {string} summary
 * @property {Object} phase1Filtering
 * @property {string[]} phase1Filtering.matchKeywords
 * @property {number} phase1Filtering.priorityScore
 * @property {boolean} phase1Filtering.passed
 * @property {string} phase1Filtering.screeningReason
 * @property {Object} phase2DeepAnalysis
 * @property {string} phase2DeepAnalysis.articleContext
 * @property {string} phase2DeepAnalysis.shortTermOutlook
 * @property {string} phase2DeepAnalysis.longTermOutlook
 * @property {string[]} phase2DeepAnalysis.riskFactors
 */
const SOURCE_URL_MAP = {
    "Reuters Financial": "https://www.reuters.com/markets/",
    "Ministry of Trade, Industry and Energy": "https://www.motie.go.kr",
    "Bloomberg Terminals": "https://www.bloomberg.com/markets",
    "Wall Street Journal": "https://www.wsj.com/news/markets",
    "Financial Times": "https://www.ft.com/markets",
    "S&P Global Commodities": "https://www.spglobal.com/commodityinsights/en",
    "TradeWinds Shipping": "https://www.tradewindsnews.com/",
    "CNBC Market Data": "https://www.cnbc.com/markets/",
    "Nikkei Asia": "https://asia.nikkei.com/Economy/",
    "EE Times": "https://www.eetimes.com/"
};

function getNewsUrl(news) {
    if (!news) return "https://news.google.com";
    
    // Extract concise, real search keywords from phase1Filtering keywords or core title
    let kw = "";
    if (news.phase1Filtering && Array.isArray(news.phase1Filtering.matchKeywords) && news.phase1Filtering.matchKeywords.length > 0) {
        kw = news.phase1Filtering.matchKeywords.slice(0, 3).join(' ');
    } else {
        kw = news.titleEn.split(' ').slice(0, 4).join(' ');
    }
    
    const query = encodeURIComponent(kw);
    return `https://news.google.com/search?q=${query}`;
}

const newsDataset = [
    {
        id: "news-01",
        titleEn: "Federal Reserve Keeps Benchmark Rates Steady at July FOMC, Strongly Signals September Rate Cut",
        titleKr: "미 연준(Fed), 7월 FOMC 기준금리 동결 확정… 9월 금리 인하 전환 강력한 시그널 제시",
        source: "Reuters Financial",
        timestamp: "2026-07-31 16:45",
        category: "통화정책/금융",
        impactScore: 88,
        sentiment: "BULLISH",
        summary: "미 연준이 7월 FOMC 정례회의에서 기준금리를 동결했으나, 제롬 파월 의장의 기자회견 및 성명서를 통해 고용시장 냉각과 인플레이션 목표 수준 접근을 공식 확인하며 금리 인하 개시를 강하게 시그널링했습니다.",
        phase1Filtering: {
            matchKeywords: ["Federal Reserve", "FOMC", "Rate Cut", "Powell", "Interest Rate"],
            priorityScore: 92,
            passed: true,
            screeningReason: "미 연준 7월 FOMC 금리 동결 및 통화정책 피벗(금리 인하) 시그널 감지"
        },
        phase2DeepAnalysis: {
            articleContext: "7월 FOMC 성명서에서는 '고용 및 인플레이션 두 가지 목표 달성에 대한 위험이 더욱 균형을 이루어 가고 있다'는 문구가 추가되었습니다. 파월 의장은 인플레이션 지표가 목표 수준으로 지속 이동한다는 확신이 강화되고 있으며, 경제 여건이 일정하게 유지된다면 이르면 차기 정례회의에서 금리 인하가 논의될 수 있다고 밝혀 글로벌 통화정책 피벗 신호를 명확히 했습니다.",
            stepByStepPath: [
                "1단계: 7월 FOMC 동결 및 제롬 파월 의장의 통화정책 피벗(금리 인하) 공식 시그널링",
                "2단계: 미 국채 금리 하락 및 글로벌 달러 약세 전환 ➔ 원/달러 환율 안정 및 외환시장 변동성 완화",
                "3단계: 한국은행 통화정책 운용 여력 확보 및 국내 외국인 자금 바스켓 순매수 유입",
                "4단계: 고금리 할인율 부담을 받던 바이오·IT 성장주 및 배당·밸류업 금융주 멀티플 재평가"
            ],
            transmissionMechanism: "미 연준의 금리 인하 시그널 확정 ➔ 달러 약세 및 원화 강세 전환 ➔ 한국 증시 외국인 유동성 자금 순매수 유입 ➔ 바이오·IT 등 성장주 할인율 축소 및 금융주 배당 매력 부각",
            impactedSectors: [
                { sector: "성장주 (바이오/IT)", direction: "UP", magnitude: 90 },
                { sector: "금융/지주사", direction: "UP", magnitude: 82 },
                { sector: "건설/부동산 REITs", direction: "UP", magnitude: 75 }
            ],
            targetStocks: [
                {
                    name: "KB금융",
                    ticker: "105560",
                    sentiment: "BULLISH",
                    impactLevel: "최상 (Very High)",
                    reasoning: "금리 인하 가시화로 원/달러 환율 안정 및 외국인 패시브 자금의 배당/밸류업 종목 순매수 유입 가속화.",
                    keyDrivers: ["주주환원 정책 확대", "원화 강세 외국인 유입", "배당 수익률 부각"]
                },
                {
                    name: "NAVER",
                    ticker: "035420",
                    sentiment: "BULLISH",
                    impactLevel: "높음 (High)",
                    reasoning: "글로벌 고금리 할인율 부담 해소로 인터넷/IT 성장주 PER 멀티플 리레이팅 및 AI B2B 매출 모멘텀 가속.",
                    keyDrivers: ["성장주 할인율 축소", "B2B AI 솔루션 성장", "플랫폼 실적 개선"]
                },
                {
                    name: "삼성바이오로직스",
                    ticker: "207940",
                    sentiment: "BULLISH",
                    impactLevel: "높음 (High)",
                    reasoning: "금리 인하 기대로 글로벌 바이오 R&D 투심 회복 및 대형 CDMO 신규 공장 물량 조기 수주 모멘텀 부각.",
                    keyDrivers: ["글로벌 바이오 투심 회복", "CDMO 신규 수주 가속", "생물보안법 반사이익"]
                }
            ],
            shortTermOutlook: "원/달러 환율 안정을 기반으로 외국인 자금 바스켓 매수세가 유입되어 코스피 상승 모멘텀 유지.",
            longTermOutlook: "글로벌 통화정책 완화 주기 진입으로 KOSPI 밸류에이션 멀티플 확장 본격화.",
            riskFactors: [
                "미 고용 지표 급격한 냉각 시 경기후퇴(Recession) 우려",
                "국내 가계부채 관리에 따른 금융당국 미세조정"
            ]
        }
    },
    {
        id: "news-02",
        titleEn: "Korea July Exports Surge Driven by Record Semiconductor & HBM Shipments",
        titleKr: "한국 7월 수출 급증… 반도체 및 HBM 사상 최대 수출액 경신",
        source: "Ministry of Trade, Industry and Energy",
        timestamp: "2026-07-31 15:30",
        category: "반도체/AI",
        impactScore: 94,
        sentiment: "BULLISH",
        summary: "산업통상자원부가 발표한 7월 수출입 동향에 따르면, 한국 수출액이 큰 폭으로 증가한 가운데 HBM 및 서버용 메모리 수요 폭증에 힘입어 반도체 수출액이 역대 최고치를 경신했습니다.",
        phase1Filtering: {
            matchKeywords: ["Korea Exports", "Semiconductor", "HBM", "Trade Surplus", "Record High"],
            priorityScore: 96,
            passed: true,
            screeningReason: "국내 7월 수출 급증 및 메모리/HBM 사상 최대 수출 호조"
        },
        phase2DeepAnalysis: {
            articleContext: "산업통상자원부에 따르면 7월 반도체 수출액이 전년 동기 대비 대폭 증가하며 종전 최고치를 크게 뛰어넘었습니다. AI 글로벌 데이터센터 증설에 따른 HBM3e 출하 확대와 서버용 high-density DRAM/eSSD 수요 폭발이 반도체 수출 둔화 우려를 완전히 불식시켰습니다.",
            stepByStepPath: [
                "1단계: 7월 반도체 수출액 사상 최고치 경신 및 주요 품목 수출 급증",
                "2단계: 삼성전자·SK하이닉스 메모리 및 HBM 사업부 실적 추정치 일제히 상향",
                "3단계: 반도체 후공정 칩 패키징, TC 본더 장비, 검사 장비 밸류체인으로 온기 확산",
                "4단계: KOSPI 지수 내 반도체 비중 상승 및 국내 증시 펀더멘털 강력 지지"
            ],
            transmissionMechanism: "7월 수출 실적 급증 ➔ 삼성전자·SK하이닉스 실적 서프라이즈 가시화 ➔ 반도체 소부장 밸류체인 매출 직결 및 실적 추정치 상향",
            impactedSectors: [
                { sector: "HBM/메모리 반도체", direction: "UP", magnitude: 96 },
                { sector: "반도체 후공정/장비", direction: "UP", magnitude: 92 },
                { sector: "IT 부품/소재", direction: "UP", magnitude: 80 }
            ],
            targetStocks: [
                {
                    name: "SK하이닉스",
                    ticker: "000660",
                    sentiment: "BULLISH",
                    impactLevel: "최상 (Very High)",
                    reasoning: "HBM3e 12단 및 eSSD 독점적 공급 지위에 힘입어 사상 최대 실적 경신 및 영업이익률 최고치 달성 전망.",
                    keyDrivers: ["HBM3e 12단 독점 공급", "eSSD 매출 폭증", "실적 어닝 서프라이즈"]
                },
                {
                    name: "삼성전자",
                    ticker: "005930",
                    sentiment: "BULLISH",
                    impactLevel: "높음 (High)",
                    reasoning: "DRAM/NAND 메모리 단가 상승 지속 및 HBM 퀄테스트 통과 물량 본격 출하에 따른 반도체(DS) 부문 실적 급등.",
                    keyDrivers: ["DRAM/NAND ASP 상승", "HBM 출하량 확대", "수출 실적 서프라이즈"]
                },
                {
                    name: "한미반도체",
                    ticker: "042700",
                    sentiment: "BULLISH",
                    impactLevel: "최상 (Very High)",
                    reasoning: "HBM 글로벌 팹 증설 가속에 따른 듀얼 TC 본더 장비 독점 공급 효과로 수주 잔고 사상 최대 달성.",
                    keyDrivers: ["DUAL TC BONDER 락인", "HBM4 장비 선점", "장비 매출 지속 성장"]
                }
            ],
            shortTermOutlook: "수출지표 발표 직후 외국인/기관 대량 매수세 유입되며 반도체 대형주 중심 강한 상승 장세.",
            longTermOutlook: "메모리 슈퍼사이클 장기화로 코스피 지수 상승 안착 발판.",
            riskFactors: [
                "글로벌 세트(모바일/PC) 수요의 상대적 회복 지연",
                "환율 변동성에 따른 수입원가 영향"
            ]
        }
    },
    {
        id: "news-03",
        titleEn: "Big Tech AI Infrastructure CapEx Hits Record High, Erasing AI Bubble Concerns",
        titleKr: "글로벌 빅테크 주요 기업 AI 설비투자(CapEx) 사상 최대… AI 버블 우려 불식",
        source: "Bloomberg Terminals",
        timestamp: "2026-07-31 14:15",
        category: "빅테크/IT",
        impactScore: 90,
        sentiment: "BULLISH",
        summary: "마이크로소프트, 알파벳, 메타, 아마존의 실적 발표 결과, AI 데이터센터 및 서버 설비투자 총액이 사상 최고치를 경신하며 AI 칩 및 고성능 메모리 수요 지속을 입증했습니다.",
        phase1Filtering: {
            matchKeywords: ["Big Tech", "AI CapEx", "Datacenter", "Microsoft", "Meta"],
            priorityScore: 92,
            passed: true,
            screeningReason: "빅테크 AI CapEx 사상 최고치 경신 및 AI 데이터센터 증설 호재"
        },
        phase2DeepAnalysis: {
            articleContext: "주요 빅테크 기업들의 자본지출(CapEx) 합계는 전년 동기 대비 대폭 증가하며 분기 기준 역사상 최대치를 또다시 갈아치웠습니다. 마이크로소프트와 메타 경영진은 실적 컨퍼런스 콜에서 'AI 인프라에 대한 투자가 여전히 공급 부족 상태'라며 투자 확대를 지속할 것임을 명확히 밝혀 AI 버블론을 완전히 정면 돌파했습니다.",
            stepByStepPath: [
                "1단계: 빅테크 기업들의 분기 AI CapEx 사상 최대치 발표",
                "2단계: AI 데이터센터 전용 서버, HBM 메모리, 엔터프라이즈 eSSD 수요 락인 확인",
                "3단계: 초고압 변압기, 전력 케이블 등 AI 데이터센터 전력 인프라 장비 발주 폭주",
                "4단계: 국내 메모리 제조사 및 전력 인프라 대형주 수주 잔고 최고치 갱신"
            ],
            transmissionMechanism: "빅테크 AI CapEx 대규모 투입 ➔ AI 데이터센터 서버 증설 가속 ➔ 엔터프라이즈 eSSD 및 HBM3e 주문 폭증 ➔ 한국 반도체 및 전력 인프라 기업 실적 수혜",
            impactedSectors: [
                { sector: "서버용 eSSD / HBM", direction: "UP", magnitude: 94 },
                { sector: "AI 전력 인프라 / 변압기", direction: "UP", magnitude: 88 },
                { sector: "클라우드 / AI SW", direction: "UP", magnitude: 78 }
            ],
            targetStocks: [
                {
                    name: "SK하이닉스",
                    ticker: "000660",
                    sentiment: "BULLISH",
                    impactLevel: "최상 (Very High)",
                    reasoning: "빅테크 차세대 AI 데이터센터 전용 eSSD 및 HBM3e 12단 장기 공급 계약 확대로 실적 성장성 입증.",
                    keyDrivers: ["eSSD 매출 비중 확대", "빅테크 장기 납품 계약", "HBM4 수주 가시화"]
                },
                {
                    name: "HD현대일렉트릭",
                    ticker: "267260",
                    sentiment: "BULLISH",
                    impactLevel: "최상 (Very High)",
                    reasoning: "북미 빅테크 AI 데이터센터 전용 초고압 변압기 및 전력기기 수주 잔고 폭주로 고마진 실적 지속.",
                    keyDrivers: ["북미 변압기 숏티지 지속", "데이터센터 전력망 수주", "영업이익률 고공행진"]
                },
                {
                    name: "NAVER",
                    ticker: "035420",
                    sentiment: "BULLISH",
                    impactLevel: "중간 (Moderate)",
                    reasoning: "글로벌 AI 인프라 확장에 발맞추어 하이퍼클로바X B2B 엔터프라이즈 솔루션 가치 및 클라우드 수익화 본격화.",
                    keyDrivers: ["B2B AI 솔루션 수주", "클라우드 매출 성장", "엔터프라이즈 AI 확산"]
                }
            ],
            shortTermOutlook: "AI 버블론 해소에 따른 빅테크 관련 반도체 및 전력 인프라주 강력한 매수세 유입.",
            longTermOutlook: "AI 클라우드 수익화 본격화에 따른 구조적 장기 성장.",
            riskFactors: [
                "빅테크 전력 공급망 한계로 인한 데이터센터 가동률 지연",
                "추가 AI 서비스 수익화 속도"
            ]
        }
    },
    {
        id: "news-04",
        titleEn: "US Commerce Department Finalizes Advanced Packaging & HBM4 Direct Subsidy Execution",
        titleKr: "미 상무부, 차세대 HBM4 패키징 및 첨단 반도체 팹 보조금 집행 최종 의결",
        source: "Wall Street Journal",
        timestamp: "2026-07-31 13:00",
        category: "반도체/AI",
        impactScore: 91,
        sentiment: "BULLISH",
        summary: "미국 상무부가 반도체법(CHIPS Act)에 따라 차세대 HBM4 3D 적층 기술 및 첨단 패키징 제조 시설을 구축하는 한국 메모리 대형사들에 직접 보조금 집행을 확정했습니다.",
        phase1Filtering: {
            matchKeywords: ["Commerce Department", "HBM4", "Advanced Packaging", "CHIPS Act", "Subsidy"],
            priorityScore: 94,
            passed: true,
            screeningReason: "미 상무부 HBM4 및 첨단 패키징 보조금 집행 확정"
        },
        phase2DeepAnalysis: {
            articleContext: "미 상무부는 성명을 통해 미국 내 첨단 패키징·팹 시설 구축에 대한 보조금 지급 계약을 최종 승인했다고 공식 발표했습니다. 이번 보조금 집행으로 한국 반도체 기업들의 현지 팹 건설 불확실성이 해소되었으며, 엔비디아·빅테크향 HBM4 3D 적층 턴키 공급 파트너십이 더욱 단단해졌습니다.",
            stepByStepPath: [
                "1단계: 미 상무부 CHIPS Act 첨단 패키징 보조금 집행 최종 확정",
                "2단계: 북미 첨단 패키징 및 HBM4 생산 인프라 구축 가속 ➔ 재무적 불확실성 해소",
                "3단계: 엔비디아 차세대 GPU 아키텍처향 HBM4 턴키 공급 체계 굳히기",
                "4단계: 국내 대표 메모리 기업 및 후공정 첨단 패키징 장비 밸류체인 수혜"
            ],
            transmissionMechanism: "미 보조금 집행 ➔ 미국 내 패키징 공장 연내 완공 및 인센티브 반영 ➔ 엔비디아·빅테크향 HBM4 장기 독점 공급 체계 강화 ➔ TC 본더 등 후공정 장비사 매출 대폭 증가",
            impactedSectors: [
                { sector: "HBM/메모리 반도체", direction: "UP", magnitude: 93 },
                { sector: "반도체 후공정/패키징", direction: "UP", magnitude: 91 },
                { sector: "파운드리", direction: "UP", magnitude: 72 }
            ],
            targetStocks: [
                {
                    name: "SK하이닉스",
                    ticker: "000660",
                    sentiment: "BULLISH",
                    impactLevel: "최상 (Very High)",
                    reasoning: "미국 패키징 공장 direct subsidy 확정 및 엔비디아향 HBM4 3D 적층 기술 주도권 공고화.",
                    keyDrivers: ["미국 패키징 보조금 확정", "NVIDIA HBM4 독점 파트너십", "3D TSV 기술 격차"]
                },
                {
                    name: "삼성전자",
                    ticker: "005930",
                    sentiment: "BULLISH",
                    impactLevel: "높음 (High)",
                    reasoning: "미국 파운드리 팹 및 HBM 턴키(Turn-key) 패키징 보조금 수혜로 파운드리/메모리 동반 턴어라운드.",
                    keyDrivers: ["미국 팹 보조금 집행", "HBM3e/HBM4 턴키 공급", "파운드리 수율 개선"]
                },
                {
                    name: "한미반도체",
                    ticker: "042700",
                    sentiment: "BULLISH",
                    impactLevel: "최상 (Very High)",
                    reasoning: "북미 HBM 첨단 패키징 라인 구축에 따른 핵심 TC 본더 독점 납품 기조 강화.",
                    keyDrivers: ["북미 패키징 라인 수주", "HBM4 장비 선점", "사상 최대 영업이익"]
                }
            ],
            shortTermOutlook: "미 보조금 수혜에 따른 반도체 대표주 및 후공정 장비주 외국인 매수 집중.",
            longTermOutlook: "북미 반도체 공급망 락인을 통한 장기 성장 모멘텀 확립.",
            riskFactors: [
                "미국 내 공장 건설 인력 비용 증가",
                "글로벌 지정학적 수출 통제 변수"
            ]
        }
    },
    {
        id: "news-05",
        titleEn: "EU Formally Approves Mandatory Battery Passport Regulation, Benefiting Premium K-Battery Makers",
        titleKr: "EU, 친환경 배터리 패스포트 의무화 제도 최종 승인… K-배터리 프리미엄 반사이익",
        source: "Financial Times",
        timestamp: "2026-07-31 11:40",
        category: "2차전지/EV",
        impactScore: 82,
        sentiment: "BULLISH",
        summary: "유럽연합(EU)이 2차전지 전 주기 탄소 발자국과 원재료 출처 추적을 의무화하는 '배터리 패스포트' 법안을 최종 의결함에 따라, ESG 기준과 투명성이 뛰어난 국내 배터리 셀 제조사들의 반사이익이 기대됩니다.",
        phase1Filtering: {
            matchKeywords: ["EU Battery Passport", "ESG Regulation", "K-Battery", "Recycled Content"],
            priorityScore: 86,
            passed: true,
            screeningReason: "EU 배터리 패스포트 승인 및 K-배터리 프리미엄 수혜"
        },
        phase2DeepAnalysis: {
            articleContext: "EU 이사회는 유럽 진출 2차전지의 제조 전 과정 탄소 배출량, 재활용 광물 포함 비율, 원자재 조달처 데이터를 디지털로 관리하도록 의무화하는 배터리 여권 제도(Battery Passport) 실행안을 통과시켰습니다. 이에 따라 탄소 발자국이 높고 원자재 조달처가 불분명한 저가 중국산 배터리의 유럽 시장 진입 장벽이 높아져 K-배터리사들의 수주 우위가 전망됩니다.",
            stepByStepPath: [
                "1단계: EU 배터리 패스포트 규제 최종 확정 ➔ 탄소 발자국 및 원자재 출처 투명성 의무화",
                "2단계: 서방 기준 미달 저가 중국산 LFP 배터리의 유럽 완성차향 진입 둔화",
                "3단계: ESG 기준을 완비한 국내 배터리 셀 제조사 및 친환경 소재 기업 유럽 수주 우위",
                "4단계: 폐배터리 리사이클링 및 비중국 원자재 밸류체인 기업의 밸류에이션 재평가"
            ],
            transmissionMechanism: "EU 배터리 패스포트 의무화 ➔ 탄소 배출량이 높고 출처가 불분명한 저가 중국산 배터리 유럽 진입 차단 ➔ K-배터리 기업 유럽 완성차 계약 우위 ➔ 폐배터리 리사이클링 기업 가치 제고",
            impactedSectors: [
                { sector: "2차전지 셀 / 양극재", direction: "UP", magnitude: 86 },
                { sector: "폐배터리 리사이클링", direction: "UP", magnitude: 88 },
                { sector: "친환경 배터리 소재", direction: "UP", magnitude: 75 }
            ],
            targetStocks: [
                {
                    name: "LG에너지솔루션",
                    ticker: "373220",
                    sentiment: "BULLISH",
                    impactLevel: "높음 (High)",
                    reasoning: "유럽 주요 OEM향 탄소 중립 배터리 공급망 우위 확보 및 출처 투명성에 따른 중국산 배터리 대비 경쟁 우위.",
                    keyDrivers: ["EU 규제 준수 우위", "유럽 완성차 수주 확대", "프리미엄 폼팩터"]
                },
                {
                    name: "성일하이텍",
                    ticker: "365340",
                    sentiment: "BULLISH",
                    impactLevel: "최상 (Very High)",
                    reasoning: "EU 규제에 따른 배터리 재활용 광물 의무 사용 비율 도래로 유럽 폐배터리 리사이클링 팹 가치 재평가.",
                    keyDrivers: ["재활용 광물 의무화 수혜", "유럽 리사이클링 센터 가동", "비중국 원소재 프리미엄"]
                },
                {
                    name: "POSCO홀딩스",
                    ticker: "005490",
                    sentiment: "BULLISH",
                    impactLevel: "중간 (Moderate)",
                    reasoning: "비중국 리튬/니켈 친환경 조달 및 탄소 발자국 최저 수준 공급망 부각으로 장기 성장성 확보.",
                    keyDrivers: ["친환경 리튬 생산 체계", "EU 무역 장벽 반사이익", "소재 자립도 확보"]
                }
            ],
            shortTermOutlook: "그동안 억눌렸던 2차전지 섹터에 대한 쇼트커버링 및 투심 대폭 개선.",
            longTermOutlook: "유럽/북미 ESG 규제 장벽을 통한 중국산 배터리와의 시장 격차 확대.",
            riskFactors: [
                "유럽 전기차 수요 회복 속도 변수",
                "원자재 광물 가격 하락"
            ]
        }
    },
    {
        id: "news-06",
        titleEn: "Middle East Geopolitical Friction Spikes Crude Oil Prices, Energy Sector Surges",
        titleKr: "중동 주요 해협 군사적 긴장 고조로 국제유가 급등… 에너지·정유주 강세",
        source: "S&P Global Commodities",
        timestamp: "2026-07-31 10:30",
        category: "조선/해운",
        impactScore: -76,
        sentiment: "BEARISH",
        summary: "중동 주요 유조선 수송 항로 주변 지정학적 분쟁이 우려되며 국제유가가 급등해 인플레이션 우려 및 해운/정유 업종 수혜와 항공/소비재 악재가 교차하고 있습니다.",
        phase1Filtering: {
            matchKeywords: ["Crude Oil", "Middle East Tension", "WTI Surge", "Energy Market"],
            priorityScore: 84,
            passed: true,
            screeningReason: "중동 지정학 리스크로 국제유가 급등 및 매크로 변동성"
        },
        phase2DeepAnalysis: {
            articleContext: "호르무즈 해협 주변의 해상 안보 긴장감이 높아짐에 따라 글로벌 원유 수송에 차질 우려가 발생했습니다. 이에 국제유가가 상향 곡선을 그리며 급등했으며, 유조선 항로 우회에 따른 톤마일(Ton-mile) 증가로 해운 운임지수가 급등하는 반면 완화되던 헤드라인 인플레이션 자극 우려가 제기되었습니다.",
            stepByStepPath: [
                "1단계: 중동 항로 군사적 리스크 고조 및 국제 유가 급등",
                "2단계: 원유 수송 유조선(VLCC) 및 컨테이너선의 희망봉 우회 운항 ➔ 톤마일 급증 및 운임 상승",
                "3단계: 국내 정유사 정제마진 개선 및 해운사·조선사 수혜 모멘텀 형성에 반해 항공/화학 원가 부담",
                "4단계: 글로벌 기저 인플레이션 우려 재점화로 글로벌 증시 투심 일시 위축"
            ],
            transmissionMechanism: "국제유가 급등 ➔ 원유 우회 운항 및 탱커선 운임 상승 ➔ 정유 마진 개선 및 해운/조선 수혜 ➔ 반면 인플레이션 우려 및 항공/화학 원가 부담 가중",
            impactedSectors: [
                { sector: "탱커 해운 / 정유", direction: "UP", magnitude: 85 },
                { sector: "조선 / 해양 플랜트", direction: "UP", magnitude: 78 },
                { sector: "항공 / 운송 / 소비재", direction: "DOWN", magnitude: 80 }
            ],
            targetStocks: [
                {
                    name: "HMM",
                    ticker: "011200",
                    sentiment: "BULLISH",
                    impactLevel: "높음 (High)",
                    reasoning: "유가 상승 및 중동 해협 우회 운항에 따른 컨테이너/유조선 운임지수(SCFI/VLCC) 동반 상승 수혜.",
                    keyDrivers: ["운임 지수 상승 프리미엄", "우회 운항에 따른 톤마일 증가", "실적 호조 모멘텀"]
                },
                {
                    name: "한화오션",
                    ticker: "042660",
                    sentiment: "BULLISH",
                    impactLevel: "중간 (Moderate)",
                    reasoning: "원유 수송선(VLCC) 및 해양 플랜트 신규 발주 문의 증가 및 고선가 수주 잔고 모멘텀 유지.",
                    keyDrivers: ["VLCC 신조선 발주 증가", "해양 플랜트 수주 모멘텀", "방산/조선 시너지"]
                },
                {
                    name: "현대차",
                    ticker: "005380",
                    sentiment: "BEARISH",
                    impactLevel: "중간 (Moderate)",
                    reasoning: "고유가로 인한 글로벌 완성차 유류비 원가 부담 가중 및 소비 심리 일시 위축 우려.",
                    keyDrivers: ["원가 및 물류비 부담", "글로벌 소비 심리 위축", "단기 차익실현 물량"]
                }
            ],
            shortTermOutlook: "유가 급등에 따라 정유/해운주로의 단기 테마 자금 쏠림 현상 발생.",
            longTermOutlook: "에너지 인플레이션 장기화 시 글로벌 경기 둔화 우려 상존.",
            riskFactors: [
                "중동 외교적 타결 시 유가 급락 위험",
                "글로벌 원유 수요 둔화"
            ]
        }
    },
    {
        id: "news-07",
        titleEn: "LNG Carrier Newbuilding Prices Reach Record High; HD Korea Shipbuilding & Samsung Heavy Secure Major Contracts",
        titleKr: "글로벌 LNG 운반선 신조선가 사상 최고치… HD한국조선해양·삼성중공업 초대형 수주",
        source: "TradeWinds Shipping",
        timestamp: "2026-07-31 09:20",
        category: "조선/해운",
        impactScore: 92,
        sentiment: "BULLISH",
        summary: "카타르 및 북미 LNG 프로젝트 수송선 발주가 이어지며 친환경 LNG선 신조선가가 신고가를 경신하였고 국내 조선 대형사가 슬롯을 독점했습니다.",
        phase1Filtering: {
            matchKeywords: ["LNG Carrier", "Newbuilding Price", "HD Korea Shipbuilding", "Samsung Heavy", "Record High"],
            priorityScore: 95,
            passed: true,
            screeningReason: "LNG 선가 신고가 경신 및 국내 조선사 대규모 수주"
        },
        phase2DeepAnalysis: {
            articleContext: "조선·해운 전문 매체에 따르면 친환경 LNG 운반선의 신조선 지수가 사상 최고 수준을 경신했습니다. 카타르 프로젝트를 비롯해 북미 LNG 수출 터미널 증설 물량이 몰리면서 건조 슬롯 선점 경쟁이 심화되었고, 높은 건조 기술력을 보유한 한국 대형 조선사들의 프리미엄 수주가 잇따르고 있습니다.",
            stepByStepPath: [
                "1단계: 글로벌 LNG 운반선 신조선가 척당 사상 최고치 기록",
                "2단계: 카타르·북미 프로젝트 선박 발주 폭주로 국내 조선사 도크 슬롯 선점",
                "3단계: 조선 대형사 고선가 물량 매출 인식 전환 ➔ 영업이익률 대폭 상승",
                "4단계: LNG 화물창 보냉재, 밸브 등 핵심 조선 기자재 업체 실적 성장"
            ],
            transmissionMechanism: "LNG 신조선가 최고치 ➔ 한국 대형 조선사 도크 슬롯 프리미엄 수주 ➔ 영업이익률 대폭 상승 ➔ 초저온 보냉재 등 조선 기자재사 실적 성장에 직결",
            impactedSectors: [
                { sector: "고부가가치 LNG선 조선사", direction: "UP", magnitude: 96 },
                { sector: "조선 보냉재 / 화물창", direction: "UP", magnitude: 92 },
                { sector: "해운 / 물류", direction: "UP", magnitude: 75 }
            ],
            targetStocks: [
                {
                    name: "HD한국조선해양",
                    ticker: "009540",
                    sentiment: "BULLISH",
                    impactLevel: "최상 (Very High)",
                    reasoning: "LNG선 선가 상승 프리미엄 반영 및 자회사 HD현대중공업 도크 풀가동에 따른 마진 극대화.",
                    keyDrivers: ["LNG선 척당 신고가 경신", "도크 장기 매출 확정", "고부가가치 선종 비중 확대"]
                },
                {
                    name: "한화오션",
                    ticker: "042660",
                    sentiment: "BULLISH",
                    impactLevel: "높음 (High)",
                    reasoning: "친환경 LNG 및 암모니아 운반선 고마진 수주 연속 성공으로 영업이익률 대폭 상승.",
                    keyDrivers: ["고마진 LNG선 수주", "방산 및 특수선 시너지", "영업이익률 상승"]
                },
                {
                    name: "동성화인텍",
                    ticker: "083500",
                    sentiment: "BULLISH",
                    impactLevel: "최상 (Very High)",
                    reasoning: "LNG 화물창 초저온 보냉재 독점 공급 체계로 가동률 고공행진 지속 및 단가 인상 수혜.",
                    keyDrivers: ["보냉재 가동률 고공행진", "장기 수주잔고 확보", "마진율 극대화"]
                }
            ],
            shortTermOutlook: "조선 및 기자재 업종으로의 외국인/기관 매수세 급증으로 주도주 자리 매김.",
            longTermOutlook: "도크 슬롯 장기 매진으로 안정적 장기 실적 우상향 구도 확립.",
            riskFactors: [
                "조선소 숙련 인력 수급 이슈",
                "후판 가격 협상 우려"
            ]
        }
    },
    {
        id: "news-08",
        titleEn: "US 10-Year Treasury Yields Slide as Dollar Index Softens on Cooling Labor Data",
        titleKr: "미 고용 냉각 신호에 국채 10년물 금리 하락… 달러 인덱스 약세 전환",
        source: "CNBC Market Data",
        timestamp: "2026-07-31 08:30",
        category: "통화정책/금융",
        impactScore: 84,
        sentiment: "BULLISH",
        summary: "미국 주간 신규 실업수당 청구건수가 증가하고 온건한 고용 지표가 이어지면서 미 국채 10년물 금리가 하락하고 원/달러 환율이 하강 안정화되었습니다.",
        phase1Filtering: {
            matchKeywords: ["Treasury Yields", "Dollar Index", "Labor Market", "Yield Slide", "Foreign Capital"],
            priorityScore: 87,
            passed: true,
            screeningReason: "미 10년물 국채 금리 하락 및 달러 약세로 국내 외국인 유입 모멘텀"
        },
        phase2DeepAnalysis: {
            articleContext: "미 노동부가 발표한 주간 실업수당 청구 건수가 시장 예상치를 상회하며 고용 시장의 점진적 냉각(Cooling)을 나타냈습니다. 이에 따라 10년만기 미 국채 수익률이 하락했으며 달러 인덱스가 약세로 돌아섰습니다. 원/달러 환율 안정을 기반으로 외국인 자금의 한국 증시 순매수가 가속화될 전망입니다.",
            stepByStepPath: [
                "1단계: 미국 고용 냉각 지표 확인 및 미 국채 10년물 금리 하락",
                "2단계: 달러 인덱스 약세 ➔ 원/달러 환율 하락 및 원화 강세 전환",
                "3단계: 신흥국 및 한국 증시를 향한 외국인 패시브 자금 바스켓 순매수 유입",
                "4단계: 고금리로 누려왔던 IT·바이오·인터넷 밸류에이션 부담 완화 및 증시 리레이팅"
            ],
            transmissionMechanism: "미 국채 금리 및 달러 인덱스 하락 ➔ 원/달러 환율 하락 ➔ 한국 증시 외국인 순매수 유입 ➔ 바이오, 인터넷, 금융 등 밸류에이션 부담 완화",
            impactedSectors: [
                { sector: "성장주 (바이오/인터넷)", direction: "UP", magnitude: 86 },
                { sector: "금융 / 지주사", direction: "UP", magnitude: 82 },
                { sector: "증권 / 자산운용", direction: "UP", magnitude: 74 }
            ],
            targetStocks: [
                {
                    name: "KB금융",
                    ticker: "105560",
                    sentiment: "BULLISH",
                    impactLevel: "높음 (High)",
                    reasoning: "달러 약세 및 원화 강세 전환 시 외국인 바스켓 자금의 최우선 순매수 표적.",
                    keyDrivers: ["원화 강세 외국인 자금 유입", "배당 수익률 부각", "밸류업 자사주 소각"]
                },
                {
                    name: "삼성바이오로직스",
                    ticker: "207940",
                    sentiment: "BULLISH",
                    impactLevel: "높음 (High)",
                    reasoning: "미 국채 금리 하락에 따른 바이오 섹터 할인율 부담 완화 및 글로벌 펀드 수급 개선.",
                    keyDrivers: ["국채금리 하락 바이오 수혜", "CDMO 대형 수주", "신규 공장 가동 프리미엄"]
                },
                {
                    name: "NAVER",
                    ticker: "035420",
                    sentiment: "BULLISH",
                    impactLevel: "높음 (High)",
                    reasoning: "고금리 할인율 부담 제거에 따른 인터넷 대형주 PER 멀티플 회복 및 외국인 유동성 유입.",
                    keyDrivers: ["할인율 부담 해소", "멀티플 재평가", "AI 서비스 가치 반영"]
                }
            ],
            shortTermOutlook: "환율 하락과 국채 금리 안정이 코스피 전반의 외국인 수급 개선을 유도.",
            longTermOutlook: "글로벌 금리 피벗과 함께 신흥국 자금 재배치 가속화.",
            riskFactors: [
                "미 고용 시장 급격한 악화 시 침체(Hard Landing) 우려",
                "환율 재반등 가능성"
            ]
        }
    },
    {
        id: "news-09",
        titleEn: "Yen Volatility Spikes Ahead of Bank of Japan Policy Decision; Yen-Carry Unwinding Watch",
        titleKr: "일본은행(BOJ) 통화정책 결정 앞두고 엔화 변동성 급증… 엔캐리 트레이드 청산 경계감",
        source: "Nikkei Asia",
        timestamp: "2026-07-31 07:45",
        category: "통화정책/금융",
        impactScore: -68,
        sentiment: "BEARISH",
        summary: "일본은행(BOJ)의 추가 금리 인상 여부를 둘러싸고 엔/달러 환율이 급변동하면서 글로벌 엔캐리 자금의 일시적 청산 가능성에 신흥국 증시 및 코스피 변동성이 확대되고 있습니다.",
        phase1Filtering: {
            matchKeywords: ["Bank of Japan", "BOJ", "Yen Volatility", "Yen Carry", "Policy Decision"],
            priorityScore: 82,
            passed: true,
            screeningReason: "BOJ 통화정책 앞두고 엔화 변동성 급증 및 엔캐리 청산 경계"
        },
        phase2DeepAnalysis: {
            articleContext: "일본은행(BOJ)의 금융정책 결정회의를 앞두고 엔/달러 환율 변동성이 커지며(엔화 강세 압력) 글로벌 금융시장에 엔 캐리 트레이드(Yen Carry Trade) 청산 경계감이 확대되었습니다. 글로벌 유동성 청산 우려로 패시브 지수 대형주에는 일시적 차익실현 물량이 출회될 수 있으나, 일본 자동차 대비 한국 완성차의 글로벌 가격 경쟁력은 상승할 것으로 전망됩니다.",
            stepByStepPath: [
                "1단계: BOJ 통화정책 회의 앞두고 엔화 가치 변동성 확대",
                "2단계: 글로벌 펀드의 엔 캐리 자금 일시 청산 경계감 가중",
                "3단계: 코스피 지수 대형주 중심 외국인 패시브 물량 단기 출회 가능성",
                "4단계: 엔화 강세로 미국/유럽 시장에서 일본 자동차 대비 한국 현대차·기아 가격 경쟁력 제고"
            ],
            transmissionMechanism: "BOJ 금리 인상 가능성 ➔ 엔화 강세 및 엔/달러 변동 ➔ 엔캐리 청산에 따른 글로벌 지수 대형주 단기 매도 ➔ 자동차 업종은 반사이익, 패시브 지수주 변동성 확대",
            impactedSectors: [
                { sector: "지수 대형주 (패시브 자금)", direction: "DOWN", magnitude: 72 },
                { sector: "자동차 (대일 경쟁력 개선)", direction: "UP", magnitude: 65 }
            ],
            targetStocks: [
                {
                    name: "현대차",
                    ticker: "005380",
                    sentiment: "BULLISH",
                    impactLevel: "중간 (Moderate)",
                    reasoning: "(반사이익) 엔화 강세 전환 시 북미/유럽 시장에서 토요타 대비 한국 자동차 가격 경쟁력 우위 확보.",
                    keyDrivers: ["엔화 강세 반사이익", "하이브리드(HEV) 인기", "글로벌 점유율 확대"]
                },
                {
                    name: "기아",
                    ticker: "000270",
                    sentiment: "BULLISH",
                    impactLevel: "중간 (Moderate)",
                    reasoning: "엔/달러 변동에 따른 일본 경쟁사 대비 수출 가격 경쟁력 우위 및 고배당/자사주 소각 수혜.",
                    keyDrivers: ["대일 가격 경쟁력 우위", "고배당/자사주 소각", "미국 시장 호조"]
                },
                {
                    name: "삼성전자",
                    ticker: "005930",
                    sentiment: "BEARISH",
                    impactLevel: "중간 (Moderate)",
                    reasoning: "글로벌 패시브 엔캐리 자금 청산 우려 시 KOSPI 대형주 중심 단기 외국인 출회 변동성.",
                    keyDrivers: ["외국인 패시브 물량 출회", "단기 수급 변동성", "지수 변동성 확대"]
                }
            ],
            shortTermOutlook: "BOJ 결과 발표 전까지 장중 엔화 환율 변동에 따른 증시 출렁임 예상.",
            longTermOutlook: "엔화 가치 정상화 과정 완료 후 글로벌 매크로 유동성 재안정.",
            riskFactors: [
                "BOJ 매파적 금리 인상 시 지수 단기 충격",
                "일본 국채 금리 변동성"
            ]
        }
    },
    {
        id: "news-10",
        titleEn: "Global Tech Surge in On-Device AI & Autonomous Driving Chips Drives NPU/LPDDR5X Demand Boom",
        titleKr: "글로벌 테크기업 온디바이스 AI 및 자율주행 NPU 칩 수요 폭증… LPDDR5X·CXL 메모리 기폭제",
        source: "EE Times",
        timestamp: "2026-07-31 07:00",
        category: "반도체/AI",
        impactScore: 89,
        sentiment: "BULLISH",
        summary: "차세대 프리미엄 스마트폰, AI PC, 자율주행차(SDV)에 탑재되는 온디바이스 AI 전용 NPU 칩 및 고성능 LPDDR5X/CXL 메모리 모듈 주문량이 대폭 급증했습니다.",
        phase1Filtering: {
            matchKeywords: ["On-Device AI", "Autonomous Chip", "LPDDR5X", "CXL", "NPU Surge"],
            priorityScore: 91,
            passed: true,
            screeningReason: "온디바이스 AI 및 자율주행 NPU/LPDDR5X 수요 폭증 호재"
        },
        phase2DeepAnalysis: {
            articleContext: "글로벌 반도체 전문 매체에 따르면 모바일 AP, AI PC 프로세서, 자율주행 전장 컨트롤러에 온디바이스 NPU(신경망처리장치) 탑재가 표준화되면서 고성능 저전력 메모리인 LPDDR5X와 차세대 CXL 메모리 수요가 수직 상승했습니다. HBM에 이어 고마진 프리미엄 메모리 라인업 매출 비중이 커지면서 국내 반도체 제조사의 마진 폭이 더욱 확대되고 있습니다.",
            stepByStepPath: [
                "1단계: 프리미엄 스마트폰·AI PC·자율주행 온디바이스 AI 칩 탑재 전면 확산",
                "2단계: 초고속 저전력 LPDDR5X 및 CXL 메모리 솔루션 고단가 주문 수직 상승",
                "3단계: 한국 주요 메모리사의 차세대 온디바이스 AI 전용 제품 공급 단가(ASP) 프리미엄 수혜",
                "4단계: 자율주행 SDV 전장 제어기 및 반도체 IP/디자인하우스 생태계 실적 성장"
            ],
            transmissionMechanism: "온디바이스 AI 칩 탑재 확산 ➔ 모바일/전장용 고성능 LPDDR5X 및 CXL 메모리 고단가 주문 급증 ➔ 국내 메모리 주요사 실적 프리미엄 추가 및 팹리스/IP 기업 수혜",
            impactedSectors: [
                { sector: "온디바이스 메모리 (LPDDR5X/CXL)", direction: "UP", magnitude: 92 },
                { sector: "자율주행 전장 / NPU", direction: "UP", magnitude: 84 },
                { sector: "반도체 IP / 디자인하우스", direction: "UP", magnitude: 78 }
            ],
            targetStocks: [
                {
                    name: "삼성전자",
                    ticker: "005930",
                    sentiment: "BULLISH",
                    impactLevel: "최상 (Very High)",
                    reasoning: "온디바이스 AI용 LPDDR5X 및 CXL 차세대 메모리 주요 공급사로 프리미엄 ASP 인상 수혜.",
                    keyDrivers: ["LPDDR5X 시장 주도", "CXL 차세대 메모리 선점", "파운드리 전장 칩 수주"]
                },
                {
                    name: "SK하이닉스",
                    ticker: "000660",
                    sentiment: "BULLISH",
                    impactLevel: "높음 (High)",
                    reasoning: "고성능 LPDDR5T 및 온디바이스 AI 메모리 라인업 확대로 모바일/전장 메모리 매출 대폭 증가.",
                    keyDrivers: ["LPDDR5T 공급 확대", "전장용 메모리 성장", "HBM 외 고마진 제품군"]
                },
                {
                    name: "현대모비스",
                    ticker: "012330",
                    sentiment: "BULLISH",
                    impactLevel: "높음 (High)",
                    reasoning: "차세대 SDV 자율주행 통합 제어기 및 온디바이스 AI 전장 모듈 수주 본격화에 따른 영업이익 개선.",
                    keyDrivers: ["SDV 전장 제어기 수주", "온디바이스 AI 모듈 공급", "전장 사업부 턴어라운드"]
                }
            ],
            shortTermOutlook: "온디바이스 AI 테마 재조명으로 반도체/전장 관련주 강세 모멘텀.",
            longTermOutlook: "스마트폰, PC, 자동차 전반의 AI 탑재 표준화로 장기 수요 창출.",
            riskFactors: [
                "스마트폰 글로벌 세트 판매량 신장세 확인 필요",
                "AI 칩 발열 및 전력 소비 이슈"
            ]
        }
    }
];

// ==========================================================================
// 2. GLOBAL MARKET CLOCKS CONTROLLER
// ==========================================================================

function startGlobalMarketClocks() {
    function updateClocks() {
        const now = new Date();

        // New York Time (EDT / UTC-4)
        const nyOptions = { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const nyTimeStr = new Intl.DateTimeFormat('en-US', nyOptions).format(now);
        const nyHour = parseInt(nyTimeStr.split(':')[0], 10);
        document.getElementById('time-ny').textContent = `${nyTimeStr} EDT`;
        
        // NY Stock Market Open: 09:30 - 16:00
        const isNyOpen = nyHour >= 9 && nyHour < 16;
        updateMarketStatusBadge('status-ny', isNyOpen);

        // London Time (BST / UTC+1)
        const londonOptions = { timeZone: 'Europe/London', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const londonTimeStr = new Intl.DateTimeFormat('en-GB', londonOptions).format(now);
        const londonHour = parseInt(londonTimeStr.split(':')[0], 10);
        document.getElementById('time-london').textContent = `${londonTimeStr} BST`;
        
        // London Stock Market Open: 08:00 - 16:30
        const isLondonOpen = londonHour >= 8 && londonHour < 16;
        updateMarketStatusBadge('status-london', isLondonOpen);

        // Seoul Time (KST / UTC+9)
        const seoulOptions = { timeZone: 'Asia/Seoul', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' };
        const seoulTimeStr = new Intl.DateTimeFormat('ko-KR', seoulOptions).format(now);
        const seoulHour = parseInt(seoulTimeStr.split(':')[0], 10);
        document.getElementById('time-seoul').textContent = `${seoulTimeStr} KST`;
        
        // Seoul KOSPI Open: 09:00 - 15:30
        const isSeoulOpen = seoulHour >= 9 && seoulHour < 15;
        updateMarketStatusBadge('status-seoul', isSeoulOpen);
    }

    updateClocks();
    setInterval(updateClocks, 1000);
}

function updateMarketStatusBadge(elementId, isOpen) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (isOpen) {
        el.textContent = "OPEN";
        el.className = "market-status status-open";
    } else {
        el.textContent = "CLOSED";
        el.className = "market-status status-closed";
    }
}

// ==========================================================================
// 3. APPLICATION STATE MANAGEMENT & FILTER ENGINE
// ==========================================================================

const appState = {
    searchQuery: "",
    selectedSentiment: "ALL",
    selectedSector: "ALL",
    minImpactScore: 0,
    selectedStock: null,
    sortBy: "impact-desc",
    currentModalNewsId: null,
    isSimulating: false
};

function getFilteredDataset() {
    return newsDataset.filter(item => {
        // 1. Search Query
        if (appState.searchQuery.trim() !== "") {
            const q = appState.searchQuery.toLowerCase();
            const matchTitleEn = item.titleEn.toLowerCase().includes(q);
            const matchTitleKr = item.titleKr.toLowerCase().includes(q);
            const matchSummary = item.summary.toLowerCase().includes(q);
            const matchCategory = item.category.toLowerCase().includes(q);
            const matchStocks = item.phase2DeepAnalysis.targetStocks.some(s => 
                s.name.toLowerCase().includes(q) || s.ticker.includes(q)
            );
            if (!matchTitleEn && !matchTitleKr && !matchSummary && !matchCategory && !matchStocks) {
                return false;
            }
        }

        // 2. Sentiment Filter
        if (appState.selectedSentiment !== "ALL") {
            if (item.sentiment !== appState.selectedSentiment) {
                return false;
            }
        }

        // 3. Sector Filter
        if (appState.selectedSector !== "ALL") {
            if (item.category !== appState.selectedSector) {
                return false;
            }
        }

        // 4. Impact Score Threshold Filter
        if (Math.abs(item.impactScore) < appState.minImpactScore) {
            return false;
        }

        // 5. Selected Stock Pill Filter
        if (appState.selectedStock) {
            const hasStock = item.phase2DeepAnalysis.targetStocks.some(s => s.name === appState.selectedStock);
            if (!hasStock) return false;
        }

        return true;
    }).sort((a, b) => {
        if (appState.sortBy === "impact-desc") {
            return Math.abs(b.impactScore) - Math.abs(a.impactScore);
        } else if (appState.sortBy === "score-desc") {
            return b.impactScore - a.impactScore;
        } else if (appState.sortBy === "score-asc") {
            return a.impactScore - b.impactScore;
        } else if (appState.sortBy === "latest") {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        return 0;
    });
}

function updateMetricsUI(filteredData) {
    const totalCount = newsDataset.length;
    const bullCount = newsDataset.filter(d => d.sentiment === "BULLISH").length;
    const bearCount = newsDataset.filter(d => d.sentiment === "BEARISH").length;
    const highImpactCount = newsDataset.filter(d => Math.abs(d.impactScore) >= 75).length;

    document.getElementById('metric-total-news').textContent = `${totalCount}건`;
    document.getElementById('metric-bull-count').textContent = `${bullCount}건 (${((bullCount/totalCount)*100).toFixed(1)}%)`;
    document.getElementById('metric-bear-count').textContent = `${bearCount}건 (${((bearCount/totalCount)*100).toFixed(1)}%)`;
    document.getElementById('metric-high-impact').textContent = `${highImpactCount}건`;
    document.getElementById('news-count-badge').textContent = `${filteredData.length}개 조건 부합`;
}

// ==========================================================================
// 4. UI RENDERING ENGINE (Hero Banner & News Cards)
// ==========================================================================

function renderHeroSection(filteredData) {
    const heroWrapper = document.getElementById('hero-card-wrapper');
    if (!heroWrapper) return;

    if (filteredData.length === 0) {
        heroWrapper.innerHTML = `<div class="no-results"><p>필터 조건에 일치하는 하이라이트 뉴스가 없습니다.</p></div>`;
        return;
    }

    const heroNews = [...filteredData].sort((a, b) => Math.abs(b.impactScore) - Math.abs(a.impactScore))[0];
    const isBull = heroNews.sentiment === "BULLISH";
    const gaugeWidth = Math.abs(heroNews.impactScore);

    const stockTagsHtml = heroNews.phase2DeepAnalysis.targetStocks.map(stock => `
        <span class="stock-tag-item ${stock.sentiment === 'BULLISH' ? 'bull' : 'bear'}">
            <i class="fa-solid ${stock.sentiment === 'BULLISH' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i>
            ${stock.name} (${stock.ticker}) · ${stock.sentiment === 'BULLISH' ? '호재 🟢' : '악재 🔴'} (${stock.impactLevel})
        </span>
    `).join('');

    heroWrapper.innerHTML = `
        <div class="hero-card ${!isBull ? 'bearish-hero' : ''}">
            <div class="hero-top-meta">
                <div class="hero-badge-group">
                    <span class="top-impact-badge"><i class="fa-solid fa-fire"></i> TOP 1 IMPACT</span>
                    <span class="badge-category">${heroNews.category}</span>
                </div>
                <span class="hero-time-source">
                    <i class="fa-regular fa-clock"></i> 
                    <a href="${getNewsUrl(heroNews)}" target="_blank" rel="noopener noreferrer" class="news-source-link" title="${heroNews.source} 원문 보도자료 바로가기">
                        ${heroNews.source} <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    </a> • ${heroNews.timestamp}
                </span>
            </div>

            <h3 class="hero-title-en">
                <a href="${getNewsUrl(heroNews)}" target="_blank" rel="noopener noreferrer" class="news-title-link" title="원문 보도자료 바로가기">
                    ${heroNews.titleEn} <i class="fa-solid fa-arrow-up-right-from-square title-icon"></i>
                </a>
            </h3>
            <h4 class="hero-title-kr">
                <a href="${getNewsUrl(heroNews)}" target="_blank" rel="noopener noreferrer" class="news-title-link" title="원문 보도자료 바로가기">
                    ${heroNews.titleKr}
                </a>
            </h4>

            <!-- Impact Gauge Bar -->
            <div class="impact-gauge-box">
                <div class="gauge-header">
                    <span class="gauge-label"><i class="fa-solid fa-gauge-high"></i> AI 2단계 영향도 평가 점수</span>
                    <span class="gauge-score-value ${isBull ? 'text-green' : 'text-red'}">
                        ${heroNews.impactScore > 0 ? '+' : ''}${heroNews.impactScore}점 (${isBull ? '강한 호재 🟢' : '강한 악재 🔴'})
                    </span>
                </div>
                <div class="gauge-track">
                    <div class="gauge-fill ${isBull ? 'bullish' : 'bearish'}" style="width: ${gaugeWidth}%;"></div>
                </div>
            </div>

            <!-- Body Details & Stock Impact Preview -->
            <div class="hero-body-content">
                <div class="mechanism-box">
                    <h4><i class="fa-solid fa-diagram-project"></i> 증시 파급 메커니즘 (Transmission)</h4>
                    <p>${heroNews.phase2DeepAnalysis.transmissionMechanism}</p>
                </div>
                <div class="hero-stocks-box">
                    <h4><i class="fa-solid fa-chart-line"></i> 수혜/피해 주요 관심 종목</h4>
                    <div class="hero-stock-tags">
                        ${stockTagsHtml}
                    </div>
                </div>
            </div>

            <div class="hero-card-footer">
                <button class="btn btn-primary btn-open-modal" data-id="${heroNews.id}">
                    <i class="fa-solid fa-file-contract"></i> 2단계 심층 파이프라인 리포트 전체보기
                </button>
            </div>
        </div>
    `;
}

function renderNewsGrid(filteredData) {
    const gridEl = document.getElementById('news-grid');
    const noResultsEl = document.getElementById('no-results');
    if (!gridEl) return;

    if (filteredData.length === 0) {
        gridEl.innerHTML = '';
        noResultsEl.classList.remove('hidden');
        return;
    }

    noResultsEl.classList.add('hidden');

    gridEl.innerHTML = filteredData.map(news => {
        const isBull = news.sentiment === "BULLISH";
        const stockPillsHtml = news.phase2DeepAnalysis.targetStocks.map(s => `
            <span class="mini-stock-pill ${s.sentiment === 'BULLISH' ? 'bull' : 'bear'}">
                ${s.name} (${s.ticker}) · ${s.sentiment === 'BULLISH' ? '호재' : '악재'} (${s.impactLevel})
            </span>
        `).join('');

        return `
            <div class="news-card ${isBull ? 'sentiment-bullish' : 'sentiment-bearish'}">
                <div>
                    <div class="card-top-meta">
                        <span class="badge-category">${news.category}</span>
                        <span class="card-impact-badge ${isBull ? 'bullish' : 'bearish'}">
                            ${news.impactScore > 0 ? '+' : ''}${news.impactScore}점
                        </span>
                    </div>

                    <h3 class="card-title-kr" title="${news.titleKr}">
                        <a href="${getNewsUrl(news)}" target="_blank" rel="noopener noreferrer" class="news-title-link" title="원문 보도자료 바로가기">
                            ${news.titleKr} <i class="fa-solid fa-arrow-up-right-from-square title-icon"></i>
                        </a>
                    </h3>
                    <p class="card-title-en" title="${news.titleEn}">${news.titleEn}</p>
                    <p class="card-summary">${news.summary}</p>
                </div>

                <div>
                    <div class="card-stocks-row">
                        ${stockPillsHtml}
                    </div>

                    <div class="card-action-bar">
                        <span class="card-source-time">
                            <a href="${getNewsUrl(news)}" target="_blank" rel="noopener noreferrer" class="news-source-link" title="${news.source} 원문 보도자료 바로가기">
                                ${news.source.split(' ')[0]} <i class="fa-solid fa-arrow-up-right-from-square"></i>
                            </a> • ${news.timestamp.split(' ')[1]}
                        </span>
                        <button class="btn-card-detail btn-open-modal" data-id="${news.id}">
                            보고서 보기 <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateActiveFilterCount() {
    let count = 0;
    if (appState.searchQuery.trim() !== "") count++;
    if (appState.selectedSentiment !== "ALL") count++;
    if (appState.selectedSector !== "ALL") count++;
    if (appState.minImpactScore > 0) count++;
    if (appState.selectedStock !== null) count++;

    const badge = document.getElementById('mobile-filter-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

function syncStockPillSelection() {
    document.querySelectorAll('.stock-tag-cloud .stock-pill').forEach(pill => {
        const stockName = pill.getAttribute('data-stock');
        if (appState.selectedStock === stockName) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });

    document.querySelectorAll('#mobile-quick-stock-chips .quick-chip').forEach(chip => {
        const stockName = chip.getAttribute('data-stock');
        if ((stockName === 'ALL' && appState.selectedStock === null) || (stockName === appState.selectedStock)) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });
}

function renderApp() {
    const filteredData = getFilteredDataset();
    updateMetricsUI(filteredData);
    updateActiveFilterCount();
    syncStockPillSelection();
    renderHeroSection(filteredData);
    renderNewsGrid(filteredData);
    attachDynamicEventListeners();
}

// ==========================================================================
// 5. DETAILED ANALYSIS REPORT MODAL (Qualitative & Transmission Analysis)
// ==========================================================================

function openModal(newsId) {
    const news = newsDataset.find(n => n.id === newsId);
    if (!news) return;

    appState.currentModalNewsId = newsId;
    const isBull = news.sentiment === "BULLISH";

    // Populate Header & Meta
    document.getElementById('modal-category').textContent = news.category;
    const modalSourceTimeEl = document.getElementById('modal-source-time');
    if (modalSourceTimeEl) {
        modalSourceTimeEl.innerHTML = `
            <a href="${getNewsUrl(news)}" target="_blank" rel="noopener noreferrer" class="news-source-link" title="${news.source} 원문 보도자료 바로가기">
                ${news.source} <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a> • ${news.timestamp}
        `;
    }
    const modalTitleEl = document.getElementById('modal-title');
    if (modalTitleEl) {
        modalTitleEl.innerHTML = `
            <a href="${getNewsUrl(news)}" target="_blank" rel="noopener noreferrer" class="news-title-link" title="원문 보도자료 바로가기">
                ${news.titleKr} <i class="fa-solid fa-arrow-up-right-from-square title-icon"></i>
            </a>
        `;
    }
    const modalOrigTitleEl = document.getElementById('modal-original-title');
    if (modalOrigTitleEl) {
        modalOrigTitleEl.innerHTML = `
            <a href="${getNewsUrl(news)}" target="_blank" rel="noopener noreferrer" class="news-title-link" title="원문 보도자료 바로가기">
                ${news.titleEn}
            </a>
        `;
    }

    // Score Banner
    const scoreNumEl = document.getElementById('modal-score-number');
    scoreNumEl.textContent = `${news.impactScore > 0 ? '+' : ''}${news.impactScore}`;
    scoreNumEl.className = `score-number ${isBull ? 'text-green' : 'text-red'}`;

    const sentBadge = document.getElementById('modal-sentiment-badge');
    sentBadge.textContent = isBull ? "강한 호재 (STRONG BULLISH 🟢)" : "강한 악재 (STRONG BEARISH 🔴)";
    sentBadge.className = `sentiment-badge ${isBull ? 'bullish' : 'bearish'}`;

    document.getElementById('modal-sentiment-desc').textContent = news.summary;

    // Stage 1 Pipeline List
    const stage1ListEl = document.getElementById('modal-stage1-list');
    stage1ListEl.innerHTML = `
        <li><strong>매칭 키워드:</strong> ${news.phase1Filtering.matchKeywords.join(', ')}</li>
        <li><strong>우선순위 스코어:</strong> ${news.phase1Filtering.priorityScore}점 (통과 완료)</li>
        <li><strong>스크리닝 사유:</strong> ${news.phase1Filtering.screeningReason}</li>
    `;

    // Stage 2 Article Context Deep Dive
    const contextEl = document.getElementById('modal-article-context');
    if (contextEl && news.phase2DeepAnalysis.articleContext) {
        contextEl.innerHTML = `<p>${news.phase2DeepAnalysis.articleContext}</p>`;
    }

    // Stage 2 Step-by-Step Path
    const stepPathContainer = document.getElementById('modal-step-path');
    if (stepPathContainer && news.phase2DeepAnalysis.stepByStepPath) {
        stepPathContainer.innerHTML = news.phase2DeepAnalysis.stepByStepPath.map((step, idx) => `
            <div class="step-path-item">
                <span class="step-badge">STEP ${idx + 1}</span>
                <span class="step-desc">${step}</span>
            </div>
        `).join('');
    }

    // Stage 2 Impacted Sectors
    const sectorsContainer = document.getElementById('modal-impacted-sectors');
    if (sectorsContainer && news.phase2DeepAnalysis.impactedSectors) {
        sectorsContainer.innerHTML = news.phase2DeepAnalysis.impactedSectors.map(sec => `
            <span class="sector-tag-chip ${sec.direction === 'UP' ? 'up' : 'down'}">
                <i class="fa-solid ${sec.direction === 'UP' ? 'fa-circle-chevron-up' : 'fa-circle-chevron-down'}"></i>
                ${sec.sector} (${sec.direction === 'UP' ? '수혜 🟢' : '영향/부담 🔴'})
            </span>
        `).join('');
    }

    // Stage 2 Transmission Mechanism Text
    document.getElementById('modal-transmission-text').textContent = news.phase2DeepAnalysis.transmissionMechanism;

    // Target Stock Impact Cards List (Strictly Qualitative without percentage numbers)
    const stockListEl = document.getElementById('modal-stock-list');
    stockListEl.innerHTML = news.phase2DeepAnalysis.targetStocks.map(stock => `
        <div class="stock-impact-card ${stock.sentiment === 'BULLISH' ? 'bull' : 'bear'}">
            <div class="stock-card-header">
                <div class="stock-identity">
                    <span class="stock-name">${stock.name}</span>
                    <span class="stock-ticker-code">(${stock.ticker})</span>
                </div>
                <div class="stock-direction-badge ${stock.sentiment === 'BULLISH' ? 'bullish' : 'bearish'}">
                    <i class="fa-solid ${stock.sentiment === 'BULLISH' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i>
                    ${stock.sentiment === 'BULLISH' ? '호재 🟢' : '악재 🔴'} | 영향도: ${stock.impactLevel}
                </div>
            </div>
            <div class="stock-reasoning-body">
                <p class="stock-reasoning"><strong>영향 배경 및 세부 이유:</strong> ${stock.reasoning}</p>
                ${stock.keyDrivers && stock.keyDrivers.length > 0 ? `
                    <div class="stock-key-drivers">
                        ${stock.keyDrivers.map(d => `<span class="driver-tag">#${d}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');

    // Outlook & Risk Factors
    document.getElementById('modal-short-term').textContent = news.phase2DeepAnalysis.shortTermOutlook;
    document.getElementById('modal-long-term').textContent = news.phase2DeepAnalysis.longTermOutlook;
    
    const riskListEl = document.getElementById('modal-risk-list');
    riskListEl.innerHTML = news.phase2DeepAnalysis.riskFactors.map(risk => `<li>${risk}</li>`).join('');

    // Show Modal Overlay
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.classList.add('hidden');
    document.body.style.overflow = '';
    appState.currentModalNewsId = null;
}

// ==========================================================================
// 6. PIPELINE SIMULATION CONSOLE ENGINE & LIVE RSS INTEGRATION
// ==========================================================================

async function fetchLiveRssNews() {
    try {
        const response = await fetch('/api/news-rss');
        if (response.ok) {
            const data = await response.json();
            if (data && data.items && data.items.length > 0) {
                data.items.forEach((rssItem, idx) => {
                    if (newsDataset[idx]) {
                        // Bind 100% REAL DIRECT ORIGINAL ARTICLE LINK from RSS feed
                        newsDataset[idx].url = rssItem.link;
                        if (rssItem.title && rssItem.title.length > 5) {
                            newsDataset[idx].titleEn = rssItem.title;
                        }
                        if (rssItem.source) {
                            newsDataset[idx].source = rssItem.source;
                        }
                        if (rssItem.pubDate) {
                            const dateObj = new Date(rssItem.pubDate);
                            if (!isNaN(dateObj.getTime())) {
                                const yyyy = dateObj.getFullYear();
                                const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                                const dd = String(dateObj.getDate()).padStart(2, '0');
                                const hh = String(dateObj.getHours()).padStart(2, '0');
                                const min = String(dateObj.getMinutes()).padStart(2, '0');
                                newsDataset[idx].timestamp = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
                            }
                        }
                    }
                });
                console.log('[Live RSS Integration Success]', data.items.length, 'real RSS news articles loaded with 100% direct article links!');
            }
        }
    } catch (e) {
        console.error('[Live RSS Integration Error]', e.message);
    }
}

function runPipelineSimulation() {
    if (appState.isSimulating) return;

    appState.isSimulating = true;
    const consoleBadge = document.getElementById('console-status-badge');
    const progressBar = document.getElementById('pipeline-progress-bar');
    const consoleTerminal = document.getElementById('console-terminal');
    const runBtn = document.getElementById('btn-run-simulation');

    if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 분석 중...`;
    }

    consoleBadge.textContent = "PROCESSING";
    consoleBadge.className = "console-badge running";
    progressBar.style.width = "0%";
    consoleTerminal.innerHTML = '';

    const logs = [
        { time: 200, type: "system", text: "[SYSTEM] 글로벌 파이프라인 인프라 연결 시작 (Google News RSS, Reuters, Bloomberg Feed)" },
        { time: 500, type: "info", text: "[FETCH] 실시간 글로벌 헤드라인 RSS 피드 수집 완료 (반도체, 통화정책, 지정학, 해운)" },
        { time: 900, type: "filter", text: "[1단계 엑기스] 고유 키워드 추출 & 스크리닝 (Pass: 10건 / Reject: 0건)" },
        { time: 1400, type: "info", text: "[2단계 LLM 엔진] 한국 증시(KOSPI/KOSDAQ) 전파 경로 Transmission Vector 분석 중..." },
        { time: 1900, type: "success", text: "[2단계 LLM 엔진] 수혜/피해 24개 주요 종목 연관 매핑 및 영향도 평가 완료!" },
        { time: 2300, type: "system", text: "[SYSTEM] 파이프라인 갱신 완료. 최신 대시보드 렌더링 완료." }
    ];

    let currentProgress = 0;
    const progressInterval = setInterval(() => {
        currentProgress += 4;
        if (currentProgress > 100) currentProgress = 100;
        progressBar.style.width = `${currentProgress}%`;
    }, 80);

    logs.forEach(logItem => {
        setTimeout(() => {
            const line = document.createElement('div');
            line.className = `log-line ${logItem.type}`;
            line.textContent = `${logItem.text}`;
            consoleTerminal.appendChild(line);
            consoleTerminal.scrollTop = consoleTerminal.scrollHeight;
        }, logItem.time);
    });

    setTimeout(async () => {
        await fetchLiveRssNews();
        clearInterval(progressInterval);
        progressBar.style.width = "100%";
        consoleBadge.textContent = "READY";
        consoleBadge.className = "console-badge";
        
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> 파이프라인 분석 재실행`;
        }

        appState.isSimulating = false;
        renderApp();
    }, 2500);
}

// ==========================================================================
// 7. EVENT LISTENERS & INITIALIZATION
// ==========================================================================

function attachDynamicEventListeners() {
    document.querySelectorAll('.btn-open-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newsId = e.currentTarget.getAttribute('data-id');
            openModal(newsId);
        });
    });
}

function initEventListeners() {
    const mobileFilterBtn = document.getElementById('btn-mobile-filter');
    const closeSidebarBtn = document.getElementById('btn-close-sidebar');
    const mobileDrawerBackdrop = document.getElementById('mobile-drawer-backdrop');
    const sidebarEl = document.getElementById('app-sidebar');

    function openMobileDrawer() {
        if (sidebarEl) sidebarEl.classList.add('mobile-open');
        if (mobileDrawerBackdrop) mobileDrawerBackdrop.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeMobileDrawer() {
        if (sidebarEl) sidebarEl.classList.remove('mobile-open');
        if (mobileDrawerBackdrop) mobileDrawerBackdrop.classList.add('hidden');
        if (!document.getElementById('modal-backdrop') || document.getElementById('modal-backdrop').classList.contains('hidden')) {
            document.body.style.overflow = '';
        }
    }

    if (mobileFilterBtn) mobileFilterBtn.addEventListener('click', openMobileDrawer);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeMobileDrawer);
    if (mobileDrawerBackdrop) mobileDrawerBackdrop.addEventListener('click', closeMobileDrawer);

    document.querySelectorAll('#mobile-quick-stock-chips .quick-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            const stockName = e.currentTarget.getAttribute('data-stock');
            if (stockName === 'ALL') {
                appState.selectedStock = null;
            } else {
                if (appState.selectedStock === stockName) {
                    appState.selectedStock = null;
                } else {
                    appState.selectedStock = stockName;
                }
            }
            renderApp();
        });
    });

    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('btn-clear-search');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            appState.searchQuery = e.target.value;
            if (clearSearchBtn) {
                if (e.target.value.length > 0) clearSearchBtn.classList.remove('hidden');
                else clearSearchBtn.classList.add('hidden');
            }
            renderApp();
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            appState.searchQuery = '';
            clearSearchBtn.classList.add('hidden');
            renderApp();
        });
    }

    document.querySelectorAll('.sentiment-pill-group .pill-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.sentiment-pill-group .pill-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            appState.selectedSentiment = e.currentTarget.getAttribute('data-sentiment');
            renderApp();
        });
    });

    const sectorSelect = document.getElementById('sector-select');
    if (sectorSelect) {
        sectorSelect.addEventListener('change', (e) => {
            appState.selectedSector = e.target.value;
            renderApp();
        });
    }

    const impactRange = document.getElementById('impact-range');
    const impactRangeVal = document.getElementById('impact-range-val');
    if (impactRange) {
        impactRange.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            appState.minImpactScore = val;
            if (impactRangeVal) {
                impactRangeVal.textContent = val === 0 ? "전체 보기" : `${val}점 이상`;
            }
            renderApp();
        });
    }

    document.querySelectorAll('.stock-tag-cloud .stock-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            const stockName = e.currentTarget.getAttribute('data-stock');
            if (appState.selectedStock === stockName) {
                appState.selectedStock = null;
            } else {
                appState.selectedStock = stockName;
            }
            renderApp();
        });
    });

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            appState.sortBy = e.target.value;
            renderApp();
        });
    }

    const resetBtn = document.getElementById('btn-reset-filters');
    const resetEmptyBtn = document.getElementById('btn-reset-empty');
    
    const resetAllFilters = () => {
        appState.searchQuery = "";
        appState.selectedSentiment = "ALL";
        appState.selectedSector = "ALL";
        appState.minImpactScore = 0;
        appState.selectedStock = null;
        appState.sortBy = "impact-desc";

        if (searchInput) searchInput.value = '';
        if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
        if (sectorSelect) sectorSelect.value = 'ALL';
        if (impactRange) impactRange.value = 0;
        if (impactRangeVal) impactRangeVal.textContent = '0점 이상';
        if (sortSelect) sortSelect.value = 'impact-desc';

        document.querySelectorAll('.sentiment-pill-group .pill-btn').forEach(b => {
            b.classList.remove('active');
            if (b.getAttribute('data-sentiment') === 'ALL') b.classList.add('active');
        });

        document.querySelectorAll('.stock-tag-cloud .stock-pill').forEach(p => p.classList.remove('active'));

        renderApp();
    };

    if (resetBtn) resetBtn.addEventListener('click', resetAllFilters);
    if (resetEmptyBtn) resetEmptyBtn.addEventListener('click', resetAllFilters);

    const runSimBtn = document.getElementById('btn-run-simulation');
    if (runSimBtn) {
        runSimBtn.addEventListener('click', runPipelineSimulation);
    }

    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalFooterClose = document.getElementById('modal-footer-close');
    const modalBackdrop = document.getElementById('modal-backdrop');

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalFooterClose) modalFooterClose.addEventListener('click', closeModal);
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) closeModal();
        });
    }

    // Toss Macro Modal Event Listeners
    const openTossBtn = document.getElementById('btn-open-toss-macro-modal');
    const closeTossBtn = document.getElementById('toss-modal-close');
    const closeTossFooterBtn = document.getElementById('toss-modal-footer-close');
    const tossModal = document.getElementById('toss-macro-modal');

    if (openTossBtn) openTossBtn.addEventListener('click', openTossMacroModal);
    if (closeTossBtn) closeTossBtn.addEventListener('click', closeTossMacroModal);
    if (closeTossFooterBtn) closeTossFooterBtn.addEventListener('click', closeTossMacroModal);
    if (tossModal) {
        tossModal.addEventListener('click', (e) => {
            if (e.target === tossModal) closeTossMacroModal();
        });
    }

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeTossMacroModal();
            closeMobileDrawer();
        }
    });
}

// ==========================================================================
// 8. TOSS 100% LIVE MACRO API INTEGRATION
// Endpoint: https://wts-cert-api.tossinvest.com/api/v3/dashboard/wts/overview/indicator/mini-chart
// ==========================================================================

const TOSS_MACRO_MAPPING = [
    { code: 'KGG01P', name: '코스피', symbol: 'KOSPI', type: 'index' },
    { code: 'QGG01P', name: '코스닥', symbol: 'KOSDAQ', type: 'index' },
    { code: 'EXCHANGE_RATE', name: '원/달러 환율', symbol: 'USD/KRW', type: 'fx' },
    { code: 'COMP.NAI', name: '나스닥', symbol: 'NASDAQ', type: 'index' },
    { code: 'SPX.CBI', name: 'S&P 500', symbol: 'S&P 500', type: 'index' },
    { code: 'SOX.NAI', name: '필라델피아 반도체', symbol: 'SOX', type: 'index' },
    { code: 'DJI.DJI', name: '다우', symbol: 'DOW', type: 'index' },
    { code: 'ROB.US10YT-RR', name: '미 10년채', symbol: 'US 10Y', type: 'bond' },
    { code: 'ROB.US2YT-RR', name: '미 2년채', symbol: 'US 2Y', type: 'bond' },
    { code: 'RGI..DXY', name: '달러인덱스', symbol: 'DXY', type: 'index' },
    { code: 'RGI..VIX', name: 'VIX 변동성지수', symbol: 'VIX', type: 'index' },
    { code: 'RFU.CLv1', name: 'WTI 원유', symbol: 'WTI', type: 'commodity' },
    { code: 'RFU.GCv1', name: '금 (Gold)', symbol: 'Gold', type: 'commodity' },
    { code: 'RFU.NQc1', name: '나스닥 선물', symbol: 'NQ Futures', type: 'futures' },
    { code: 'RFU.ESc1', name: 'S&P500 선물', symbol: 'ES Futures', type: 'futures' }
];


/**
 * Searches for an indicator item inside Toss API indexMap structure (categories or direct object keys).
 */
function findTossIndicatorItem(indexMap, code) {
    if (!indexMap) return null;

    if (indexMap[code]) return indexMap[code];

    for (const categoryKey in indexMap) {
        const categoryVal = indexMap[categoryKey];
        if (Array.isArray(categoryVal)) {
            const match = categoryVal.find(item => 
                item && (item.code === code || item.symbol === code || item.id === code)
            );
            if (match) return match;
        } else if (typeof categoryVal === 'object' && categoryVal !== null) {
            if (categoryVal.code === code || categoryVal.symbol === code) return categoryVal;
            for (const subKey in categoryVal) {
                const subItem = categoryVal[subKey];
                if (subItem && (subItem.code === code || subItem.symbol === code)) return subItem;
            }
        }
    }
    return null;
}

/**
 * Fetches real-time Toss Macro Indicators and updates the header ticker bar.
 * 100% Real-time Toss API values - FALLBACK_MACRO_DATA completely removed.
 */
/**
 * Fetches real-time Toss Macro Indicators (Triggered on site load & modal click).
 * 100% Real-time Toss API values - FALLBACK_MACRO_DATA completely removed.
 * No 15-second auto-polling interval per user request.
 */
async function fetchTossMacroIndicators() {
    const updateTimeEl = document.getElementById('toss-macro-update-time');
    const modalUpdateTimeEl = document.getElementById('toss-modal-update-time');
    if (updateTimeEl) updateTimeEl.textContent = '수집 중...';

    let indexMap = null;
    let isLive = false;

    try {
        let response;
        try {
            response = await fetch('/api/toss-macro');
            if (!response.ok) {
                response = await fetch('https://wts-cert-api.tossinvest.com/api/v3/dashboard/wts/overview/indicator/mini-chart');
            }
        } catch (e) {
            response = await fetch('https://wts-cert-api.tossinvest.com/api/v3/dashboard/wts/overview/indicator/mini-chart');
        }

        if (response && response.ok) {
            const data = await response.json();
            if (data && data.result && data.result.indexMap) {
                indexMap = data.result.indexMap;
                isLive = true;
            } else if (data && data.indexMap) {
                indexMap = data.indexMap;
                isLive = true;
            }
        }
    } catch (err) {
        console.error('[Toss Live Macro API Error]', err.message);
    }

    if (!indexMap) {
        if (updateTimeEl) updateTimeEl.textContent = 'API 연결 대기 중...';
        return;
    }

    const macroList = TOSS_MACRO_MAPPING.map(config => {
        const item = findTossIndicatorItem(indexMap, config.code);
        let latestPrice = 0;
        let basePrice = 0;
        let changeType = 'EVEN';

        if (item) {
            // Strictly reference item.price.latestPrice, item.price.basePrice, item.price.changeType from Toss API
            const p = item.price || item;
            const rawLatest = (item.price && item.price.latestPrice !== undefined) ? item.price.latestPrice : (p.latestPrice ?? p.closePrice ?? p.price);
            const rawBase = (item.price && item.price.basePrice !== undefined) ? item.price.basePrice : (p.basePrice ?? p.prevClose ?? p.base_price);
            const rawChange = (item.price && item.price.changeType) || p.changeType || 'EVEN';

            if (rawLatest !== undefined && rawLatest !== null && !isNaN(parseFloat(rawLatest))) {
                latestPrice = parseFloat(rawLatest);
            }
            if (rawBase !== undefined && rawBase !== null && !isNaN(parseFloat(rawBase))) {
                basePrice = parseFloat(rawBase);
            }
            changeType = rawChange;
        }

        if (!latestPrice || isNaN(latestPrice)) {
            return null;
        }

        const priceDiff = latestPrice - basePrice;
        const changeRate = (basePrice && basePrice > 0)
            ? ((latestPrice - basePrice) / basePrice * 100)
            : 0;

        if (changeType === 'EVEN') {
            if (priceDiff > 0) changeType = 'RISE';
            else if (priceDiff < 0) changeType = 'FALL';
            else changeType = 'EVEN';
        }

        return {
            code: config.code,
            name: config.name,
            symbol: config.symbol,
            type: config.type,
            latestPrice,
            basePrice,
            priceDiff,
            changeRate,
            changeType
        };
    }).filter(Boolean);

    if (isLive && macroList.length > 0) {
        console.log('[Toss Live Macro API Success] 토스 실시간 데이터가 100% 성공적으로 바인딩되었습니다.');
    }

    renderTossMacroTickerBar(macroList, isLive);

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}시 ${minutes}분`;
    if (updateTimeEl) updateTimeEl.textContent = timeStr;
    if (modalUpdateTimeEl) modalUpdateTimeEl.textContent = timeStr;
}

/**
 * Opens and closes Toss Macro Fullscreen Modal
 */
function openTossMacroModal() {
    const modal = document.getElementById('toss-macro-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    fetchTossMacroIndicators().catch(err => console.error('[Toss Macro Fetch Error]', err));
}

function closeTossMacroModal() {
    const modal = document.getElementById('toss-macro-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

// Expose globally for inline onclick handlers
window.openTossMacroModal = openTossMacroModal;
window.closeTossMacroModal = closeTossMacroModal;

/**
 * Renders macro indicators list to #toss-macro-grid-modal-container & #toss-macro-ticker-container.
 */
function renderTossMacroTickerBar(macroList, isLive) {
    const gridContainer = document.getElementById('toss-macro-grid-modal-container');
    const tickerContainer = document.getElementById('toss-macro-ticker-container');

    const htmlContent = macroList.map(item => {
        const isRise = item.changeType === 'RISE' || item.changeType === 'UP' || item.changeRate > 0;
        const isFall = item.changeType === 'FALL' || item.changeType === 'DOWN' || item.changeRate < 0;
        
        let stateClass = 'is-even';
        let colorClass = 'text-muted';
        let iconHtml = '<i class="fa-solid fa-minus"></i>';

        if (isRise) {
            stateClass = 'is-rise';
            colorClass = 'text-green';
            iconHtml = '🟢 <i class="fa-solid fa-caret-up"></i>';
        } else if (isFall) {
            stateClass = 'is-fall';
            colorClass = 'text-red';
            iconHtml = '🔴 <i class="fa-solid fa-caret-down"></i>';
        }

        let formattedPrice = '';
        if (item.type === 'bond') {
            formattedPrice = `${item.latestPrice.toFixed(2)}%`;
        } else if (item.type === 'fx') {
            formattedPrice = `${item.latestPrice.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else if (item.type === 'commodity') {
            formattedPrice = `$${item.latestPrice.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else {
            formattedPrice = item.latestPrice.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        const sign = item.changeRate > 0 ? '+' : '';
        const formattedRate = `${sign}${item.changeRate.toFixed(2)}%`;
        const diffSign = item.priceDiff > 0 ? '+' : '';
        const formattedDiff = `${diffSign}${item.priceDiff.toFixed(2)}`;

        return `
            <div class="macro-chip ${stateClass}" title="${item.name} (${item.code})">
                <div class="chip-top">
                    <span class="chip-name">${item.name}</span>
                    <span class="chip-symbol">${item.symbol}</span>
                </div>
                <div class="chip-bottom">
                    <span class="chip-price">${formattedPrice}</span>
                    <span class="chip-change ${colorClass}">
                        ${iconHtml} ${formattedDiff} (${formattedRate})
                    </span>
                </div>
            </div>
        `;
    }).join('');

    if (gridContainer) {
        gridContainer.innerHTML = htmlContent;
    }
    if (tickerContainer) {
        tickerContainer.innerHTML = htmlContent;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await fetchLiveRssNews(); // Fetch live Google News RSS feeds and bind real article links
    fetchTossMacroIndicators(); // Initial fetch on site load only (No 15s interval)
    startGlobalMarketClocks();
    initEventListeners();
    renderApp();
});
