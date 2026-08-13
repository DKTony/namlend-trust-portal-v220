// @vitest-environment node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// The release scripts are native ESM JavaScript and intentionally live outside
// the frontend TypeScript project.
// @ts-expect-error No TypeScript declaration is emitted for the script module.
import { readRegularFileWithinRoot } from '../../scripts/safe-files.mjs';

describe.skipIf(typeof fs.constants.O_NOFOLLOW !== 'number')(
  'descriptor-safe repository reads',
  () => {
    let root: string;
    let outside: string;

    beforeEach(() => {
      root = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-files-root-'));
      outside = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-files-outside-'));
    });

    afterEach(() => {
      vi.restoreAllMocks();
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(outside, { recursive: true, force: true });
    });

    it('reads a regular file through the opened descriptor', () => {
      fs.writeFileSync(path.join(root, 'source.txt'), 'verified contents');

      expect(readRegularFileWithinRoot(root, 'source.txt', { encoding: 'utf8' })).toBe(
        'verified contents'
      );
      expect(readRegularFileWithinRoot(root, 'source.txt')).toEqual(
        Buffer.from('verified contents')
      );
    });

    it('returns undefined for a missing or oversized file', () => {
      fs.writeFileSync(path.join(root, 'large.txt'), '12345');

      expect(readRegularFileWithinRoot(root, 'missing.txt')).toBeUndefined();
      expect(readRegularFileWithinRoot(root, 'large.txt', { maxBytes: 4 })).toBeUndefined();
    });

    it('does not follow a final symlink', () => {
      fs.writeFileSync(path.join(root, 'target.txt'), 'secret');
      fs.symlinkSync('target.txt', path.join(root, 'link.txt'));

      expect(readRegularFileWithinRoot(root, 'link.txt')).toBeUndefined();
    });

    it('rejects an escape through a symlinked parent directory', () => {
      fs.writeFileSync(path.join(outside, 'secret.txt'), 'outside');
      fs.symlinkSync(outside, path.join(root, 'linked-parent'));

      expect(() => readRegularFileWithinRoot(root, 'linked-parent/secret.txt')).toThrow(
        /outside the repository root/
      );
    });

    it('rejects lexical traversal outside the root', () => {
      expect(() => readRegularFileWithinRoot(root, '../outside.txt')).toThrow(
        /Refusing to read outside the repository root/
      );
    });

    it('closes the descriptor when an early metadata return occurs', () => {
      fs.mkdirSync(path.join(root, 'directory'));
      const close = vi.spyOn(fs, 'closeSync');

      expect(readRegularFileWithinRoot(root, 'directory')).toBeUndefined();
      expect(close).toHaveBeenCalledTimes(1);
      expect(close).toHaveBeenCalledWith(expect.any(Number));
    });

    it('closes the descriptor when the descriptor read fails', () => {
      fs.writeFileSync(path.join(root, 'source.txt'), 'verified contents');
      const close = vi.spyOn(fs, 'closeSync');
      vi.spyOn(fs, 'readFileSync').mockImplementationOnce(() => {
        throw new Error('forced descriptor read failure');
      });

      expect(() => readRegularFileWithinRoot(root, 'source.txt')).toThrow(
        /forced descriptor read failure/
      );
      expect(close).toHaveBeenCalledTimes(1);
    });
  }
);
