import fs from 'node:fs';
import path from 'node:path';

const EXPECTED_READ_ERRORS = new Set(['EACCES', 'EISDIR', 'ELOOP', 'ENOENT', 'ENOTDIR']);

function isWithinRoot(candidate, root) {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function verifyOpenedPath(absolute, realRoot, file, openedStat) {
  // Node does not expose macOS F_GETPATH, and /dev/fd does not resolve to the
  // underlying pathname there. Resolve after opening, then prove that path is
  // still the exact device/inode already held by our no-follow descriptor.
  const resolvedPath = fs.realpathSync.native(absolute);
  if (!isWithinRoot(resolvedPath, realRoot)) {
    throw new Error(`Opened file resolved outside the repository root: ${file}`);
  }
  const resolvedStat = fs.statSync(resolvedPath);
  if (resolvedStat.dev !== openedStat.dev || resolvedStat.ino !== openedStat.ino) {
    throw new Error(`File path changed while it was being opened: ${file}`);
  }
}

/**
 * Read a regular file beneath `root` without following a final symlink and without
 * separating the metadata check from the read. The descriptor path check also
 * prevents an allowlisted path from escaping through a symlinked parent directory.
 */
export function readRegularFileWithinRoot(root, file, options = {}) {
  const realRoot = fs.realpathSync.native(root);
  const absolute = path.resolve(realRoot, file);
  if (!isWithinRoot(absolute, realRoot)) {
    throw new Error(`Refusing to read outside the repository root: ${file}`);
  }

  if (typeof fs.constants.O_NOFOLLOW !== 'number') {
    throw new Error('This platform does not support no-follow file opens.');
  }

  let fd;
  try {
    fd = fs.openSync(absolute, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const stat = fs.fstatSync(fd);
    if (!stat.isFile()) return undefined;
    if (options.maxBytes !== undefined && stat.size > options.maxBytes) return undefined;

    verifyOpenedPath(absolute, realRoot, file, stat);

    const contents = fs.readFileSync(fd);
    return options.encoding ? contents.toString(options.encoding) : contents;
  } catch (error) {
    if (EXPECTED_READ_ERRORS.has(error?.code)) return undefined;
    throw error;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}
