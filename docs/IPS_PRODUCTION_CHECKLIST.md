# IPS Production Readiness Checklist

## Overview

This checklist ensures the IPS (Instant Payment Solution) integration is ready for production deployment. Complete all items before going live.

---

## 1. Bank of Namibia (BON) Registration

### PSP Registration
- [ ] Submit PSP application to Bank of Namibia
- [ ] Provide company registration documents
- [ ] Submit AML/CFT compliance documentation
- [ ] Complete security assessment questionnaire
- [ ] Obtain PSP license approval

### Technical Onboarding
- [ ] Receive IPS participant credentials
- [ ] Obtain organization ID (ORG_ID)
- [ ] Register callback/webhook URLs
- [ ] Complete connectivity testing with IPS sandbox

### Certificates & Keys
- [ ] Generate X.509 certificate signing request (CSR)
- [ ] Submit CSR to BON for signing
- [ ] Receive signed certificate from BON
- [ ] Store private key in secure vault/HSM
- [ ] Configure certificate rotation schedule

---

## 2. Environment Configuration

### Environment Variables

Add these to your production environment:

```bash
# IPS Core Configuration
IPS_ENABLED=true
IPS_ENVIRONMENT=production
IPS_ORG_ID=<your-org-id>
IPS_BASE_URL=https://ips.bon.na/api/v2

# IPS Credentials (store in secrets manager)
IPS_CLIENT_ID=<client-id>
IPS_CLIENT_SECRET=<client-secret>
IPS_CERTIFICATE_PATH=/secrets/ips-cert.pem
IPS_PRIVATE_KEY_PATH=/secrets/ips-key.pem

# IPS VPAs
IPS_COLLECTIONS_VPA=collections@namlend
IPS_DISBURSEMENTS_VPA=disbursements@namlend

# IPS Timeouts & Limits
IPS_REQUEST_TIMEOUT_MS=30000
IPS_STATUS_CHECK_INTERVAL_MS=5000
IPS_MAX_STATUS_CHECKS=12
IPS_MAX_TRANSACTION_AMOUNT=100000

# Webhook Configuration
IPS_WEBHOOK_SECRET=<webhook-secret>
IPS_CALLBACK_URL=https://api.namlend.na/functions/v1/ips-webhook
```

### Supabase Secrets

```bash
# Set secrets in Supabase
supabase secrets set IPS_ENABLED=true
supabase secrets set IPS_ENVIRONMENT=production
supabase secrets set IPS_ORG_ID=<your-org-id>
supabase secrets set IPS_BASE_URL=https://ips.bon.na/api/v2
supabase secrets set IPS_CLIENT_ID=<client-id>
supabase secrets set IPS_CLIENT_SECRET=<client-secret>
supabase secrets set IPS_WEBHOOK_SECRET=<webhook-secret>
```

---

## 3. Database Preparation

### Apply Migration
```bash
# Apply IPS migration to production
supabase db push --linked

# Verify tables exist
supabase db query "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'ips_%';"
```

### Verify Error Codes
```bash
# Check error codes are seeded
supabase db query "SELECT COUNT(*) FROM ips_error_codes;"
# Should return 50+
```

### Index Verification
```bash
# Verify indexes exist
supabase db query "SELECT indexname FROM pg_indexes WHERE tablename LIKE 'ips_%';"
```

### RLS Policy Verification
```bash
# Verify RLS is enabled
supabase db query "SELECT tablename, rowsecurity FROM pg_tables WHERE tablename LIKE 'ips_%';"
```

---

## 4. Edge Function Deployment

### Deploy IPS Adapter
```bash
# Deploy to production
supabase functions deploy ips-adapter --project-ref <project-ref>

# Verify deployment
supabase functions list
```

### Update Webhook Handler
```bash
# Deploy updated payment-webhook (if modified)
supabase functions deploy payment-webhook --project-ref <project-ref>
```

### Function Configuration
```bash
# Set function-specific secrets
supabase secrets set --env-file .env.production
```

---

## 5. Security Checklist

### Authentication & Authorization
- [ ] Verify RLS policies block unauthorized access
- [ ] Test admin-only functions with non-admin users
- [ ] Verify VPA isolation between users
- [ ] Test loan ownership validation

### Data Protection
- [ ] Sensitive data encrypted at rest
- [ ] VPA addresses not logged in full
- [ ] Account numbers masked in responses
- [ ] API logs exclude sensitive fields

### Certificate Security
- [ ] Private keys stored in HSM/vault
- [ ] Certificate expiry monitoring configured
- [ ] Key rotation procedure documented
- [ ] Backup certificates available

### Network Security
- [ ] mTLS configured for IPS communication
- [ ] IP allowlisting configured (if required by BON)
- [ ] WAF rules for webhook endpoint
- [ ] Rate limiting on public endpoints

---

## 6. Monitoring & Alerting

### Metrics to Monitor

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Transaction success rate | < 95% | Critical |
| Average response time | > 5s | Warning |
| Failed transactions/hour | > 10 | Warning |
| Pending transactions > 5min | > 5 | Warning |
| API error rate | > 5% | Critical |
| Certificate expiry | < 30 days | Warning |

### Supabase Dashboard
- [ ] Enable function logs
- [ ] Set up log retention (90 days minimum)
- [ ] Configure error alerting

### External Monitoring
- [ ] Set up uptime monitoring for IPS adapter
- [ ] Configure transaction success rate dashboard
- [ ] Set up PagerDuty/Slack alerts

### Log Queries

