# TigerBeetle Production Deployment Guide

**Version**: 1.0.0  
**Date**: December 21, 2025  
**Status**: 📋 Production Planning

---

## Overview

This document outlines the production deployment strategy for TigerBeetle as NamLend Trust's authoritative financial ledger. TigerBeetle will run as a replicated cluster for high availability and data durability.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     NamLend Trust Production                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Netlify   │────▶│  Supabase   │────▶│ Edge Funcs  │       │
│  │  Frontend   │     │  Postgres   │     │  (Workers)  │       │
│  └─────────────┘     └─────────────┘     └──────┬──────┘       │
│                                                  │              │
│                                                  ▼              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               TigerBeetle Cluster (3 nodes)              │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐         │  │
│  │  │  Node 1    │  │  Node 2    │  │  Node 3    │         │  │
│  │  │  Primary   │◀▶│  Replica   │◀▶│  Replica   │         │  │
│  │  │ (Leader)   │  │ (Standby)  │  │ (Standby)  │         │  │
│  │  └────────────┘  └────────────┘  └────────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Infrastructure Requirements

### Minimum Cluster Specification

| Component | Per Node | Total (3 nodes) |
|-----------|----------|-----------------|
| CPU | 4 cores | 12 cores |
| RAM | 16 GB | 48 GB |
| Storage | 500 GB NVMe SSD | 1.5 TB |
| Network | 10 Gbps | 10 Gbps |

### Recommended Production Specification

| Component | Per Node | Total (3 nodes) |
|-----------|----------|-----------------|
| CPU | 8 cores | 24 cores |
| RAM | 32 GB | 96 GB |
| Storage | 1 TB NVMe SSD | 3 TB |
| Network | 25 Gbps | 25 Gbps |

### Cloud Provider Options

| Provider | Instance Type | Monthly Cost (est.) |
|----------|---------------|---------------------|
| AWS | c6i.2xlarge | ~$750/node |
| GCP | n2-standard-8 | ~$700/node |
| Azure | Standard_D8s_v5 | ~$720/node |
| Hetzner | CCX33 | ~$150/node |
| DigitalOcean | m6-4vcpu-32gb | ~$280/node |

## Deployment Steps

### 1. Provision Infrastructure

```bash
# Example: Terraform for AWS
terraform init
terraform apply -var="cluster_size=3" -var="instance_type=c6i.2xlarge"
```

### 2. Install TigerBeetle on Each Node

```bash
# Download TigerBeetle
curl -Lo tigerbeetle.zip https://github.com/tigerbeetle/tigerbeetle/releases/download/0.16.67/tigerbeetle-x86_64-linux.zip
unzip tigerbeetle.zip
chmod +x tigerbeetle

# Move to system path
sudo mv tigerbeetle /usr/local/bin/
```

### 3. Initialize Data Files

```bash
# On each node, create data file
# Node 0 (primary)
tigerbeetle format --cluster=0 --replica=0 --replica-count=3 /data/tb_0.tigerbeetle

# Node 1
tigerbeetle format --cluster=0 --replica=1 --replica-count=3 /data/tb_1.tigerbeetle

# Node 2
tigerbeetle format --cluster=0 --replica=2 --replica-count=3 /data/tb_2.tigerbeetle
```

### 4. Create Systemd Service

```ini
# /etc/systemd/system/tigerbeetle.service
[Unit]
Description=TigerBeetle Financial Ledger
After=network.target

[Service]
Type=simple
User=tigerbeetle
Group=tigerbeetle
ExecStart=/usr/local/bin/tigerbeetle start \
  --addresses=10.0.1.10:3001,10.0.1.11:3001,10.0.1.12:3001 \
  /data/tb_${REPLICA_ID}.tigerbeetle
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

### 5. Configure Firewall

```bash
# Allow TigerBeetle ports between cluster nodes
sudo ufw allow from 10.0.1.0/24 to any port 3001 proto tcp
sudo ufw allow from 10.0.1.0/24 to any port 3002 proto tcp
```

### 6. Start Cluster

```bash
# On each node
sudo systemctl enable tigerbeetle
sudo systemctl start tigerbeetle
```

## Configuration

### Environment Variables

```bash
# Production .env
TIGERBEETLE_CLUSTER_ID=0
TIGERBEETLE_ADDRESSES=10.0.1.10:3001,10.0.1.11:3001,10.0.1.12:3001

# Supabase Edge Function secrets
supabase secrets set TIGERBEETLE_CLUSTER_ID=0
supabase secrets set TIGERBEETLE_ADDRESSES=10.0.1.10:3001,10.0.1.11:3001,10.0.1.12:3001
```

### Update ledgerService.ts

```typescript
const TB_CONFIG = {
  cluster_id: BigInt(process.env.TIGERBEETLE_CLUSTER_ID || '0'),
  replica_addresses: (process.env.TIGERBEETLE_ADDRESSES || '127.0.0.1:3001').split(','),
};
```

## Monitoring

### Health Check Endpoint

Create an Edge Function for health checks:

```typescript
// supabase/functions/tigerbeetle-health/index.ts
import { createClient } from 'tigerbeetle-node';

