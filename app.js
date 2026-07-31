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
        titleEn: "US Commerce Department Announces $15B HBM Semiconductor Subsidy & AI Chip Export Regulations Update",
        titleKr: "미 상무부, HBM 반도체 150억 달러 보조금 지급 확정 및 차세대 AI 칩 수출 규제 개정안 발표",
        source: "Bloomberg Terminals",
        timestamp: "2026-07-31 16:45",
        category: "반도체/AI",
        impactScore: 92,
        sentiment: "BULLISH",
        summary: "미국 정부가 차세대 HBM4 패키징 및 메모리 반도체 제조 시설에 150억 달러 직접 보조금을 확정함에 따라 한국 반도체 기업의 미국 내 팹 건설 및 글로벌 독점 공급 지위가 크게 강화될 전망입니다.",
        phase1Filtering: {
            matchKeywords: ["HBM", "Semiconductor", "Subsidy", "Export Control", "AI Chip"],
            priorityScore: 95,
            passed: true,
            screeningReason: "반도체 핵심 키워드(HBM, Subsidy) 및 최고 순위 파급력 이슈 감지"
        },
        phase2DeepAnalysis: {
            transmissionMechanism: "미 보조금 확정 ➔ 엔디비아·빅테크향 HBM3e/HBM4 장기 공급계약 체결 가속 ➔ 국내 메모리 2사 단가(ASP) 프리미엄 유지 및 한미반도체 등 TC 본더 장비사 매출 폭증",
            impactedSectors: [
                { sector: "HBM/메모리 반도체", direction: "UP", magnitude: 95 },
                { sector: "반도체 후공정/장비", direction: "UP", magnitude: 90 },
                { sector: "파운드리/팹리스", direction: "UP", magnitude: 70 }
            ],
            targetStocks: [
                {
                    name: "SK하이닉스",
                    ticker: "000660",
                    sentiment: "BULLISH",
                    expectedImpact: "+5.5% ~ +8.2%",
                    reasoning: "HBM3e/HBM4 글로벌 시장 점유율 1위 지위 지속 및 보조금 수혜로 미국 인디애나 패키징 공장 연내 착공 모멘텀.",
                    keyDrivers: ["NVIDIA 독점적 공급 지속", "HBM4 16단 3D 적층 기술격차", "보조금 징수 반영"]
                },
                {
                    name: "삼성전자",
                    ticker: "005930",
                    sentiment: "BULLISH",
                    expectedImpact: "+3.8% ~ +5.5%",
                    reasoning: "텍사스 테일러 팹 보조금 집행 확정으로 파운드리 턴어라운드 및 HBM3e 빅테크 퀄테스트 최종 통과 기대감.",
                    keyDrivers: ["테일러 파운드리 보조금 확정", "HBM3e 공급망 진입 완료", "파운드리 수율 개선"]
                },
                {
                    name: "한미반도체",
                    ticker: "042700",
                    sentiment: "BULLISH",
                    expectedImpact: "+7.0% ~ +11.5%",
                    reasoning: "HBM4 전용 듀얼 TC 본더 장비 락인(Lock-in) 효과로 사상 최대 수주 잔고 달성 예상.",
                    keyDrivers: ["TC 본더 독점적 수주", "HBM 생산량 증설 수혜", "영업이익률 40% 돌파"]
                }
            ],
            shortTermOutlook: "외국인/기관 순매수 유입 급증으로 반도체 섹터 주도 갭상승 가능성 매우 높음.",
            longTermOutlook: "2026~2027년 HBM4 공급 부족 현상 지속에 따른 실적 턴어라운드 본격화.",
            riskFactors: [
                "미 중국향 범용 반도체 추가 규제 가능성",
                "글로벌 AI 데이터센터 전기 부족에 따른 투자 속도 조절 이슈"
            ]
        }
    },
    {
        id: "news-02",
        titleEn: "Federal Reserve Signals 50bps Rate Cut as US PCE Inflation Cools to 1.9%",
        titleKr: "미 연준(Fed), 근원 PCE 물가 1.9% 안정에 빅컷(50bp) 금리 인하 가능성 공식 언급",
        source: "Reuters Financial",
        timestamp: "2026-07-31 15:30",
        category: "통화정책/금융",
        impactScore: 85,
        sentiment: "BULLISH",
        summary: "미 연준 제롬 파월 의장이 잭슨홀 전초 연설에서 인플레이션 목표 달성을 선언하며 9월 FOMC에서 50bp 완화적 금리 인하 수순을 강력히 시그널링했습니다.",
        phase1Filtering: {
            matchKeywords: ["Federal Reserve", "Rate Cut", "PCE Inflation", "Fed Chair"],
            priorityScore: 88,
            passed: true,
            screeningReason: "매크로 유동성 핵심 키워드(Fed, Rate Cut) 매칭 완료"
        },
        phase2DeepAnalysis: {
            transmissionMechanism: "미 금리 인하 시그널 ➔ 원/달러 환율 안정(1,300원 하회) ➔ 한국은행 금리인하 여력 확보 ➔ 성장주(바이오, IT) 할인율 감소 및 금융주 배당 매력 부각",
            impactedSectors: [
                { sector: "성장주 (바이오/IT)", direction: "UP", magnitude: 88 },
                { sector: "금융/지주사", direction: "UP", magnitude: 80 },
                { sector: "건설/부동산 REITs", direction: "UP", magnitude: 75 }
            ],
            targetStocks: [
                {
                    name: "KB금융",
                    ticker: "105560",
                    sentiment: "BULLISH",
                    expectedImpact: "+3.2% ~ +5.0%",
                    reasoning: "금리 하락에 따른 자산건전성 개선 및 밸류업 프로그램 기반 자사주 매입·소각 확대 추진.",
                    keyDrivers: ["주주환원율 40% 돌파", "원화 강세시 외국인 유입", "연체율 관리 안정"]
                },
                {
                    name: "NAVER",
                    ticker: "035420",
                    sentiment: "BULLISH",
                    expectedImpact: "+4.2% ~ +6.8%",
                    reasoning: "고금리 부담 완화로 밸류에이션 부담 감소 및 AI 서비스(단큐) 매출화 가속화.",
                    keyDrivers: ["금리 인하시 멀티플 상향", "클라우드 B2B AI 실적 성장", "서치 플랫폼 반등"]
                },
                {
                    name: "삼성바이오로직스",
                    ticker: "207940",
                    sentiment: "BULLISH",
                    expectedImpact: "+3.5% ~ +5.8%",
                    reasoning: "글로벌 빅파마 R&D 자금 유입 재개로 5공장 수주 물량 조기 확보 기대.",
                    keyDrivers: ["금리 하락시 바이오 투심 개선", "CDMO 5공장 풀가동", "생물보안법 수혜"]
                }
            ],
            shortTermOutlook: "원/달러 환율 하락과 함께 코스피 시장 전반의 외국인 바스켓 매수세 유입 기대.",
            longTermOutlook: "신흥국 자금 재유입 및 한국 증시 밸류업 재평가 국면 진입.",
            riskFactors: [
                "미 경기후퇴(Recession) 우려 재발 가능성",
                "국내 가계부채 증가에 따른 금융당국 규제"
            ]
        }
    },
    {
        id: "news-03",
        titleEn: "EU & US Enforce Strict Battery Recycled Mineral Mandate & Carbon Border Adjustment (CBAM)",
        titleKr: "미국·EU, 2차전지 배터리 재활용 광물 의무 비율 상향 및 탄소국경세(CBAM) 무역 장벽 강화 발표",
        source: "Wall Street Journal",
        timestamp: "2026-07-31 14:10",
        category: "2차전지/EV",
        impactScore: -78,
        sentiment: "BEARISH",
        summary: "EU와 미국 상무부가 2차전지 셀 제조업체들에게 중국산 리튬/니켈 배터리 소재 사용 금지 조항을 대폭 강화함에 따라 국내 배터리 셀 3사의 소재 공급망 대체 비용 부담이 가중될 예정입니다.",
        phase1Filtering: {
            matchKeywords: ["Battery", "CBAM", "Recycled Mineral", "EU Regulation"],
            priorityScore: 82,
            passed: true,
            screeningReason: "2차전지 규제 악재 키워드(CBAM, Battery Mandate) 감지"
        },
        phase2DeepAnalysis: {
            transmissionMechanism: "북미/유럽 무역 장벽 강화 ➔ 중국 외 미주/오세아니아 광물 조달 비용 급증 ➔ 배터리 셀 마진율 압박 ➔ 전기차 캐즘(Chasm) 탈출 지연 및 영업이익 하향",
            impactedSectors: [
                { sector: "2차전지 셀/양극재", direction: "DOWN", magnitude: 85 },
                { sector: "전기차 완제차", direction: "DOWN", magnitude: 65 },
                { sector: "폐배터리 리사이클링", direction: "UP", magnitude: 75 }
            ],
            targetStocks: [
                {
                    name: "LG에너지솔루션",
                    ticker: "373220",
                    sentiment: "BEARISH",
                    expectedImpact: "-3.5% ~ -6.0%",
                    reasoning: "유럽/북미 공급망 재편 비용 증가 및 AMPC(첨단제조세액공제) 수혜 축소 우려.",
                    keyDrivers: ["공급망 전환 비용 발생", "유럽 EV 판매 둔화", "광물 가격 변동성"]
                },
                {
                    name: "POSCO홀딩스",
                    ticker: "005490",
                    sentiment: "BEARISH",
                    expectedImpact: "-2.8% ~ -4.5%",
                    reasoning: "리튬 수용성 시험 기간 연장 및 철강 CBAM 과세 적용에 따른 수출 원가 상승.",
                    keyDrivers: ["리튬 가격 하락세", "탄소국경세 적용 시작", "철강 수요 둔화"]
                },
                {
                    name: "성일하이텍",
                    ticker: "365340",
                    sentiment: "BULLISH",
                    expectedImpact: "+5.0% ~ +8.5%",
                    reasoning: "(반사이익) 재활용 광물 의무화 법안으로 폐배터리 리사이클링 규제 준수 수혜 독점.",
                    keyDrivers: ["재활용 광물 의무 비율 상승", "유럽 리사이클링 팹 가동", "비중국산 원소재 가치 상승"]
                }
            ],
            shortTermOutlook: "2차전지 대형주 위주의 기관/외인 매도물량出 가능성. 당분간 보수적 접근 필요.",
            longTermOutlook: "비중국 공급망 체계 완성 기업과 리사이클링 전문 기업 간 옥석 가리기 심화.",
            riskFactors: [
                "미 대선 공약 변경에 따른 IRA 법안 폐지 위험",
                "중국 LFP 배터리의 유럽 시장 침투율 증가"
            ]
        }
    },
    {
        id: "news-04",
        titleEn: "Middle East Maritime Conflict Escalates: Red Sea Transit Blocked, Freight Rates Surge 40%",
        titleKr: "중동 홍해 해상 분쟁 전면 확대: 운항 중단에 상하이컨테이너운임지수(SCFI) 40% 폭등",
        source: "Financial Times",
        timestamp: "2026-07-31 13:20",
        category: "조선/해운",
        impactScore: 88,
        sentiment: "BULLISH",
        summary: "중동 지정학적 리스크 가중으로 유럽-아시아 항로 컨테이너선들이 아프리카 희망봉 우회 운항을 강제당하면서 글로벌 해상 운임(SCFI)이 직전 주 대비 40% 폭등했습니다.",
        phase1Filtering: {
            matchKeywords: ["Red Sea", "Freight Rate", "Shipping", "SCFI Surge"],
            priorityScore: 90,
            passed: true,
            screeningReason: "해운 운임 및 중동 리스크 키워드 매칭"
        },
        phase2DeepAnalysis: {
            transmissionMechanism: "희망봉 우회 운항 ➔ 선박 우회로 선복량(Supply) 부족 ➔ 해상 컨테이너/탱커 운임 피크아웃 반등 ➔ 해운사 영업이익 직결 및 신조선가(Newbuilding Price) 하반기 추가 상승",
            impactedSectors: [
                { sector: "컨테이너/탱커 해운", direction: "UP", magnitude: 92 },
                { sector: "신조선/조선 기자재", direction: "UP", magnitude: 85 },
                { sector: "항공화물/물류", direction: "UP", magnitude: 70 }
            ],
            targetStocks: [
                {
                    name: "HMM",
                    ticker: "011200",
                    sentiment: "BULLISH",
                    expectedImpact: "+6.8% ~ +10.5%",
                    reasoning: "SCFI 운임 지수 폭등에 따른 3분기 어닝 서프라이즈 확실시 및 선대 확장 수혜.",
                    keyDrivers: ["SCFI 운임지수 3,500pt 돌파", "희망봉 우회 장기화", "컨테이너 할증료(PSS) 부과"]
                },
                {
                    name: "한화오션",
                    ticker: "042660",
                    sentiment: "BULLISH",
                    expectedImpact: "+4.5% ~ +7.2%",
                    reasoning: "해운사 수익성 개선에 따른 신조선 발주 재개 및 방산 함정 글로벌 수주 확정.",
                    keyDrivers: ["신조선가 지수 최고치 경신", "LNG/컨선 고마진 수주 잔고", "미 해군 MRO 수주"]
                },
                {
                    name: "HD한국조선해양",
                    ticker: "009540",
                    sentiment: "BULLISH",
                    expectedImpact: "+3.8% ~ +6.0%",
                    reasoning: "조선 3사 중 최고 선가 수주 비중 및 친환경 암모니아/자율운항 선박 시장 선점.",
                    keyDrivers: ["3년 치 수주 물량 확보", "조선 자회사 실적 턴어라운드", "친환경 선가 프리미엄"]
                }
            ],
            shortTermOutlook: "해운 및 조선주 강력한 주가 모멘텀 형성. 단기 수급 쏠림 현상 유효.",
            longTermOutlook: "선박 교체 주기 및 고선가 물량 인도 본격화로 3년 장기 슈퍼사이클 가시화.",
            riskFactors: [
                "중동 평화 협정 조기 체결에 따른 운임 지수 급락 위험",
                "글로벌 물동량 위축 위험"
            ]
        }
    },
    {
        id: "news-05",
        titleEn: "NATO Members Unanimously Agree to Boost Defense Budget to 3.5% of GDP & Procure K-Weaponry",
        titleKr: "나토(NATO) 32개국 국방비 GDP 3.5% 증액 전격 합의… K-방산 주요 화력 체계 추가 긴급 도입",
        source: "Defense News",
        timestamp: "2026-07-31 11:50",
        category: "방산/항공",
        impactScore: 86,
        sentiment: "BULLISH",
        summary: "유럽 나토 회원국들이 안보 위기 대응을 위해 2027년까지 국방 지출을 GDP 대비 3.5%로 대폭 상향하기로 합의했습니다. 납기 준수율 1위인 K-방산 무기 체계의 동유럽/서유럽 추가 수주가 임박했습니다.",
        phase1Filtering: {
            matchKeywords: ["NATO", "Defense Budget", "K-Weaponry", "Procurement"],
            priorityScore: 89,
            passed: true,
            screeningReason: "방산 국방 예산 증액 메가 트렌드 확인"
        },
        phase2DeepAnalysis: {
            transmissionMechanism: "유럽 국방비 증액 ➔ 즉시 전력화 가능한 한국산 자주포·장갑차·유도무기 선호 ➔ 2차 굵직한 해외 수주 계약 체결 ➔ 방산 4사 해외 매출 비중 60% 돌파",
            impactedSectors: [
                { sector: "지상무기/자주포/전차", direction: "UP", magnitude: 90 },
                { sector: "유도무기/항공방산", direction: "UP", magnitude: 84 },
                { sector: "방산 부품/소재", direction: "UP", magnitude: 78 }
            ],
            targetStocks: [
                {
                    name: "한화에어로스페이스",
                    ticker: "012450",
                    sentiment: "BULLISH",
                    expectedImpact: "+6.0% ~ +9.5%",
                    reasoning: "K9 자주포 및 천무 유도무기 루마니아·폴란드 추가 납품 실적 반영 및 사상 최대 영업이익.",
                    keyDrivers: ["K9 자주포 추가 2차 계약", "루마니아 장갑차 사업 수주", "방산 해외 매출 비중 65%"]
                },
                {
                    name: "현대로템",
                    ticker: "064350",
                    sentiment: "BULLISH",
                    expectedImpact: "+5.2% ~ +8.0%",
                    reasoning: "K2 전차 폴란드 2차 실행 계약 가시화 및 동유럽 타 국가 진출 본격화.",
                    keyDrivers: ["K2 전차 현지 생산 체계 완성", "영업이익률 15% 돌파", "수주 잔고 15조원 상회"]
                },
                {
                    name: "LIG넥스원",
                    ticker: "079550",
                    sentiment: "BULLISH",
                    expectedImpact: "+4.5% ~ +7.5%",
                    reasoning: "천궁-II 중거리 요격미사일 중동 및 유럽 추가 공급 계약 타결 모멘텀.",
                    keyDrivers: ["천궁-II 해외 방산 수주", "미국 비궁 로켓 FDA 양산 체계", "유도무기 독점 지위"]
                }
            ],
            shortTermOutlook: "동유럽 수주 공시 임박에 따른 외국인 순매수 지속.",
            longTermOutlook: "글로벌 재무장 시대 진입에 따라 2030년까지 구조적 장기 성장 구도.",
            riskFactors: [
                "국내 방산 방위사업청 예산 집행 지연",
                "원자재(특수강 등) 가격 상승에 따른 원가 부담"
            ]
        }
    },
    {
        id: "news-06",
        titleEn: "US FDA Grants Accelerated Approval for Next-Gen Alzheimer's Antibody Drug",
        titleKr: "미 FDA, 국내 바이오 기업 신약 파이프라인 적용 차세대 알츠하이머 항체 신속 승인",
        source: "BioWorld Today",
        timestamp: "2026-07-31 10:15",
        category: "바이오/제약",
        impactScore: 75,
        sentiment: "BULLISH",
        summary: "미국 FDA가 뇌혈관 장벽(BBB) 투과율을 5배 향상시킨 차세대 알츠하이머 치매 치료제에 대해 임상 3상 데이터 우수성을 인정하고 신속 승인(Accelerated Approval)을 최종 의결했습니다.",
        phase1Filtering: {
            matchKeywords: ["FDA Approval", "Alzheimer", "Antibody Drug", "Bio Pipeline"],
            priorityScore: 78,
            passed: true,
            screeningReason: "바이오 FDA 승인 핵심 긍정 모멘텀"
        },
        phase2DeepAnalysis: {
            transmissionMechanism: "FDA 승인 ➔ 글로벌 빅파마 기술이전(L/O) 계약 가치 급증 ➔ 국내 바이오 신약 파이프라인 재평가 ➔ 바이오 섹터 전반의 투자 심리 강력 개선",
            impactedSectors: [
                { sector: "알츠하이머/뇌질환 신약", direction: "UP", magnitude: 88 },
                { sector: "바이오시밀러/CDMO", direction: "UP", magnitude: 75 }
            ],
            targetStocks: [
                {
                    name: "셀트리온",
                    ticker: "068270",
                    sentiment: "BULLISH",
                    expectedImpact: "+3.5% ~ +5.8%",
                    reasoning: "미국 짐펜트라(Zymfentra) 처방 집계 호조 및 바이오신약 플랫폼 가치 상승.",
                    keyDrivers: ["미국 PBM 처방집 등재 90% 완료", "신약 매출 비중 증가", "합병 시너지 가시화"]
                },
                {
                    name: "유한양행",
                    ticker: "000100",
                    sentiment: "BULLISH",
                    expectedImpact: "+4.0% ~ +6.5%",
                    reasoning: "렉라자(레이저티닙) 미 FDA 승인 후 글로벌 로열티 수입 본격화 및 2차 파이프라인 가치 반영.",
                    keyDrivers: ["J&J 렉라자 로열티 순유입", "후속 항암 파이프라인 임상 진전", "안정적 재무구조"]
                }
            ],
            shortTermOutlook: "제약바이오 숏커버링 유입에 따른 거래량 증가 및 상방 오픈.",
            longTermOutlook: "K-바이오의 글로벌 상업화 신약 창출 능력 검증 완료.",
            riskFactors: [
                "임상 3상 완료 후 상업화 마케팅 경쟁 심화",
                "미국 약가 인하 정책(IRA 약가 협상)"
            ]
        }
    },
    {
        id: "news-07",
        titleEn: "Global Tech Giants Announce Additional $40B AI Infrastructure Capex Expansion",
        titleKr: "빅테크 4사(MS·구글·AWS·메타), AI 데이터센터 설비투자(CapEx) 400억 달러 추가 증액 발표",
        source: "CNBC Tech",
        timestamp: "2026-07-31 09:30",
        category: "빅테크/IT",
        impactScore: 82,
        sentiment: "BULLISH",
        summary: "글로벌 빅테크 기업들이 실적 발표 컨퍼런스 콜에서 AI 클라우드 수요 폭증을 감당하기 위해 2026~2027년 자본지출(CapEx)을 당초 계획보다 400억 달러 추가 증액한다고 공식 선언했습니다.",
        phase1Filtering: {
            matchKeywords: ["Tech Giants", "AI Infrastructure", "Capex Expansion", "Datacenter"],
            priorityScore: 85,
            passed: true,
            screeningReason: "빅테크 AI 투자 증액 모멘텀 감지"
        },
        phase2DeepAnalysis: {
            transmissionMechanism: "AI CapEx 증액 ➔ 엔비디아/AMD 차세대 칩 서버 증설 ➔ 엔터프라이즈 SSD 및 HBM 메모리 주문 폭주 ➔ 국내 IT/반도체/AI 소프트웨어 생태계 활성화",
            impactedSectors: [
                { sector: "서버용 SSD / HBM", direction: "UP", magnitude: 90 },
                { sector: "AI 솔루션 / B2B SaaS", direction: "UP", magnitude: 78 }
            ],
            targetStocks: [
                {
                    name: "SK하이닉스",
                    ticker: "000660",
                    sentiment: "BULLISH",
                    expectedImpact: "+4.0% ~ +6.5%",
                    reasoning: "빅테크 AI 서버 증설에 따른 고용량 eSSD 및 HBM3e 12단 주문량 증가.",
                    keyDrivers: ["eSSD 매출 전년비 150% 증대", "빅테크 장기 공급 계약", "영업이익률 고점 경신"]
                },
                {
                    name: "NAVER",
                    ticker: "035420",
                    sentiment: "BULLISH",
                    expectedImpact: "+3.0% ~ +4.8%",
                    reasoning: "하이퍼클로바X 기반 사우디 아라비아 및 B2B 엔터프라이즈 AI 매출 가시화.",
                    keyDrivers: ["중동 AI 클라우드 수주", "네이버플러스 멤버십 성장", "광고 집행 효율화"]
                }
            ],
            shortTermOutlook: "IT 대형주 테마 순환매 유입 기대.",
            longTermOutlook: "생성형 AI 서비스의 본격 수익화 단계 진입.",
            riskFactors: [
                "빅테크 기업들의 AI ROI(투자 대비 수익률) 의문 부각 가능성",
                "전력망 구축 지연 우려"
            ]
        }
    },
    {
        id: "news-08",
        titleEn: "Bank of Japan Hikes Interest Rate to 0.75%, Triggering Global Yen Carry Trade Unwinding Signals",
        titleKr: "일본은행(BOJ) 기준금리 0.75%로 전격 인상… 글로벌 엔캐리 트레이드 청산 우려 재발",
        source: "Nikkei Asia",
        timestamp: "2026-07-31 08:45",
        category: "통화정책/금융",
        impactScore: -70,
        sentiment: "BEARISH",
        summary: "일본은행 우에다 가즈오 총재가 일본 내 임금 상승과 물가 목표 안착을 이유로 기준금리를 0.75%로 전격 인상했습니다. 엔화 강세 전환으로 글로벌 엔캐리 자금 청산 경계감이 신흥국 증시에 부정적 변동성을 유발하고 있습니다.",
        phase1Filtering: {
            matchKeywords: ["Bank of Japan", "BOJ Rate Hike", "Yen Carry", "Global Liquidity"],
            priorityScore: 84,
            passed: true,
            screeningReason: "BOJ 금리 인상 및 엔캐리 청산 매크로 위험 감지"
        },
        phase2DeepAnalysis: {
            transmissionMechanism: "BOJ 금리 인상 ➔ 엔화 급등 ➔ 엔캐리 자금 자산 회수 ➔ 글로벌 증시 단기 변동성 확대 및 한국 증시 외국인 순매도 압력 증가",
            impactedSectors: [
                { sector: "신흥국 주식 (KOSPI 포함)", direction: "DOWN", magnitude: 75 },
                { sector: "자동차 (대일 경쟁력)", direction: "UP", magnitude: 60 }
            ],
            targetStocks: [
                {
                    name: "현대차",
                    ticker: "005380",
                    sentiment: "BULLISH",
                    expectedImpact: "+1.5% ~ +3.2%",
                    reasoning: "(반사이익) 엔화 강세 전환으로 글로벌 완제차 시장에서 일본 도요타 대비 가격 경쟁력 우위 회복.",
                    keyDrivers: ["엔화 강세시 일본 차 경쟁 우위", "하이브리드(HEV) 차종 판매 호조", "인도 법인 상장 가치"]
                },
                {
                    name: "삼성전자",
                    ticker: "005930",
                    sentiment: "BEARISH",
                    expectedImpact: "-2.0% ~ -3.5%",
                    reasoning: "글로벌 패시브 펀드의 엔캐리 청산 과정에서 외국인 비중이 높은 지수 대형주 차익실현 물량 出.",
                    keyDrivers: ["외국인 바스켓 매도세", "글로벌 매크로 유동성 축소", "단기 변동성 확대"]
                }
            ],
            shortTermOutlook: "엔/달러 환율 변동성에 따른 국내 증시 장중 변동성 확대 주의.",
            longTermOutlook: "엔화 정상화 이후 엔캐리 영향력 점진적 소멸 예상.",
            riskFactors: [
                "BOJ 연내 추가 금리 인하/인상 속도",
                "일본 국채 금리 급등 위험"
            ]
        }
    },
    {
        id: "news-09",
        titleEn: "US Highway Traffic Safety Admin Enforces Strict Autonomous Vehicle Approval Delays",
        titleKr: "미 도로교통안전국(NHTSA), 자율주행 안전 규제 문턱 강화… 주요 로보택시 상용화 순연",
        source: "Automotive News",
        timestamp: "2026-07-31 07:50",
        category: "2차전지/EV",
        impactScore: -65,
        sentiment: "BEARISH",
        summary: "미국 NHTSA가 완전 자율주행(Level 4) 운행 승인 시 엣지 케이스 안전성 입증 요건을 대폭 강화함에 따라 글로벌 완결차업체들의 로보택시 상용화 목표 시점이 최소 1년 연기되었습니다.",
        phase1Filtering: {
            matchKeywords: ["Autonomous Vehicle", "NHTSA", "Robotaxi", "Safety Regulations"],
            priorityScore: 72,
            passed: true,
            screeningReason: "자율주행 및 모빌리티 규제 지연 키워드"
        },
        phase2DeepAnalysis: {
            transmissionMechanism: "규제 문턱 강화 ➔ 자율주행 SW 및 로보택시 양산 지연 ➔ 완성차 미래 성장 모멘텀 일시 소강 ➔ 전장 부품 및 자율주행 칩 수요 지연",
            impactedSectors: [
                { sector: "자율주행 SW / 카메라 모듈", direction: "DOWN", magnitude: 70 },
                { sector: "완성차 / 전장", direction: "DOWN", magnitude: 60 }
            ],
            targetStocks: [
                {
                    name: "현대모비스",
                    ticker: "012330",
                    sentiment: "BEARISH",
                    expectedImpact: "-1.8% ~ -3.2%",
                    reasoning: "자율주행 제어기 및 람다 센서 공급 가이드라인 순연에 따른 전장 부품 성장 속도 조절.",
                    keyDrivers: ["전장 사업부 성장률 소폭 하향", "AS 부품 사업 안정적 수익 유지"]
                },
                {
                    name: "기아",
                    ticker: "000270",
                    sentiment: "BEARISH",
                    expectedImpact: "-1.5% ~ -2.8%",
                    reasoning: "PBV(목적 기반 모빌리티) 자율주행 버전 양산 일정 연기 영향.",
                    keyDrivers: ["PBV 상용화 시점 조정", "고주주환원율로 주가 하방 지지"]
                }
            ],
            shortTermOutlook: "자율주행 테마주 차익실현 및 약보합세 보일 전망.",
            longTermOutlook: "안전성 입증 후 2027년 내실 있는 상용화 재개 기대.",
            riskFactors: [
                "테슬라 FSD 글로벌 승인 여부 변수",
                "중국 자율주행 기업과의 기술 격차 이슈"
            ]
        }
    },
    {
        id: "news-10",
        titleEn: "Global LNG Export Capacity Bottlenecks Trigger Record High Carrier Spot Charter Rates",
        titleKr: "카타르·북미발 LNG 수출 프로젝트 2차 발주 폭주… 척당 신조선가 2억 7천만 달러 신고가",
        source: "TradeWinds Shipping",
        timestamp: "2026-07-31 07:10",
        category: "조선/해운",
        impactScore: 90,
        sentiment: "BULLISH",
        summary: "글로벌 LNG 수요 급증 및 카타르 2차 LNG 수송선 발주가 마무리 단계에 접어들며, 174,000 cbm 급 LNG 운반선 척당 가격이 2억 7,200만 달러로 사상 최고치를 새로 썼습니다.",
        phase1Filtering: {
            matchKeywords: ["LNG Carrier", "Charter Rate", "Qatar Project", "Shipbuilding"],
            priorityScore: 93,
            passed: true,
            screeningReason: "LNG 선가 사상 최고치 경신 호재 매칭"
        },
        phase2DeepAnalysis: {
            transmissionMechanism: "LNG선 선가 최고치 ➔ 한국 조선 3사 2028년 슬롯 도크 프리미엄 수주 ➔ 영업이익률 10% 돌파 ➔ 조선 기자재(보냉재 등) 기업 실적 수혜 폭발",
            impactedSectors: [
                { sector: "고부가가치 LNG선 조선 3사", direction: "UP", magnitude: 95 },
                { sector: "조선 보냉재 / 화물창", direction: "UP", magnitude: 90 }
            ],
            targetStocks: [
                {
                    name: "HD한국조선해양",
                    ticker: "009540",
                    sentiment: "BULLISH",
                    expectedImpact: "+5.0% ~ +7.8%",
                    reasoning: "카타르 2차 프로젝트 물량 독점 및 LNG선 도크 최다 보유로 마진율 극대화.",
                    keyDrivers: ["LNG선 척당 2.7억달러 수주", "도크 슬롯 프리미엄", "자회사 HD현대중공업 실적 견인"]
                },
                {
                    name: "동성화인텍",
                    ticker: "083500",
                    sentiment: "BULLISH",
                    expectedImpact: "+7.5% ~ +12.0%",
                    reasoning: "LNG 화물창 초저온 보냉재 독점 공급업체로 사상 최대 수주 잔고와 판가 인상 동시 수혜.",
                    keyDrivers: ["LNG 보냉재 가동률 100%", "원자재가 하락 마진 개선", "수주잔고 2년치 달성"]
                }
            ],
            shortTermOutlook: "조선/기자재주 기관 강력 매수세 진입 가시화.",
            longTermOutlook: "2028년 도크 슬롯까지 매출 확정되어 주가 우상향 궤적 공고.",
            riskFactors: [
                "조선소 후판(강재) 가격 인상 협상 타결 위험",
                "숙련 인력 수급 난항"
            ]
        }
    },
    {
        id: "news-11",
        titleEn: "US Department of Energy Commits $20B for Next-Gen SMR & Datacenter Nuclear Power Grid",
        titleKr: "미 에너지부(DOE), AI 데이터센터 전력 공급용 소형모듈원자로(SMR) 200억 달러 지원안 의결",
        source: "World Nuclear News",
        timestamp: "2026-07-31 06:30",
        category: "빅테크/IT",
        impactScore: 79,
        sentiment: "BULLISH",
        summary: "미국 정부가 AI 데이터센터의 전력 부족 위기를 해결하기 위해 차세대 SMR 원자로 10곳 상용화 및 전력망 연계 프로젝트에 200억 달러 직접 금융 지원을 확정했습니다.",
        phase1Filtering: {
            matchKeywords: ["Nuclear Energy", "SMR", "Datacenter Power", "Department of Energy"],
            priorityScore: 81,
            passed: true,
            screeningReason: "SMR 및 데이터센터 전력망 호재 키워드"
        },
        phase2DeepAnalysis: {
            transmissionMechanism: "SMR 지원 확정 ➔ 빅테크 PPA(전력구매계약) 원전 체결 ➔ K-원전 주기기 제작 수주 독점 ➔ 원전 및 송배전 설비 기업 실적 폭등",
            impactedSectors: [
                { sector: "SMR / 원자력 주기기", direction: "UP", magnitude: 86 },
                { sector: "전력망 / 변압기", direction: "UP", magnitude: 82 }
            ],
            targetStocks: [
                {
                    name: "두산에너빌리티",
                    ticker: "034020",
                    sentiment: "BULLISH",
                    expectedImpact: "+4.8% ~ +7.5%",
                    reasoning: "뉴스케일파워 및 엑스-에너지(X-Energy) SMR 파운드리 주기기 제작 수주 독점.",
                    keyDrivers: ["SMR 단조품 및 주기기 독점 제작", "미국 빅테크 전력 계약 수혜", "가스터빈 수출"]
                },
                {
                    name: "HD현대일렉트릭",
                    ticker: "267260",
                    sentiment: "BULLISH",
                    expectedImpact: "+5.5% ~ +9.0%",
                    reasoning: "미국 변압기 및 전력기기 숏티지(부족) 장기화에 따른 초고압 변압기 판가(ASP) 지속 상승.",
                    keyDrivers: ["북미 초고압 변압기 리드타임 4년", "영업이익률 20% 돌파", "수주잔고 사상 최대"]
                }
            ],
            shortTermOutlook: "원전 및 전력기기 섹터 강한 주도주 복귀 예상.",
            longTermOutlook: "AI 시대 무탄소 전원(CF100) 핵심으로서 SMR 장기 수혜 지속.",
            riskFactors: [
                "SMR 인허가 규제 기관(NRC) 심사 연기 우려",
                "원전 건설 비용 상승 위험"
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
        { time: 500, type: "info", text: "[FETCH] 실시간 글로벌 헤드라인 11건 수집 완료 (반도체, 통화정책, 지정학, 해운)" },
        { time: 900, type: "filter", text: "[1단계 엑기스] 고유 키워드 추출 & 스크리닝 (Pass: 11건 / Reject: 0건)" },
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
