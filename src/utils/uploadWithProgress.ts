// XMLHttpRequest-based file upload with real progress events.
// fetch() cannot report upload progress, so KYC (and any future upload UI)
// uses this instead when a percentage indicator is needed.

export interface UploadResult {
  storageId: string;
}

export function uploadFileWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResult);
        } catch {
          reject(new Error('Upload succeeded but the response could not be parsed'));
        }
      } else {
        reject(new Error(`File upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('File upload failed: network error'));
    xhr.onabort = () => reject(new Error('File upload was cancelled'));

    xhr.send(file);
  });
}
