import RNFS from 'react-native-fs';
import {AppError, ensureOnline} from './api';
import {GRAPH_API, RUPLOAD_API} from './config';
import type {Reel} from './storage';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function graph(path: string, method: 'GET' | 'POST', params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(
    method === 'GET' ? `${GRAPH_API}/${path}?${query}` : `${GRAPH_API}/${path}`,
    method === 'POST'
      ? {
          method,
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          body: query,
        }
      : undefined,
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    throw new AppError(`Instagram: ${json.error?.message ?? res.status}`);
  }
  return json;
}

// Raw binary upload (multipart would be rejected), so use XHR with a file body.
function uploadFile(url: string, path: string, size: number, token: string) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Authorization', `OAuth ${token}`);
    xhr.setRequestHeader('offset', '0');
    xhr.setRequestHeader('file_size', String(size));
    xhr.onload = () =>
      xhr.status === 200
        ? resolve()
        : reject(new AppError(`Instagram upload failed (${xhr.status}): ${xhr.responseText}`));
    xhr.onerror = () => reject(new AppError('Instagram upload failed (network).'));
    xhr.send({uri: `file://${path}`} as any);
  });
}

export async function postReel(reel: Reel, s: {userId: string; token: string}, onStep: (t: string) => void) {
  if (!s.userId || !s.token) {
    throw new AppError('Enter your Instagram user id and access token first.');
  }
  await ensureOnline();

  onStep('Instagram: creating post');
  const container = await graph(`${s.userId}/media`, 'POST', {
    media_type: 'REELS',
    upload_type: 'resumable',
    caption: reel.caption,
    ...(reel.thumbMs !== undefined ? {thumb_offset: String(reel.thumbMs)} : {}),
    access_token: s.token,
  });

  onStep('Instagram: uploading video');
  const size = Number((await RNFS.stat(reel.path)).size);
  await uploadFile(
    container.uri ?? `${RUPLOAD_API}/${container.id}`,
    reel.path,
    size,
    s.token,
  );

  onStep('Instagram: processing');
  for (let i = 0; i < 40; i++) {
    const st = await graph(container.id, 'GET', {
      fields: 'status_code',
      access_token: s.token,
    });
    if (st.status_code === 'FINISHED') {
      break;
    }
    if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') {
      throw new AppError('Instagram could not process the video.');
    }
    if (i === 39) {
      throw new AppError('Instagram is still processing. Try again in a few minutes.');
    }
    await sleep(8000);
  }

  onStep('Instagram: publishing');
  await graph(`${s.userId}/media_publish`, 'POST', {
    creation_id: container.id,
    access_token: s.token,
  });
}
