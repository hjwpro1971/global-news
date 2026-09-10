-- 본문 기반 요약 폴링 파이프라인용 상태 컬럼 추가.
-- NAS(news_enricher.py)가 5분마다 summary_status='pending'인 행을 조회해 본문을
-- 읽고 요약한 뒤, 결과를 'done'(성공) 또는 'failed'(본문 fetch/파싱 실패)로 되돌려 쓴다.
ALTER TABLE news_shortlist ADD COLUMN IF NOT EXISTS summary_status text NOT NULL DEFAULT 'pending';
ALTER TABLE domestic_news_shortlist ADD COLUMN IF NOT EXISTS summary_status text NOT NULL DEFAULT 'pending';

-- 부분 인덱스: 대부분의 행은 결국 'done'이 되므로, 폴링 쿼리가 매번 전체 스캔하지
-- 않도록 'pending' 행만 인덱싱한다.
CREATE INDEX IF NOT EXISTS news_shortlist_summary_status_idx
    ON news_shortlist (summary_status) WHERE summary_status = 'pending';
CREATE INDEX IF NOT EXISTS domestic_news_shortlist_summary_status_idx
    ON domestic_news_shortlist (summary_status) WHERE summary_status = 'pending';
