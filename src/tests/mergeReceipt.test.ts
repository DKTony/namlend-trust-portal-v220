// @vitest-environment node

import { describe, expect, it } from 'vitest';
// The release scripts are native ESM JavaScript and intentionally live outside
// the frontend TypeScript project.
// @ts-expect-error No TypeScript declaration is emitted for the script module.
import { schemaValidator } from '../../scripts/agent-harness/lib.mjs';

const HEAD_SHA = 'a'.repeat(40);

describe('merge receipt schema', () => {
  it('compiles under Ajv strict mode and accepts a solo-operator receipt', () => {
    const validate = schemaValidator('merge-receipt.schema.json');
    expect(
      validate({
        schemaVersion: '1.0.0',
        receiptId: `merge:${HEAD_SHA}`,
        pullRequest: 'https://github.com/DKTony/namlend-trust-portal-v220/pull/32',
        mergeSha: HEAD_SHA,
        mergedAt: '2026-08-14T13:36:24.000Z',
        approvers: ['DKTony'],
        ciEvidence: [
          {
            workflow: 'CI - Web',
            job: 'ontology',
            runId: 31805502130,
            headSha: HEAD_SHA,
            conclusion: 'success',
            testIdentities: [],
          },
        ],
        artifactDigest: `sha256:${'b'.repeat(64)}`,
        supersedes: [],
        invalidates: [],
      })
    ).toMatchObject({ approvers: ['DKTony'] });
  });
});
