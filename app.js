/**
 * GLOBAL MACRO -> KR STOCK IMPACT MONITOR
 * Application Logic & 2-Stage AI Simulation Engine
 * 
 * Features:
 * - 11 Detailed Realistic News Impact Analysis Models
 * - Real-time World Market Clocks (New York, London, Seoul)
 * - 2-Stage Pipeline Simulation (1st Stage Title Filter -> 2nd Stage LLM Deep Analysis)
 * - Dynamic Multi-Criteria Filtering (Search, Sentiment, Sector, Impact Score, Stock Tags)
 * - Chart.js Visual Impact Graph & Detailed Analysis Modal Interaction
 */

// ==========================================================================
// 1. DATA MODEL & NEWS DATASET (11 Realistic Global Macro & Sector News)
// ==========================================================================

/**
 * @typedef {Object} TargetStockImpact
 * @property {string} name - Stock Name (e.g., 삼성전자)
 * @property {string} ticker - Stock Code (e.g., 005930)
 * @property {'BULLISH'|'BEARISH'} sentiment - Expected Impact Direction
 * @property {string} expectedImpact - Forecast Range (e.g., "+4.5% ~ +7.5%")
 * @property {string} reasoning - Detailed Cause & Impact Mechanism
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
 * @property {string} phase2DeepAnalysis.transmissionMechanism
 * @property {Array<{sector: string, direction: 'UP'|'DOWN', magnitude: number}>} phase2DeepAnalysis.impactedSectors
 * @property {TargetStockImpact[]} phase2DeepAnalysis.targetStocks
 * @property {string} phase2DeepAnalysis.shortTermOutlook
 * @property {string} phase2DeepAnalysis.longTermOutlook
 * @property {string[]} phase2DeepAnalysis.riskFactors
 */

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
        summary: "미 연준이 7월 FOMC 정례회의에서 기준금리를 동결했으나, 제롬 파월 의장의 기자회견 및 성명서를 통해 고용시장 냉각과 인플레이션 목표(2.0%) 접근을 공식 확인하며 9월 금리 인하 개시를 강하게 시그널링했습니다.",
        phase1Filtering: {
            matchKeywords: ["Federal Reserve", "FOMC", "Rate Cut", "Powell", "Interest Rate"],
            priorityScore: 92,
            passed: true,
            screeningReason: "미 연준 7월 FOMC 금리 동결 및 9월 피벗(금리 인하) 시그널 감지"
        },
        phase2DeepAnalysis: {
            transmissionMechanism: "7월 FOMC 동결 및 9월 피벗 확정 ➔ 원/달러 환율 하락(1,330원선 하회) ➔ 한국은행 10월 금리 인하 여력 확보 ➔ 성장주(바이오, IT) 할인율 감소 및 금융주 배당 매력 부각",
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
                    expectedImpact: "+3.8% ~ +6.2%",
                    reasoning: "금리 인하 시 원화 강세와 함께 외국인 바스켓 유입 가속 및 밸류업 자사주 소각 수혜.",
                    keyDrivers: ["주주환원율 40% 돌파", "원화 강세 외국인 유입", "자산건전성 유지"]
                },
                {
                    name: "NAVER",
                    ticker: "035420",
                    sentiment: "BULLISH",
                    expectedImpact: "+4.5% ~ +7.2%",
                    reasoning: "고금리 부담 완화로 PER 멀티플 리레이팅 및 AI 클라우드 B2B 매출 가속화.",
                    keyDrivers: ["할인율 부담 완화", "B2B AI 실적 성장", "검색 플랫폼 매출 증가"]
                },
                {
                    name: "삼성바이오로직스",
                    ticker: "207940",
                    sentiment: "BULLISH",
                    expectedImpact: "+3.8% ~ +6.0%",
                    reasoning: "금리 하락 시 글로벌 바이오 R&D 투심 개선 및 CDMO 5공장 물량 조기 수주 모멘텀.",
                    keyDrivers: ["글로벌 바이오 투심 회복", "CDMO 5공장 수주 조기 확보", "생물보안법 수혜"]
                }
            ],
            shortTermOutlook: "원/달러 환율 안정을 기반으로 외국인 자금 바스켓 매수세가 유입되어 코스피 갭상승 가능성 높음.",
            longTermOutlook: "글로벌 통화정책 완화 주기 진입으로 KOSPI 밸류에이션 멀티플 확장 본격화.",
            riskFactors: [
                "미 고용 지표 급격한 냉각 시 경기후퇴(Recession) 우려",
                "국내 가계부채 관리에 따른 금융당국 미세조정"
            ]
        }
    },
    {
        id: "news-02",
        titleEn: "Korea July Exports Surge 14.5% YoY Driven by Record Semiconductor & HBM Shipments",
        titleKr: "한국 7월 수출 전년비 14.5% 급증… 반도체 및 HBM 사상 최대 수출액 갱신",
        source: "Ministry of Trade, Industry and Energy",
        timestamp: "2026-07-31 15:30",
        category: "반도체/AI",
        impactScore: 94,
        sentiment: "BULLISH",
        summary: "산업통상자원부가 발표한 7월 수출입 동향에 따르면, 한국 수출액이 전년 대비 14.5% 증가한 가운데 HBM 및 서버용 메모리 폭증에 힘입어 반도체 수출액이 역대 최고치(148억 달러)를 경신했습니다.",
        phase1Filtering: {
            matchKeywords: ["Korea Exports", "Semiconductor", "HBM", "Trade Surplus", "Record High"],
            priorityScore: 96,
            passed: true,
            screeningReason: "국내 7월 수출 14.5% 폭증 및 메모리/HBM 사상 최대 수출 호조"
        },
        phase2DeepAnalysis: {
            transmissionMechanism: "7월 수출 실적 14.5% 급증 ➔ 삼성전자·SK하이닉스 3분기 어닝 서프라이즈 가시화 ➔ 반도체 소부장 밸류체인 매출 직결 및 실적 추정치 상향",
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
                    expectedImpact: "+6.0% ~ +9.2%",
                    reasoning: "HBM3e/HBM4 독점적 지위에 따른 사상 최대 수출 실적 견인 및 영업이익률 고점 경신.",
                    keyDrivers: ["HBM3e 12단 독점 공급", "eSSD 매출 폭증", "3분기 영업이익 최고치"]
                },
                {
                    name: "삼성전자",
                    ticker: "005930",
                    sentiment: "BULLISH",
                    expectedImpact: "+4.2% ~ +6.5%",
                    reasoning: "메모리 단가 상승 및 HBM 퀄테스트 통과 물량 본격 출하로 반도체 부문 실적 급등.",
                    keyDrivers: ["DRAM/NAND 단가 상승", "HBM 출하량 전분기비 80%↑", "수출실적 호조"]
                },
                {
                    name: "한미반도체",
                    ticker: "042700",
                    sentiment: "BULLISH",
                    expectedImpact: "+8.0% ~ +12.5%",
                    reasoning: "HBM 증설 폭주에 따른 TC 본더 장비 락인 효과로 수주 잔고 최고치 달성.",
                    keyDrivers: ["DUAL TC BONDER 수주", "HBM4 장비 선점", "수출 확대로 실적 서프라이즈"]
                }
            ],
            shortTermOutlook: "수출지표 발표 직후 외국인/기관 대량 매수세 유입되며 반도체 대형주 중심 강한 상승 장세.",
            longTermOutlook: "2026년 하반기 메모리 슈퍼사이클 장기화로 코스피 지수 3,000pt 안착 발판.",
            riskFactors: [
                "글로벌 세트(모바일/PC) 수요의 상대적 회복 지연",
                "환율 변동성에 따른 수입원가 영향"
            ]
        }
    },
    {
        id: "news-03",
        titleEn: "Big Tech Q2 AI Infrastructure CapEx Hits Record $55B, Erasing AI Bubble Concerns",
        titleKr: "글로벌 빅테크 4사 Q2 AI 설비투자(CapEx) 550억 달러 사상 최대… AI 버블 우려 불식",
        source: "Bloomberg Terminals",
        timestamp: "2026-07-31 14:15",
        category: "빅테크/IT",
        impactScore: 90,
        sentiment: "BULLISH",
        summary: "마이크로소프트, 알파벳, 메타, 아마존의 2분기 실적 발표 결과, AI 데이터센터 및 서버 설비투자 총액이 550억 달러를 돌파하며 하반기 AI 칩 및 고성능 메모리 수요 지속을 입증했습니다.",
        phase1Filtering: {
            matchKeywords: ["Big Tech", "AI CapEx", "Datacenter", "Microsoft", "Meta"],
            priorityScore: 92,
            passed: true,
            screeningReason: "빅테크 2분기 CapEx 550억 달러 최고치 및 AI 데이터센터 증설 호재"
        },
        phase2DeepAnalysis: {
            transmissionMechanism: "빅테크 AI CapEx 550억 달러 투입 ➔ AI 데이터센터 서버 증설 가속 ➔ 엔터프라이즈 eSSD 및 HBM3e 주문 폭증 ➔ 한국 반도체 및 전력 인프라 기업 실적 수혜",
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
                    expectedImpact: "+4.8% ~ +7.5%",
                    reasoning: "빅테크 데이터센터 전용 eSSD 및 HBM3e 12단 장기 납품 계약 확대.",
                    keyDrivers: ["eSSD 매출 비중 30% 돌파", "빅테크 장기 파트너십", "HBM4 수주 가시화"]
                },
                {
                    name: "HD현대일렉트릭",
                    ticker: "267260",
                    sentiment: "BULLISH",
                    expectedImpact: "+6.2% ~ +10.0%",
                    reasoning: "빅테크 AI 데이터센터 전용 초고압 변압기 및 전력기기 주문 폭주.",
                    keyDrivers: ["북미 변압기 숏티지 지속", "데이터센터 전력망 수주", "영업이익률 20% 상회"]
                },
                {
                    name: "NAVER",
                    ticker: "035420",
                    sentiment: "BULLISH",
                    expectedImpact: "+3.2% ~ +5.2%",
                    reasoning: "글로벌 AI CapEx 확장에 발맞춘 하이퍼클로바X B2B 엔터프라이즈 수익성 본격화.",
                    keyDrivers: ["B2B AI 솔루션 수주", "클라우드 매출 성장", "글로벌 파트너십"]
                }
            ],
            shortTermOutlook: "AI 버블론 해소에 따른 빅테크 관련 반도체 및 전력 인프라주 강력한 매수세 유입.",
            longTermOutlook: "2026~2027년 AI 클라우드 수익화 본격화에 따른 구조적 장기 성장.",
            riskFactors: [
                "빅테크 전력 공급망 한계로 인한 데이터센터 가동률 지연",
                "추가 AI 서비스 Monetization 속도"
            ]
        }
    },
    {
        id: "news-04",
        titleEn: "US Commerce Department Finalizes $15B Advanced Packaging & HBM4 Direct Subsidy Execution",
        titleKr: "미 상무부, 차세대 HBM4 패키징 및 첨단 반도체 팹 150억 달러 보조금 집행 최종 의결",
        source: "Wall Street Journal",
        timestamp: "2026-07-31 13:00",
        category: "반도체/AI",
        impactScore: 91,
        sentiment: "BULLISH",
        summary: "미국 상무부가 반도체법(CHIPS Act)에 따라 차세대 HBM4 3D 적층 기술 및 첨단 패키징 제조 시설을 구축하는 한국 메모리 대형사들에 150억 달러 직접 보조금 집행을 확정했습니다.",
        phase1Filtering: {
            matchKeywords: ["Commerce Department", "HBM4", "Advanced Packaging", "CHIPS Act", "Subsidy"],
            priorityScore: 94,
            passed: true,
            screeningReason: "미 상무부 HBM4 및 첨단 패키징 150억 달러 보조금 집행 확정"
        },
        phase2DeepAnalysis: {
            transmissionMechanism: "미 보조금 집행 ➔ 미국 내 패키징 공장 연내 완공 및 인센티브 반영 ➔ 엔비디아·빅테크향 HBM4 장기 독점 공급 체계 강화 ➔ TC 본더 등 후공정 장비사 매출 폭발",
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
                    expectedImpact: "+5.2% ~ +8.0%",
                    reasoning: "미국 인디애나 패키징 공장 보조금 확보 및 HBM4 시장 주도권 공고화.",
                    keyDrivers: ["인디애나 보조금 수혜", "NVIDIA HBM4 독점 협상", "3D TSV 기술 격차"]
                },
                {
                    name: "삼성전자",
                    ticker: "005930",
                    sentiment: "BULLISH",
                    expectedImpact: "+3.5% ~ +5.5%",
                    reasoning: "테일러 파운드리 및 턴키 HBM 패키징 보조금 확정으로 파운드리/HBM 턴어라운드.",
                    keyDrivers: ["테일러 팹 보조금 집행", "HBM3e/HBM4 턴키 공급", "파운드리 수율 개선"]
                },
                {
                    name: "한미반도체",
                    ticker: "042700",
                    sentiment: "BULLISH",
                    expectedImpact: "+7.5% ~ +11.8%",
                    reasoning: "미국 HBM 패키징 팹 진출에 따른 전용 듀얼 TC 본더 장비 락인 효과.",
                    keyDrivers: ["TC 본더 미국 진출 수혜", "HBM4 장비 독점", "사상 최대 영업이익"]
                }
            ],
            shortTermOutlook: "미 보조금 수혜에 따른 반도체 대표주 및 후공정 장비주 외국인 매수 집중.",
            longTermOutlook: "북미 반도체 공급망 락인을 통한 2027년까지의 확실한 성장 모멘텀.",
            riskFactors: [
                "미국 내 공장 건설 인력 비용 증가",
                "글로벌 지정학적 수출 통제 변수"
            ]
        }
    },
    {
        id: "news-05",
        titleEn: "EU Formally Approves Mandatory Battery Passport Regulation, Benefiting Premium K-Battery Makers",
        titleKr: "EU, 친환경 배터리 패스포트 의무화 제도 최종 승인… K-배터리 3사 프리미엄 반사이익",
        source: "Financial Times",
        timestamp: "2026-07-31 11:40",
        category: "2차전지/EV",
        impactScore: 82,
        sentiment: "BULLISH",
        summary: "유럽연합(EU)이 2차전지 전 주기 탄소 발자국과 원재료 출처 추적을 의무화하는 '배터리 패스포트' 법안을 최종 의결함에 따라, ESG 기준과 투명성이 뛰어난 국내 배터리 셀 3사의 반사이익이 기대됩니다.",
        phase1Filtering: {
            matchKeywords: ["EU Battery Passport", "ESG Regulation", "K-Battery", "Recycled Content"],
            priorityScore: 86,
            passed: true,
            screeningReason: "EU 배터리 패스포트 승인 및 K-배터리 프리미엄 수혜"
        },
        phase2DeepAnalysis: {
            transmissionMechanism: "EU 배터리 패스포트 의무화 ➔ 탄소 배출량이 높고 출처가 불분명한 저가 중국산 배터리 유럽 진입 차단 ➔ K-배터리 3사 유럽 완성차 계약 우위 ➔ 폐배터리 리사이클링 기업 가치 폭등",
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
                    expectedImpact: "+4.5% ~ +7.2%",
                    reasoning: "유럽 주요 완성차향 탄소 중립 배터리 공급망 독점 우위 및 배터리 패스포트 대응 완료.",
                    keyDrivers: ["EU 규제 준수 우위", "유럽 완성차 수주 확대", "프리미엄 폼팩터"]
                },
                {
                    name: "성일하이텍",
                    ticker: "365340",
                    sentiment: "BULLISH",
                    expectedImpact: "+6.5% ~ +10.5%",
                    reasoning: "EU 규제에 따른 재활용 광물 의무 사용 비율 증가로 유럽 리사이클링 팹 가치 재평가.",
                    keyDrivers: ["재활용 광물 의무화 수혜", "유럽 리사이클링 센터 가동", "비중국 원소재 가치 상승"]
                },
                {
                    name: "POSCO홀딩스",
                    ticker: "005490",
                    sentiment: "BULLISH",
                    expectedImpact: "+3.2% ~ +5.5%",
                    reasoning: "비중국 리튬/니켈 친환경 조달 체계 부각 및 소재 밸류체인 경쟁력 제고.",
                    keyDrivers: ["친환경 리튬 생산 체계", "EU 무역 장벽 수혜", "소재 자립도 확보"]
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
        titleEn: "Middle East Geopolitical Friction Spikes WTI Crude Oil +4.2% to $88/bbl, Energy Sector Surges",
        titleKr: "중동 주요 해협 군사적 긴장 고조로 WTI 국제유가 4.2% 급등 88달러 돌파… 에너지·정유주 강세",
        source: "S&P Global Commodities",
        timestamp: "2026-07-31 10:30",
        category: "조선/해운",
        impactScore: -76,
        sentiment: "BEARISH",
        summary: "중동 주요 유조선 수송 항로 주변 지정학적 분쟁이 우려되며 WTI 유가가 배럴당 88달러로 4.2% 급등해 인플레이션 우려 및 해운/정유 업종 수혜와 항공/소비재 악재가 교차하고 있습니다.",
        phase1Filtering: {
            matchKeywords: ["Crude Oil", "Middle East Tension", "WTI Surge", "Energy Market"],
            priorityScore: 84,
            passed: true,
            screeningReason: "중동 지정학 리스크로 국제유가 4.2% 급등 및 매크로 변동성"
        },
        phase2DeepAnalysis: {
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
                    expectedImpact: "+5.5% ~ +8.8%",
                    reasoning: "유가 상승 및 항로 우회에 따른 탱커/컨테이너 운임지수(SCFI) 동반 반등 수혜.",
                    keyDrivers: ["운임 지수 급등", "우회 운항 프리미엄", "3분기 어닝 호조"]
                },
                {
                    name: "한화오션",
                    ticker: "042660",
                    sentiment: "BULLISH",
                    expectedImpact: "+3.8% ~ +6.2%",
                    reasoning: "해양 플랜트 및 원유 수송선(VLCC) 발주 문의 증가 및 고선가 수주 잔고 모멘텀.",
                    keyDrivers: ["VLCC 신조선 발주 호조", "해양 플랜트 수주", "방산 모멘텀 연계"]
                },
                {
                    name: "현대차",
                    ticker: "005380",
                    sentiment: "BEARISH",
                    expectedImpact: "-2.0% ~ -3.5%",
                    reasoning: "고유가로 인한 글로벌 내연기관 소비 심리 위축 및 원자재 물류비 상승 부담.",
                    keyDrivers: ["원가 부담 증가", "소비 심리 위축", "단기 차익실현"]
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
        titleEn: "LNG Carrier Newbuilding Prices Reach Record $275M; HD Korea Shipbuilding & Samsung Heavy Secure Major Contracts",
        titleKr: "글로벌 LNG 운반선 신조선가 2억 7500만 달러 사상 최고치… HD한국조선해양·삼성중공업 초대형 수주",
        source: "TradeWinds Shipping",
        timestamp: "2026-07-31 09:20",
        category: "조선/해운",
        impactScore: 92,
        sentiment: "BULLISH",
        summary: "카타르 2차 및 북미 LNG 프로젝트 수송선 발주가 폭주하며 174,000cbm 급 LNG선 신조선가가 척당 2억 7,500만 달러로 신고가를 경신하였고 국내 조선 대형사가 슬롯을 독점했습니다.",
        phase1Filtering: {
            matchKeywords: ["LNG Carrier", "Newbuilding Price", "HD Korea Shipbuilding", "Samsung Heavy", "Record High"],
            priorityScore: 95,
            passed: true,
            screeningReason: "LNG 선가 2.75억달러 신고가 경신 및 국내 조선사 대규모 수주"
        },
        phase2DeepAnalysis: {
            transmissionMechanism: "LNG 신조선가 최고치 ➔ 한국 조선 대형 3사 2028~2029년 도크 슬롯 프리미엄 수주 ➔ 영업이익률 10% 이상 대폭 상승 ➔ 초저온 보냉재 등 조선 기자재사 실적 폭발",
            impactedSectors: [
                { sector: "고부가가치 LNG선 조선 3사", direction: "UP", magnitude: 96 },
                { sector: "조선 보냉재 / 화물창", direction: "UP", magnitude: 92 },
                { sector: "해운 / 물류", direction: "UP", magnitude: 75 }
            ],
            targetStocks: [
                {
                    name: "HD한국조선해양",
                    ticker: "009540",
                    sentiment: "BULLISH",
                    expectedImpact: "+5.8% ~ +8.8%",
                    reasoning: "LNG선 선가 상승 프리미엄 반영 및 자회사 HD현대중공업 도크 풀가동에 따른 실적 턴어라운드.",
                    keyDrivers: ["LNG선 척당 2.75억달러", "2028년 도크 매출 확정", "자회사 실적 견인"]
                },
                {
                    name: "한화오션",
                    ticker: "042660",
                    sentiment: "BULLISH",
                    expectedImpact: "+4.8% ~ +7.5%",
                    reasoning: "친환경 LNG/암모니아 운반선 고마진 수주 잇따라 성공하며 영업이익률 급증.",
                    keyDrivers: ["고마진 LNG선 수주", "방산 및 특수선 시너지", "영업이익 대폭 상승"]
                },
                {
                    name: "동성화인텍",
                    ticker: "083500",
                    sentiment: "BULLISH",
                    expectedImpact: "+8.0% ~ +12.5%",
                    reasoning: "LNG 화물창 초저온 보냉재 독점 공급 체계로 사상 최대 수주 잔고 및 판가 인상 동시 수혜.",
                    keyDrivers: ["보냉재 가동률 100%", "2년치 이상 수주잔고", "마진율 극대화"]
                }
            ],
            shortTermOutlook: "조선 및 기자재 업종으로의 외국인/기관 매수세 급증으로 주도주 자리 매김.",
            longTermOutlook: "2028년까지 슬롯이 전량 매진되어 안정적 장기 실적 우상향 구도 확립.",
            riskFactors: [
                "조선소 숙련 인력 수급 이슈",
                "후판 가격 협상 우려"
            ]
        }
    },
    {
        id: "news-08",
        titleEn: "US 10-Year Treasury Yields Slide Below 4.10% as Dollar Index Softens on Cooling Labor Data",
        titleKr: "미 고용 냉각 신호에 국채 10년물 금리 4.10% 아래로 하락… 달러 인덱스 약세 전환",
        source: "CNBC Market Data",
        timestamp: "2026-07-31 08:30",
        category: "통화정책/금융",
        impactScore: 84,
        sentiment: "BULLISH",
        summary: "미국 주간 신규 실업수당 청구건수가 증가하고 온건한 고용 지표가 이어지면서 미 국채 10년물 금리가 4.08%로 하락하고 원/달러 환율이 1,330원선 아래로 하강 안정화되었습니다.",
        phase1Filtering: {
            matchKeywords: ["Treasury Yields", "Dollar Index", "Labor Market", "Yield Slide", "Foreign Capital"],
            priorityScore: 87,
            passed: true,
            screeningReason: "미 10년물 국채 금리 하락 및 달러 약세로 국내 외국인 유입 모멘텀"
        },
        phase2DeepAnalysis: {
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
                    expectedImpact: "+3.2% ~ +5.0%",
                    reasoning: "달러 약세 및 원화 강세 전환 시 외국인 바스켓 자금의 최우선 매수 표적.",
                    keyDrivers: ["원화 강세 외국인 유입", "배당 수익률 부각", "밸류업 자사주 소각"]
                },
                {
                    name: "삼성바이오로직스",
                    ticker: "207940",
                    sentiment: "BULLISH",
                    expectedImpact: "+3.5% ~ +5.8%",
                    reasoning: "금리 하락으로 인한 바이오 섹터 할인율 축소 및 글로벌 펀드 수급 개선.",
                    keyDrivers: ["국채금리 하락 바이오 수혜", "CDMO 대형 수주", "5공장 가동"]
                },
                {
                    name: "NAVER",
                    ticker: "035420",
                    sentiment: "BULLISH",
                    expectedImpact: "+3.8% ~ +6.0%",
                    reasoning: "고금리 할인율 부담 제거에 따른 인터넷 대형주 PER 멀티플 회복.",
                    keyDrivers: ["할인율 부담 완화", "멀티플 재평가", "AI 서비스 가치 반영"]
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
            transmissionMechanism: "BOJ 금리 인상 가능성 ➔ 엔화 강세 및 엔/달러 급락 ➔ 엔캐리 청산에 따른 글로벌 지수 대형주 단기 매도 ➔ 자동차 업종은 반사이익, 패시브 지수주 변동성 확대",
            impactedSectors: [
                { sector: "지수 대형주 (패시브 자금)", direction: "DOWN", magnitude: 72 },
                { sector: "자동차 (대일 경쟁력 개선)", direction: "UP", magnitude: 65 }
            ],
            targetStocks: [
                {
                    name: "현대차",
                    ticker: "005380",
                    sentiment: "BULLISH",
                    expectedImpact: "+2.0% ~ +4.0%",
                    reasoning: "(반사이익) 엔화 강세 전환 시 미국/유럽 시장에서 토요타 대비 한국 자동차 가격 경쟁력 강화.",
                    keyDrivers: ["엔화 강세 반사이익", "HEV 하이브리드 인기", "글로벌 점유율 확대"]
                },
                {
                    name: "기아",
                    ticker: "000270",
                    sentiment: "BULLISH",
                    expectedImpact: "+1.8% ~ +3.6%",
                    reasoning: "엔/달러 하락에 따른 일본 차 대비 상대적 호조 및 높은 주주환원율 재조명.",
                    keyDrivers: ["대일 가격 경쟁력 우위", "고배당/자사주 소각", "미국 시장 호조"]
                },
                {
                    name: "삼성전자",
                    ticker: "005930",
                    sentiment: "BEARISH",
                    expectedImpact: "-1.8% ~ -3.2%",
                    reasoning: "글로벌 패시브 자금 청산 시 외국인 유동성 차익실현 물량출 우려.",
                    keyDrivers: ["외국인 패시브 매도", "단기 수급 변동성", "지수 변동성"]
                }
            ],
            shortTermOutlook: "BOJ 결과 발표 전까지 장중 엔화 환율 변동에 따른 증시 출렁임 예상.",
            longTermOutlook: "엔화 가치 정상화 과정 완료 후 글로벌 매크로 유동성 재안정.",
            riskFactors: [
                "BOJ 매파적 surprise 금리 인상 시 지수 단기 충격",
                "일본 국채 금리 급등"
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
        summary: "차세대 프리미엄 스마트폰, AI PC, 자율주행차(SDV)에 탑재되는 온디바이스 AI 전용 NPU 칩 및 고성능 LPDDR5X/CXL 메모리 모듈 주문량이 2배 이상 급증했습니다.",
        phase1Filtering: {
            matchKeywords: ["On-Device AI", "Autonomous Chip", "LPDDR5X", "CXL", "NPU Surge"],
            priorityScore: 91,
            passed: true,
            screeningReason: "온디바이스 AI 및 자율주행 NPU/LPDDR5X 수요 폭증 호재"
        },
        phase2DeepAnalysis: {
            transmissionMechanism: "온디바이스 AI 칩 탑재 확산 ➔ 모바일/전장용 고성능 LPDDR5X 및 CXL 메모리 고단가 주문 급증 ➔ 국내 메모리 2사 실적 프리미엄 추가 및 팹리스/IP 기업 수혜",
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
                    expectedImpact: "+4.0% ~ +6.5%",
                    reasoning: "온디바이스 AI용 LPDDR5X 및 CXL 메모리 세계 1위 공급사로 프리미엄 단가(ASP) 수혜 감지.",
                    keyDrivers: ["LPDDR5X 시장 점유율 1위", "CXL 차세대 메모리 선점", "파운드리 전장 칩 수주"]
                },
                {
                    name: "SK하이닉스",
                    ticker: "000660",
                    sentiment: "BULLISH",
                    expectedImpact: "+3.8% ~ +6.0%",
                    reasoning: "고성능 LPDDR5T 및 온디바이스 AI 메모리 라인업 확대로 모바일/전장 메모리 매출 대폭 증가.",
                    keyDrivers: ["LPDDR5T 공급 확대", "전장용 메모리 성장", "HBM 외 고마진 제품군"]
                },
                {
                    name: "현대모비스",
                    ticker: "012330",
                    sentiment: "BULLISH",
                    expectedImpact: "+3.5% ~ +5.8%",
                    reasoning: "차세대 SDV 자율주행 통합 제어기 및 온디바이스 AI 전장 모듈 수주 본격화.",
                    keyDrivers: ["SDV 전장 제어기 수주", "온디바이스 AI 모듈 공급", "전장 사업부 턴어라운드"]
                }
            ],
            shortTermOutlook: "온디바이스 AI 테마 재조명으로 반도체/전장 관련주 강세 모멘텀.",
            longTermOutlook: "2026~2027년 스마트폰, PC, 자동차 전반의 AI 탑재 표준화로 장기 수요 창출.",
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

/**
 * Real-time clock update loop for New York, London, and Seoul
 */
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

// Global Chart instance variable
let currentChartInstance = null;

/**
 * Filter dataset according to app state
 */
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

/**
 * Updates UI Top Metrics based on dataset
 */
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

/**
 * Render the Top 1 Hero Issue Card
 */
function renderHeroSection(filteredData) {
    const heroWrapper = document.getElementById('hero-card-wrapper');
    if (!heroWrapper) return;

    if (filteredData.length === 0) {
        heroWrapper.innerHTML = `<div class="no-results"><p>필터 조건에 일치하는 하이라이트 뉴스가 없습니다.</p></div>`;
        return;
    }

    // Top 1 highest absolute impact score issue
    const heroNews = [...filteredData].sort((a, b) => Math.abs(b.impactScore) - Math.abs(a.impactScore))[0];
    const isBull = heroNews.sentiment === "BULLISH";
    const gaugeWidth = Math.abs(heroNews.impactScore);

    const stockTagsHtml = heroNews.phase2DeepAnalysis.targetStocks.map(stock => `
        <span class="stock-tag-item ${stock.sentiment === 'BULLISH' ? 'bull' : 'bear'}">
            <i class="fa-solid ${stock.sentiment === 'BULLISH' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}"></i>
            ${stock.name} (${stock.expectedImpact})
        </span>
    `).join('');

    heroWrapper.innerHTML = `
        <div class="hero-card ${!isBull ? 'bearish-hero' : ''}">
            <div class="hero-top-meta">
                <div class="hero-badge-group">
                    <span class="top-impact-badge"><i class="fa-solid fa-fire"></i> TOP 1 IMPACT</span>
                    <span class="badge-category">${heroNews.category}</span>
                </div>
                <span class="hero-time-source"><i class="fa-regular fa-clock"></i> ${heroNews.source} • ${heroNews.timestamp}</span>
            </div>

            <h3 class="hero-title-en">${heroNews.titleEn}</h3>
            <h4 class="hero-title-kr">${heroNews.titleKr}</h4>

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
                    <h4><i class="fa-solid fa-chart-line"></i> 수혜/피해 예상 핵심 종목</h4>
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

/**
 * Render Top 2~10+ News Cards Grid
 */
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

    // Render cards
    gridEl.innerHTML = filteredData.map(news => {
        const isBull = news.sentiment === "BULLISH";
        const stockPillsHtml = news.phase2DeepAnalysis.targetStocks.map(s => `
            <span class="mini-stock-pill ${s.sentiment === 'BULLISH' ? 'bull' : 'bear'}">
                ${s.name} ${s.expectedImpact}
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

                    <h3 class="card-title-kr" title="${news.titleKr}">${news.titleKr}</h3>
                    <p class="card-title-en" title="${news.titleEn}">${news.titleEn}</p>
                    <p class="card-summary">${news.summary}</p>
                </div>

                <div>
                    <div class="card-stocks-row">
                        ${stockPillsHtml}
                    </div>

                    <div class="card-action-bar">
                        <span class="card-source-time">${news.source.split(' ')[0]} • ${news.timestamp.split(' ')[1]}</span>
                        <button class="btn-card-detail btn-open-modal" data-id="${news.id}">
                            보고서 보기 <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Update mobile filter active count badge
 */
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

/**
 * Synchronize stock pill selection across sidebar and mobile quick chip bar
 */
function syncStockPillSelection() {
    // 1. Sidebar pills
    document.querySelectorAll('.stock-tag-cloud .stock-pill').forEach(pill => {
        const stockName = pill.getAttribute('data-stock');
        if (appState.selectedStock === stockName) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });

    // 2. Mobile top quick chips
    document.querySelectorAll('#mobile-quick-stock-chips .quick-chip').forEach(chip => {
        const stockName = chip.getAttribute('data-stock');
        if ((stockName === 'ALL' && appState.selectedStock === null) || (stockName === appState.selectedStock)) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });
}

/**
 * Main Render Trigger
 */
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
// 5. DETAILED ANALYSIS REPORT MODAL & CHART.JS INTEGRATION
// ==========================================================================

function openModal(newsId) {
    const news = newsDataset.find(n => n.id === newsId);
    if (!news) return;

    appState.currentModalNewsId = newsId;
    const isBull = news.sentiment === "BULLISH";

    // Populate Header & Meta
    document.getElementById('modal-category').textContent = news.category;
    document.getElementById('modal-source-time').textContent = `${news.source} • ${news.timestamp}`;
    document.getElementById('modal-title').textContent = news.titleKr;
    document.getElementById('modal-original-title').textContent = news.titleEn;

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

    // Stage 2 Transmission
    document.getElementById('modal-transmission-text').textContent = news.phase2DeepAnalysis.transmissionMechanism;

    // Target Stock Impact Cards List
    const stockListEl = document.getElementById('modal-stock-list');
    stockListEl.innerHTML = news.phase2DeepAnalysis.targetStocks.map(stock => `
        <div class="stock-impact-card ${stock.sentiment === 'BULLISH' ? 'bull' : 'bear'}">
            <div class="stock-card-header">
                <span class="stock-name-ticker">
                    ${stock.name} <span class="stock-ticker-code">${stock.ticker}</span>
                </span>
                <span class="stock-expected-change ${stock.sentiment === 'BULLISH' ? 'text-green' : 'text-red'}">
                    ${stock.expectedImpact}
                </span>
            </div>
            <p class="stock-reasoning">${stock.reasoning}</p>
        </div>
    `).join('');

    // Outlook & Risk Factors
    document.getElementById('modal-short-term').textContent = news.phase2DeepAnalysis.shortTermOutlook;
    document.getElementById('modal-long-term').textContent = news.phase2DeepAnalysis.longTermOutlook;
    
    const riskListEl = document.getElementById('modal-risk-list');
    riskListEl.innerHTML = news.phase2DeepAnalysis.riskFactors.map(risk => `<li>${risk}</li>`).join('');

    // Render Chart.js
    renderStockChart(news.phase2DeepAnalysis.targetStocks);

    // Show Modal Overlay
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // prevent background scrolling
}

function closeModal() {
    const backdrop = document.getElementById('modal-backdrop');
    backdrop.classList.add('hidden');
    document.body.style.overflow = '';
    appState.currentModalNewsId = null;

    if (currentChartInstance) {
        currentChartInstance.destroy();
        currentChartInstance = null;
    }
}

/**
 * Render Chart.js Chart in Modal
 */
function renderStockChart(targetStocks) {
    const canvas = document.getElementById('impactChart');
    if (!canvas) return;

    if (currentChartInstance) {
        currentChartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');

    // Parse percentage string (e.g. "+5.5% ~ +8.2%" -> average float 6.85)
    const labels = targetStocks.map(s => s.name);
    const dataValues = targetStocks.map(s => {
        const numbers = s.expectedImpact.match(/[-+]?\d*\.?\d+/g);
        if (numbers && numbers.length >= 2) {
            const avg = (parseFloat(numbers[0]) + parseFloat(numbers[1])) / 2;
            return avg;
        } else if (numbers && numbers.length === 1) {
            return parseFloat(numbers[0]);
        }
        return s.sentiment === 'BULLISH' ? 4.0 : -4.0;
    });

    const backgroundColors = targetStocks.map(s => 
        s.sentiment === 'BULLISH' ? 'rgba(0, 230, 118, 0.7)' : 'rgba(255, 82, 82, 0.7)'
    );
    const borderColors = targetStocks.map(s => 
        s.sentiment === 'BULLISH' ? '#00e676' : '#ff5252'
    );

    currentChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '예상 등락폭 (%)',
                data: dataValues,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y', // Horizontal bar chart
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw;
                            return ` 예상 등락률: ${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.08)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'JetBrains Mono' },
                        callback: function(val) { return val + '%'; }
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#f1f5f9',
                        font: { family: 'Inter', weight: 'bold' }
                    }
                }
            }
        }
    });
}

// ==========================================================================
// 6. PIPELINE SIMULATION CONSOLE ENGINE
// ==========================================================================

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
        { time: 200, type: "system", text: "[SYSTEM] 글로벌 파이프라인 인프라 연결 시작 (RSS, Bloomberg API, Reuters Feed)" },
        { time: 500, type: "info", text: "[FETCH] 실시간 글로벌 헤드라인 10건 수집 완료 (반도체, 통화정책, 지정학, 해운)" },
        { time: 900, type: "filter", text: "[1단계 엑기스] 고유 키워드 추출 & 스크리닝 (Pass: 10건 / Reject: 0건)" },
        { time: 1400, type: "info", text: "[2단계 LLM 엔진] 한국 증시(KOSPI/KOSDAQ) 전파 경로 Vector 계산 중..." },
        { time: 1900, type: "success", text: "[2단계 LLM 엔진] 수혜/피해 24개 종목 연관 매핑 및 예상 등락률 산출 완료!" },
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

    setTimeout(() => {
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
    // Open Modal buttons
    document.querySelectorAll('.btn-open-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newsId = e.currentTarget.getAttribute('data-id');
            openModal(newsId);
        });
    });
}

function initEventListeners() {
    // Mobile Sidebar Drawer Controls
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
        // Only restore scroll if modal is not open
        if (!document.getElementById('modal-backdrop') || document.getElementById('modal-backdrop').classList.contains('hidden')) {
            document.body.style.overflow = '';
        }
    }

    if (mobileFilterBtn) mobileFilterBtn.addEventListener('click', openMobileDrawer);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeMobileDrawer);
    if (mobileDrawerBackdrop) mobileDrawerBackdrop.addEventListener('click', closeMobileDrawer);

    // Mobile Main Quick Stock Chips
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

    // Search Bar Input
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

    // Sentiment Radio Pills
    document.querySelectorAll('.sentiment-pill-group .pill-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.sentiment-pill-group .pill-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            appState.selectedSentiment = e.currentTarget.getAttribute('data-sentiment');
            renderApp();
        });
    });

    // Sector Dropdown
    const sectorSelect = document.getElementById('sector-select');
    if (sectorSelect) {
        sectorSelect.addEventListener('change', (e) => {
            appState.selectedSector = e.target.value;
            renderApp();
        });
    }

    // Impact Threshold Range Slider
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

    // Quick Stock Tag Cloud Pills (Sidebar)
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

    // Sort Dropdown
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            appState.sortBy = e.target.value;
            renderApp();
        });
    }

    // Reset Filters Button
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

    // Simulation Trigger Button
    const runSimBtn = document.getElementById('btn-run-simulation');
    if (runSimBtn) {
        runSimBtn.addEventListener('click', runPipelineSimulation);
    }

    // Modal Close Buttons & Backdrop Click
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

    // Keyboard ESC key to close modal or mobile drawer
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeMobileDrawer();
        }
    });
}

// Initialize Application on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
    startGlobalMarketClocks();
    initEventListeners();
    renderApp();
});