```sql
-- Failed transactions in last hour
SELECT COUNT(*) 
FROM ips_transactions 
WHERE status = 'failed' 
AND created_at > NOW() - INTERVAL '1 hour';

-- Pending transactions older than 5 minutes
SELECT * 
FROM ips_transactions 
WHERE status IN ('initiated', 'pending', 'sent')
AND created_at < NOW() - INTERVAL '5 minutes';

-- Transaction success rate (last 24h)
SELECT 
  COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*) as success_rate
FROM ips_transactions
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

## 7. Reconciliation Setup

### Daily Reconciliation Job

```sql
-- Create reconciliation job (pg_cron)
SELECT cron.schedule(
  'ips-daily-reconciliation',
  '0 6 * * *',  -- 6 AM daily
  $$
  SELECT reconcile_ips_transactions();
  $$
);
```

### Reconciliation Queries

```sql
-- Unreconciled transactions
SELECT * FROM ips_transactions
WHERE status = 'success'
AND reconciled_at IS NULL
AND created_at < NOW() - INTERVAL '1 day';

-- Mismatched amounts
SELECT t.*, p.amount as payment_amount
FROM ips_transactions t
JOIN payments p ON t.payment_id = p.id
WHERE t.amount != p.amount;
```

---

## 8. Rollback Plan

### Feature Flag
```sql
-- Disable IPS payments (emergency)
UPDATE system_settings 
SET value = 'false' 
WHERE key = 'ips_enabled';
```

### Rollback Steps

1. **Disable IPS in UI**
   ```sql
   UPDATE system_settings SET value = 'false' WHERE key = 'ips_enabled';
   ```

2. **Disable Edge Function**
   ```bash
   supabase functions delete ips-adapter
   ```

3. **Revert to Previous Payment Methods**
   - Bank transfers remain available
   - Mobile money remains available
   - Cash payments remain available

4. **Notify Users**
   - Send notification about IPS unavailability
   - Provide alternative payment instructions

### Data Preservation
- IPS transactions table preserved
- No data deletion during rollback
- Audit trail maintained

---

## 9. UAT Test Cases

### Customer Payment Flow
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Pay with valid VPA | Payment successful | ☐ |
| Pay with invalid VPA | Error shown, no charge | ☐ |
| Pay amount > balance | Error shown | ☐ |
| Pay with saved VPA | Payment successful | ☐ |
| View payment history | Transactions displayed | ☐ |
| Cancel payment mid-flow | No charge, modal closes | ☐ |

### Admin Disbursement Flow
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Disburse to valid VPA | Disbursement successful | ☐ |
| Disburse to invalid VPA | Error shown | ☐ |
| Disburse amount > approved | Error shown | ☐ |
| View disbursement status | Status displayed | ☐ |
| Retry failed disbursement | Retry successful | ☐ |

### Error Scenarios
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Network timeout | Pending status, retry option | ☐ |
| Insufficient funds | Clear error message | ☐ |
| VPA not found | Clear error message | ☐ |
| System error | Generic error, logged | ☐ |
| Duplicate transaction | Idempotent handling | ☐ |

### Edge Cases
| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Concurrent payments | Both processed correctly | ☐ |
| Payment during maintenance | Queued or rejected | ☐ |
| Large amount (near limit) | Processed or limit error | ☐ |
| Special characters in note | Sanitized, processed | ☐ |

---

## 10. Go-Live Checklist

### Pre-Launch (T-7 days)
- [ ] All UAT test cases passed
- [ ] Security audit completed
- [ ] Performance testing completed
- [ ] Monitoring configured
- [ ] Support team trained
- [ ] Documentation updated

### Launch Day (T-0)
- [ ] Enable IPS in production
- [ ] Monitor first 10 transactions closely
- [ ] Verify logs are captured
- [ ] Check alert thresholds
- [ ] Support team on standby

### Post-Launch (T+1 day)
- [ ] Review all transactions
- [ ] Check reconciliation
- [ ] Review error rates
- [ ] Gather user feedback
- [ ] Document any issues

### Post-Launch (T+7 days)
- [ ] Full reconciliation review
- [ ] Performance metrics review
- [ ] User feedback analysis
- [ ] Optimization opportunities identified
- [ ] Lessons learned documented

---

## 11. Support & Escalation

### Support Contacts

| Role | Contact | Escalation Time |
|------|---------|-----------------|
| L1 Support | support@namlend.na | Immediate |
| L2 Technical | tech@namlend.na | 15 minutes |
| L3 Engineering | engineering@namlend.na | 30 minutes |
| BON IPS Support | ips-support@bon.na | 1 hour |

### Escalation Matrix

| Issue | L1 | L2 | L3 | BON |
|-------|----|----|----|----|
| Payment failed | ✓ | | | |
| Multiple failures | ✓ | ✓ | | |
| System-wide outage | | ✓ | ✓ | ✓ |
| Security incident | | | ✓ | ✓ |
| Reconciliation mismatch | | ✓ | ✓ | |

### Incident Response

1. **Detect** - Monitoring alerts or user reports
2. **Triage** - Assess severity and impact
3. **Contain** - Disable IPS if necessary
4. **Investigate** - Review logs and transactions
5. **Resolve** - Fix issue or escalate
6. **Communicate** - Update stakeholders
7. **Review** - Post-incident analysis

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Technical Lead | | | |
| Security Officer | | | |
| Operations Manager | | | |
| Product Owner | | | |
| Compliance Officer | | | |

---

*Last Updated: December 2025*
*Version: 1.0*
