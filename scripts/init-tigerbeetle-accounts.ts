#!/usr/bin/env npx ts-node
/**
 * Initialize TigerBeetle Global Accounts
 * 
 * Creates the system-wide accounts needed for NamLend operations:
 * - Disbursement Clearing
 * - Collections Clearing
 * - Bank Settlement
 * - IPS Pending In/Out
 * - Income accounts (Interest, Fees)
 * 
 * Run with: npx ts-node scripts/init-tigerbeetle-accounts.ts
 */

import { createClient } from 'tigerbeetle-node';

// TigerBeetle configuration
const TB_CONFIG = {
  cluster_id: 0n,
  replica_addresses: ['127.0.0.1:3001'],
};

// NAD Ledger ID
const NAD_LEDGER = 1;

// Account codes from Chart of Accounts
const ACCOUNTS = [
  // Operational Clearing Accounts
  { name: 'DISBURSEMENT_CLEARING', code: 2001, id: 0x4e414d4c454e445f444953425f434c52n },
  { name: 'COLLECTIONS_CLEARING', code: 2002, id: 0x4e414d4c454e445f434f4c4c5f434c52n },
  { name: 'BANK_SETTLEMENT', code: 2003, id: 0x4e414d4c454e445f42414e4b5f534554n },
  { name: 'SUSPENSE', code: 2004, id: 0x4e414d4c454e445f53555350454e5345n },
  
  // IPS Accounts
  { name: 'IPS_PENDING_INBOUND', code: 3001, id: 0x4e414d4c454e445f4950535f494e4244n },
  { name: 'IPS_PENDING_OUTBOUND', code: 3002, id: 0x4e414d4c454e445f4950535f4f555442n },
  { name: 'IPS_OPERATOR_FEE', code: 3003, id: 0x4e414d4c454e445f4950535f4f504652n },
  
  // Income Accounts
  { name: 'INTEREST_INCOME', code: 5001, id: 0x4e414d4c454e445f494e545f494e434dn },
  { name: 'FEE_INCOME', code: 5002, id: 0x4e414d4c454e445f4645455f494e434dn },
  { name: 'LATE_FEE_INCOME', code: 5003, id: 0x4e414d4c454e445f4c4154455f494e43n },
  
  // Expense Accounts
  { name: 'WRITE_OFF_EXPENSE', code: 6001, id: 0x4e414d4c454e445f575249544f464645n },
];

async function main() {
  console.log('🐯 Initializing TigerBeetle Global Accounts');
  console.log(`   Cluster: ${TB_CONFIG.cluster_id}`);
  console.log(`   Address: ${TB_CONFIG.replica_addresses[0]}`);
  console.log('');

  let client: ReturnType<typeof createClient> | null = null;

  try {
    // Connect to TigerBeetle
    client = createClient({
      cluster_id: TB_CONFIG.cluster_id,
      replica_addresses: TB_CONFIG.replica_addresses,
    });
    console.log('✅ Connected to TigerBeetle\n');

    // Create each global account
    const accountsToCreate = ACCOUNTS.map(acc => ({
      id: acc.id,
      debits_pending: 0n,
      debits_posted: 0n,
      credits_pending: 0n,
      credits_posted: 0n,
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      reserved: 0,
      ledger: NAD_LEDGER,
      code: acc.code,
      flags: 0,
      timestamp: 0n,
    }));

    console.log(`Creating ${accountsToCreate.length} accounts...`);
    
    const errors = await client.createAccounts(accountsToCreate);

    // Process results
    let created = 0;
    let existing = 0;
    let failed = 0;

    for (let i = 0; i < ACCOUNTS.length; i++) {
      const acc = ACCOUNTS[i];
      const error = errors.find(e => e.index === i);
      
      if (!error) {
        console.log(`   ✅ ${acc.name} (code: ${acc.code}) - Created`);
        created++;
      } else if (error.result === 1) {
        // exists_with_different_flags or exists - account already exists
        console.log(`   ⏭️  ${acc.name} (code: ${acc.code}) - Already exists`);
        existing++;
      } else {
        console.log(`   ❌ ${acc.name} (code: ${acc.code}) - Error: ${error.result}`);
        failed++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   Created: ${created}`);
    console.log(`   Existing: ${existing}`);
    console.log(`   Failed: ${failed}`);

    // Verify by looking up accounts
    console.log('\n🔍 Verifying accounts...');
    const lookupIds = ACCOUNTS.map(a => a.id);
    const accounts = await client.lookupAccounts(lookupIds);
    
    console.log(`   Found ${accounts.length}/${ACCOUNTS.length} accounts in TigerBeetle`);

    if (accounts.length === ACCOUNTS.length) {
      console.log('\n✅ TigerBeetle global accounts initialized successfully!');
    } else {
      console.log('\n⚠️  Some accounts may need manual verification');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    if (client) {
      client.destroy();
    }
  }
}

main();
