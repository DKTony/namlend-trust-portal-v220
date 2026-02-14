# IPS (Instant Payment System) Implementation Guide

**Doc Revision**: 2026-01-19  \
**Status**: Mock adapter mode; UI + RPCs are wired; production IPS API pending.

---

## Overview

IPS integration is implemented via:

- `src/services/ipsService.ts` (RPC + Edge calls)
- `supabase/functions/ips-adapter` (mock adapter)
- IPS-related tables and RPCs in migrations

---

## Architecture (Current)

```
Client UI
  -> useIPSRepayment / useIPSDisbursement
  -> ipsService
  -> initiate_ips_* RPCs
  -> ips-adapter Edge Function (mock)
  -> complete_ips_transaction RPC
```

---

## Key Tables

- `ips_transactions`
- `ips_vpa_registry`
- `ips_api_logs`
- `ips_error_codes`
- `ips_alert_thresholds`, `ips_transaction_alerts`

Onboarding tables:

- `ips_onboarding`
- `ips_device_bindings`
- `ips_alias_directory`
- `ips_merchants`
- `ips_vae_entries`
- `ips_keys_cache`
- `ips_sov_providers`
- `ips_onboarding_history`

---

## Key RPC Functions

- `initiate_ips_disbursement`
- `initiate_ips_repayment`
- `complete_ips_transaction`
- `get_ips_transaction_status`
- `get_user_vpas` / `upsert_user_vpa`
- `get_loan_ips_transactions`
- `get_ips_health_metrics`

---

## UI Entry Points

- `IPSPaymentModal` (client payment)
- `IPSHistoryList` (transaction history)
- `IPSTransactionsViewer` (admin view)
- `IPSHealthWidget` (admin monitoring)

---

## Mock vs Production

- Adapter returns mock responses unless real IPS credentials and TLS are configured.
- Webhook ingestion is not implemented for IPS (only provider webhooks for non-IPS).

