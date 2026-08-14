// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
// The release scripts are native ESM JavaScript and intentionally live outside
// the frontend TypeScript project.
// @ts-expect-error No TypeScript declaration is emitted for the script module.
import * as riskReview from '../../scripts/agent-harness/risk-review.mjs';

const {
  currentApprovers,
  githubPages,
  humanOperatorLogin,
  mergeReceiptApprovers,
  requiredApprovals,
  validateRiskReviewInputs,
} = riskReview;

const HEAD_SHA = 'a'.repeat(40);

function review(overrides: Record<string, unknown> = {}) {
  return {
    user: { login: 'reviewer', type: 'User' },
    state: 'APPROVED',
    commit_id: HEAD_SHA,
    submitted_at: '2026-08-13T08:00:00Z',
    author_association: 'COLLABORATOR',
    ...overrides,
  };
}

describe('risk-review policy inputs and provenance', () => {
  it('accepts a constrained repository, pull number, SHA, and author', () => {
    expect(
      validateRiskReviewInputs({
        repository: 'DKTony/namlend-trust-portal-v220',
        pullNumber: '10',
        headSha: HEAD_SHA,
        author: 'DKTony',
      })
    ).toEqual({
      repository: 'DKTony/namlend-trust-portal-v220',
      pullNumber: '10',
      headSha: HEAD_SHA,
      author: 'DKTony',
    });
  });

  it.each([
    ['repository', { repository: '../repo' }],
    ['repository path', { repository: 'owner/repo/extra' }],
    ['pull number', { pullNumber: '0' }],
    ['unsafe pull number', { pullNumber: '99999999999999999999' }],
    ['SHA', { headSha: 'not-a-sha' }],
    ['author', { author: '-invalid' }],
  ])('rejects an invalid %s', (_label, override) => {
    expect(() =>
      validateRiskReviewInputs({
        repository: 'owner/repo',
        pullNumber: '10',
        headSha: HEAD_SHA,
        author: 'author',
        ...override,
      })
    ).toThrow(/Invalid/);
  });

  it('treats solo-operator policy as zero required approvals for protected files', () => {
    const classification = requiredApprovals(['agent-harness/policy.json', 'docs/README.md'], {
      minimumHumanApprovals: 0,
      protectedMinimumHumanApprovals: 0,
      protectedPatterns: ['agent-harness/**'],
    });

    expect(classification).toMatchObject({
      riskClass: 'PROTECTED',
      required: 0,
      protectedFiles: ['agent-harness/policy.json'],
    });
  });

  it('records the human merger as the solo-operator merge-receipt approver', () => {
    expect(
      mergeReceiptApprovers({
        required: 0,
        reviewApprovers: [],
        mergedBy: { login: 'DKTony', type: 'User' },
      })
    ).toEqual(['DKTony']);
  });

  it('rejects a bot merger when solo-operator policy requires a human operator', () => {
    expect(() =>
      mergeReceiptApprovers({
        required: 0,
        reviewApprovers: [],
        mergedBy: { login: 'cursor[bot]', type: 'Bot' },
      })
    ).toThrow(/human collaborator merger/);
    expect(humanOperatorLogin({ login: 'cursor[bot]', type: 'Bot' })).toBeNull();
  });

  it('still requires current-head non-author reviews when policy asks for them', () => {
    expect(
      mergeReceiptApprovers({
        required: 1,
        reviewApprovers: ['reviewer'],
        mergedBy: { login: 'DKTony', type: 'User' },
      })
    ).toEqual(['reviewer']);
    expect(() =>
      mergeReceiptApprovers({
        required: 1,
        reviewApprovers: [],
        mergedBy: { login: 'DKTony', type: 'User' },
      })
    ).toThrow(/exact PR head/);
  });

  it('counts only current-head non-author human collaborator approvals', () => {
    const reviews = [
      review(),
      review({ user: { login: 'author', type: 'User' } }),
      review({ user: { login: 'outside-user', type: 'User' }, author_association: 'NONE' }),
      review({ user: { login: 'automation[bot]', type: 'Bot' } }),
      review({ user: { login: 'stale', type: 'User' }, commit_id: 'b'.repeat(40) }),
    ];

    expect(currentApprovers(reviews, HEAD_SHA, 'author')).toEqual(['reviewer']);
  });

  it('uses each reviewer latest decisive review and removes superseded approvals', () => {
    const reviews = [
      review(),
      review({ state: 'CHANGES_REQUESTED', submitted_at: '2026-08-13T09:00:00Z' }),
    ];

    expect(currentApprovers(reviews, HEAD_SHA, 'author')).toEqual([]);
  });

  it('rejects an outbound non-GitHub or non-repository path before fetch', async () => {
    const fetchImplementation = vi.fn();

    await expect(
      githubPages('//evil.example/repos/owner/repo/pulls/10/files', 'token', fetchImplementation)
    ).rejects.toThrow(/invalid GitHub API path/);
    await expect(githubPages('/users/octocat', 'token', fetchImplementation)).rejects.toThrow(
      /repository path/
    );
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it('paginates only the fixed GitHub API origin and validates list responses', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({ index }));
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => firstPage })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ index: 100 }] });

    const result = await githubPages(
      '/repos/owner/repo/pulls/10/files',
      'token',
      fetchImplementation
    );

    expect(result).toHaveLength(101);
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    for (const [url] of fetchImplementation.mock.calls) {
      expect(url).toBeInstanceOf(URL);
      expect(url.origin).toBe('https://api.github.com');
      expect(url.pathname).toBe('/repos/owner/repo/pulls/10/files');
    }
    expect(fetchImplementation.mock.calls[0][0].searchParams.get('page')).toBe('1');
    expect(fetchImplementation.mock.calls[1][0].searchParams.get('page')).toBe('2');

    await expect(
      githubPages('/repos/owner/repo/pulls/10/files', 'token', async () => ({
        ok: true,
        json: async () => ({ message: 'not a list' }),
      }))
    ).rejects.toThrow(/non-list response/);
  });
});