Deno.serve(async () => {
  try {
    const client = createClient({
      cluster_id: BigInt(Deno.env.get('TIGERBEETLE_CLUSTER_ID') || '0'),
      replica_addresses: (Deno.env.get('TIGERBEETLE_ADDRESSES') || '').split(','),
    });

    // Test lookup
    await client.lookupAccounts([0n]);
    client.destroy();

    return new Response(JSON.stringify({ status: 'healthy' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      status: 'unhealthy', 
      error: error.message 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

### Metrics to Monitor

| Metric | Alert Threshold | Description |
|--------|-----------------|-------------|
| Request Latency | > 100ms | Average operation time |
| Queue Depth | > 1000 | Pending operations |
| Replication Lag | > 1s | Replica sync delay |
| Disk Usage | > 80% | Storage capacity |
| CPU Usage | > 70% | Processing load |
| Memory Usage | > 80% | RAM utilization |

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "TigerBeetle Production",
    "panels": [
      {
        "title": "Operations/sec",
        "type": "graph"
      },
      {
        "title": "Latency P99",
        "type": "gauge"
      },
      {
        "title": "Cluster Health",
        "type": "stat"
      }
    ]
  }
}
```

## Backup & Recovery

### Automated Backups

```bash
#!/bin/bash
# /opt/scripts/tigerbeetle-backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups/tigerbeetle

# Stop writes temporarily (optional for hot backup)
# tigerbeetle-admin pause-writes

# Copy data file
cp /data/tb_*.tigerbeetle $BACKUP_DIR/tb_$DATE.tigerbeetle

# Upload to S3
aws s3 cp $BACKUP_DIR/tb_$DATE.tigerbeetle s3://namlend-backups/tigerbeetle/

# Cleanup old local backups (keep 7 days)
find $BACKUP_DIR -name "*.tigerbeetle" -mtime +7 -delete
```

### Recovery Procedure

1. Stop all TigerBeetle nodes
2. Restore data file from backup
3. Restart cluster in recovery mode
4. Verify data integrity
5. Resume normal operations

## Security

### Network Security

- Run TigerBeetle on private subnet (no public IP)
- Use VPN or private link from Supabase Edge Functions
- Enable TLS for client connections (when supported)
- Implement IP allowlisting

### Access Control

- Dedicated service account for Edge Functions
- Rotate credentials quarterly
- Audit all API access

### Compliance

- [ ] SOC 2 Type II audit
- [ ] PCI DSS compliance (if handling card data)
- [ ] POPIA compliance (Namibian data protection)
- [ ] Bank of Namibia regulatory requirements

## Migration Checklist

### Pre-Migration

- [ ] Provision production infrastructure
- [ ] Configure monitoring and alerting
- [ ] Set up backup procedures
- [ ] Create rollback plan
- [ ] Schedule maintenance window

### Migration Steps

1. [ ] Deploy TigerBeetle cluster
2. [ ] Initialize global accounts (11 accounts)
3. [ ] Migrate existing loan accounts
4. [ ] Enable dual-write mode (Supabase + TigerBeetle)
5. [ ] Verify data consistency
6. [ ] Switch reads to TigerBeetle
7. [ ] Disable Supabase writes
8. [ ] Monitor for 48 hours
9. [ ] Complete migration sign-off

### Post-Migration

- [ ] Update documentation
- [ ] Train operations team
- [ ] Review SLAs
- [ ] Schedule quarterly audits

## Cost Estimate

### Monthly Production Costs

| Item | Cost |
|------|------|
| 3x Cloud VMs (Hetzner CCX33) | $450 |
| Storage (1TB NVMe each) | Included |
| Network Egress | ~$50 |
| Monitoring (Datadog/Grafana) | ~$100 |
| Backups (S3) | ~$50 |
| **Total** | **~$650/month** |

### Scaling Considerations

- TigerBeetle handles 1M+ transactions/second
- Vertical scaling preferred over horizontal
- Add read replicas for geographic distribution

## Support & Maintenance

### TigerBeetle Resources

- Documentation: https://docs.tigerbeetle.com/
- GitHub Issues: https://github.com/tigerbeetle/tigerbeetle/issues
- Discord Community: https://discord.gg/tigerbeetle

### NamLend Internal

- Primary: DevOps Team
- Secondary: Backend Team Lead
- Escalation: CTO

---

## Appendix A: TigerBeetle CLI Commands

```bash
# Check cluster status
tigerbeetle-admin status --addresses=10.0.1.10:3001,10.0.1.11:3001,10.0.1.12:3001

# View account
tigerbeetle-admin lookup-accounts --addresses=... <account_id>

# View transfers
tigerbeetle-admin lookup-transfers --addresses=... <transfer_id>
```

## Appendix B: Rollback Procedure

In case of critical issues:

1. Switch balance reads back to Supabase (`loan_balance_summary`)
2. Disable outbox worker cron job
3. Queue all new transactions to Supabase only
4. Investigate TigerBeetle issues
5. Once resolved, replay missed transactions from Supabase
