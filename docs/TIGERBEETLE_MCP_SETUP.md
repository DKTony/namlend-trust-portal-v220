# TigerBeetle MCP Server Setup Guide

**Doc Revision**: 2026-01-19  
**Status**: Optional dev tooling; not required for runtime integration.

This guide explains how to install and configure the TigerBeetle MCP server for NamLend Trust integration.

## Prerequisites

- **Java 17+** - Required for the MCP server
- **Maven 3.8.1+** - For building the server
- **TigerBeetle** - The database server itself
- **Windsurf IDE** - With MCP support

## Step 1: Install TigerBeetle

### macOS (Homebrew)

```bash
brew install tigerbeetle
```

### Linux (Download)

```bash
curl -LO https://github.com/tigerbeetle/tigerbeetle/releases/latest/download/tigerbeetle-x86_64-linux.zip
unzip tigerbeetle-x86_64-linux.zip
sudo mv tigerbeetle /usr/local/bin/
```

### Verify Installation

```bash
tigerbeetle version
```

## Step 2: Create TigerBeetle Data File

```bash
# Create data directory
mkdir -p ~/tigerbeetle-data

# Format the data file (cluster 0, replica 0)
tigerbeetle format --cluster=0 --replica=0 --replica-count=1 ~/tigerbeetle-data/0_0.tigerbeetle
```

## Step 3: Start TigerBeetle Server

```bash
# Start the server (default port 3001)
tigerbeetle start --addresses=127.0.0.1:3001 ~/tigerbeetle-data/0_0.tigerbeetle
```

For production, create a systemd service or launchd plist.

## Step 4: Clone and Build MCP Server

```bash
# Clone the MCP TigerBeetle server
git clone https://github.com/jantoniucci/mcp-tiggerbeetle.git
cd mcp-tiggerbeetle

# Build with Maven
mvn clean package

# The JAR will be at: target/mcp-tiggerbeetle-0.0.1-SNAPSHOT.jar
```

## Step 5: Configure Windsurf MCP

Add to your `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "mcp-tigerbeetle": {
      "command": "/usr/bin/java",
      "args": [
        "-Dspring.ai.mcp.server.stdio=true",
        "-DTB_ADDRESS=127.0.0.1:3001",
        "-jar",
        "/path/to/mcp-tiggerbeetle/target/mcp-tiggerbeetle-0.0.1-SNAPSHOT.jar"
      ],
      "env": {
        "TB_ADDRESS": "127.0.0.1:3001"
      }
    }
  }
}
```

**Note:** Replace `/path/to/mcp-tiggerbeetle` with your actual path.

## Step 6: Verify Integration

Restart Windsurf and verify the MCP server is connected. You should see `mcp-tigerbeetle` in your available MCP servers.

## NamLend Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NamLend Trust App                        │
├─────────────────────────────────────────────────────────────┤
│  disbursementService.ts  │  paymentService.ts               │
│           │                       │                         │
│           └───────────┬───────────┘                         │
│                       │                                     │
│              ledgerService.ts                               │
│                       │                                     │
│           ┌───────────┴───────────┐                         │
│           │                       │                         │
│           ▼                       ▼                         │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │    Supabase     │    │  TigerBeetle    │                │
│  │   (Outbox)      │────│   (Ledger)      │                │
│  │                 │    │                 │                │
│  │ tigerbeetle_    │    │ Accounts &      │                │
│  │ outbox table    │    │ Transfers       │                │
│  └─────────────────┘    └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

## Database Tables Created

The following tables were created in Supabase for the integration:

| Table                        | Purpose                                         |
| ---------------------------- | ----------------------------------------------- |
| `tigerbeetle_accounts`       | Maps NamLend entities to TB 128-bit account IDs |
| `tigerbeetle_outbox`         | Transactional outbox for reliable posting       |
| `tigerbeetle_transfers`      | Shadow ledger for reconciliation                |
| `tigerbeetle_reconciliation` | Tracks reconciliation runs                      |

## Outbox Worker (Future)

For production, implement an outbox worker that:

1. Polls `tigerbeetle_outbox` for pending entries
2. Posts transfers to TigerBeetle via the MCP server
3. Records results in `tigerbeetle_transfers`
4. Updates outbox status to `completed` or `failed`

Example Edge Function (Supabase):

```typescript
// supabase/functions/tigerbeetle-outbox-worker/index.ts
import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get pending outbox entries
  const { data: entries } = await supabase
    .from('tigerbeetle_outbox')
    .select('*')
    .eq('status', 'pending')
    .lt('retry_count', 5)
    .order('created_at')
    .limit(100);

  for (const entry of entries || []) {
    try {
      // Process via TigerBeetle client
      // ... TigerBeetle posting logic ...

      await supabase
        .from('tigerbeetle_outbox')
        .update({ status: 'completed', processed_at: new Date().toISOString() })
        .eq('id', entry.id);
    } catch (error) {
      await supabase
        .from('tigerbeetle_outbox')
        .update({
          status: 'failed',
          retry_count: entry.retry_count + 1,
          last_error: error.message,
        })
        .eq('id', entry.id);
    }
  }

  return new Response(JSON.stringify({ processed: entries?.length || 0 }));
});
```

## Reconciliation

Run periodic reconciliation to verify Supabase and TigerBeetle are in sync:

```typescript
import { runReconciliation } from '@/services/ledgerService';

// Full reconciliation
const result = await runReconciliation();

// Loan-specific reconciliation
const loanResult = await runReconciliation('loan-uuid-here');
```

## Troubleshooting

### MCP Server Not Connecting

1. Verify Java 17+ is installed: `java -version`
2. Check TigerBeetle is running: `curl http://127.0.0.1:3001`
3. Verify JAR path in config

### TigerBeetle Connection Refused

1. Ensure TigerBeetle server is running
2. Check port 3001 is not blocked
3. Verify data file exists

### Outbox Entries Stuck

1. Check `tigerbeetle_outbox` for `failed` status
2. Review `last_error` column for details
3. Manually retry or move to dead letter

## References

- [TigerBeetle Documentation](https://docs.tigerbeetle.com/)
- [MCP TigerBeetle Server](https://github.com/jantoniucci/mcp-tiggerbeetle)
- [NamLend TigerBeetle Implementation Plan](./TIGERBEETLE_IMPLEMENTATION.md)
