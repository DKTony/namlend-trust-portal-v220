import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadFileWithProgress } from './uploadWithProgress';

class FakeXHR {
  static instances: FakeXHR[] = [];
  upload: { onprogress: ((e: ProgressEvent) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  status = 0;
  responseText = '';
  open = vi.fn();
  setRequestHeader = vi.fn();
  send = vi.fn();

  constructor() {
    FakeXHR.instances.push(this);
  }
}

const file = new File(['hello'], 'id.pdf', { type: 'application/pdf' });

describe('uploadFileWithProgress', () => {
  beforeEach(() => {
    FakeXHR.instances = [];
    vi.stubGlobal('XMLHttpRequest', FakeXHR as unknown as typeof XMLHttpRequest);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports progress and resolves with the parsed response on 2xx', async () => {
    const onProgress = vi.fn();
    const promise = uploadFileWithProgress('https://storage/upload', file, onProgress);
    const xhr = FakeXHR.instances[0];

    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 200 } as ProgressEvent);
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 200, total: 200 } as ProgressEvent);
    xhr.status = 200;
    xhr.responseText = JSON.stringify({ storageId: 'st_123' });
    xhr.onload?.();

    await expect(promise).resolves.toEqual({ storageId: 'st_123' });
    expect(onProgress).toHaveBeenNthCalledWith(1, 25);
    expect(onProgress).toHaveBeenNthCalledWith(2, 100);
    expect(xhr.open).toHaveBeenCalledWith('POST', 'https://storage/upload');
    expect(xhr.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(xhr.send).toHaveBeenCalledWith(file);
  });

  it('rejects on HTTP error status', async () => {
    const promise = uploadFileWithProgress('https://storage/upload', file, vi.fn());
    const xhr = FakeXHR.instances[0];
    xhr.status = 403;
    xhr.onload?.();
    await expect(promise).rejects.toThrow('status 403');
  });

  it('rejects on network error', async () => {
    const promise = uploadFileWithProgress('https://storage/upload', file, vi.fn());
    FakeXHR.instances[0].onerror?.();
    await expect(promise).rejects.toThrow('network error');
  });

  it('rejects on unparseable success response', async () => {
    const promise = uploadFileWithProgress('https://storage/upload', file, vi.fn());
    const xhr = FakeXHR.instances[0];
    xhr.status = 200;
    xhr.responseText = 'not-json';
    xhr.onload?.();
    await expect(promise).rejects.toThrow('could not be parsed');
  });

  it('ignores progress events without computable length', async () => {
    const onProgress = vi.fn();
    const promise = uploadFileWithProgress('https://storage/upload', file, onProgress);
    const xhr = FakeXHR.instances[0];
    xhr.upload.onprogress?.({ lengthComputable: false, loaded: 10, total: 0 } as ProgressEvent);
    xhr.status = 200;
    xhr.responseText = '{"storageId":"x"}';
    xhr.onload?.();
    await promise;
    expect(onProgress).not.toHaveBeenCalled();
  });
});
