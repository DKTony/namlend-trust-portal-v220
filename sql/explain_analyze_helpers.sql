-- EXPLAIN ANALYZE Helper Queries for NamLend Trust
-- Run these in Supabase SQL Editor to verify index usage

-- 1. Verify document_verification_requirements indexes
-- Should use: idx_doc_verification_user_type_verified and idx_doc_verification_user_type_unique

EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM document_verification_requirements 
WHERE user_id = 'd0825c06-82ce-4b37-b6ea-fc4a160601b1' 
  AND document_type = 'id_document' 
  AND is_verified = true;

-- 2. Verify KYC document lookup by user
-- Should use: idx_doc_verification_user_type_verified

EXPLAIN (ANALYZE, BUFFERS)
SELECT document_type, is_required, is_verified, is_submitted, rejection_reason
FROM document_verification_requirements
WHERE user_id = 'd0825c06-82ce-4b37-b6ea-fc4a160601b1'
ORDER BY document_type;

-- 3. Verify loans index usage
-- Should use: idx_loans_user_status

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM loans 
WHERE user_id = 'd0825c06-82ce-4b37-b6ea-fc4a160601b1' 
  AND status IN ('approved', 'active', 'disbursed');

-- 4. Verify payments via loans relationship
-- Should use: idx_payments_loan_id and idx_loans_user_status

EXPLAIN (ANALYZE, BUFFERS)
SELECT p.*, l.user_id 
FROM payments p
INNER JOIN loans l ON p.loan_id = l.id
WHERE l.user_id = 'd0825c06-82ce-4b37-b6ea-fc4a160601b1';

-- 5. Verify profiles lookup
-- Should use: idx_profiles_user_id

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM profiles 
WHERE user_id = 'd0825c06-82ce-4b37-b6ea-fc4a160601b1';

-- 6. Check for sequential scans (should show minimal Seq Scan operations)
-- This query helps identify missing indexes

SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE schemaname = 'public' 
  AND tablename IN ('document_verification_requirements', 'loans', 'payments', 'profiles')
  AND attname IN ('user_id', 'document_type', 'status', 'loan_id')
ORDER BY tablename, attname;

-- 7. Index usage statistics
-- Shows how often indexes are being used

SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
  AND tablename IN ('document_verification_requirements', 'loans', 'payments', 'profiles')
ORDER BY idx_scan DESC;

-- 8. Performance test: Complex eligibility query
-- Should use multiple indexes efficiently

EXPLAIN (ANALYZE, BUFFERS)
WITH user_docs AS (
    SELECT 
        user_id,
        COUNT(*) FILTER (WHERE is_required = true) as required_count,
        COUNT(*) FILTER (WHERE is_required = true AND is_verified = true) as verified_count
    FROM document_verification_requirements
    WHERE user_id = 'd0825c06-82ce-4b37-b6ea-fc4a160601b1'
    GROUP BY user_id
),
user_profile AS (
    SELECT user_id, profile_completion_percentage
    FROM profiles
    WHERE user_id = 'd0825c06-82ce-4b37-b6ea-fc4a160601b1'
)
SELECT 
    p.user_id,
    p.profile_completion_percentage,
    COALESCE(d.required_count, 0) as required_docs,
    COALESCE(d.verified_count, 0) as verified_docs,
    CASE 
        WHEN p.profile_completion_percentage >= 80 
         AND COALESCE(d.verified_count, 0) = COALESCE(d.required_count, 0)
         AND COALESCE(d.required_count, 0) > 0
        THEN true 
        ELSE false 
    END as eligible
FROM user_profile p
LEFT JOIN user_docs d ON p.user_id = d.user_id;

-- Expected Results:
-- - Index Scan operations should dominate over Seq Scan
-- - Execution time should be < 50ms for single-user queries
-- - Buffer hits should be high, reads should be low after first run
-- - Cost estimates should be reasonable (< 100 for simple queries)

-- To run these queries:
-- 1. Copy each EXPLAIN query individually
-- 2. Paste into Supabase SQL Editor
-- 3. Replace the user_id with an actual user ID from your database
-- 4. Look for "Index Scan" in results (good) vs "Seq Scan" (potentially bad)
-- 5. Check execution time in "Execution Time" field
