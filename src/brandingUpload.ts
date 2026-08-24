/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Avatar / banner upload through the same R2 presign path used by video
 * uploads, including best-effort deletion of the replaced asset.
 */
import { supabase as _supabase } from '@/integrations/supabase/loose';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

function functionsBase(): string {
  const url = import.meta.env['VITE_SUPABASE_URL'];
  if (!url) throw new Error('Supabase URL is not configured.');
  return `${url}/functions/v1`;
}

/** Derives the R2 object key from a public asset URL, when possible. */
export function keyFromPublicUrl(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null;
  try {
    const { pathname } = new URL(publicUrl);
    const key = pathname.replace(/^\/+/, '');
    return key || null;
  } catch {
    return null;
  }
}

export async function uploadBrandingAsset(
  blob: Blob,
  kind: 'avatar' | 'banner',
  previousUrl?: string | null,
): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('Please sign in to upload.');

  const fileName = `${kind}-${Date.now()}.jpg`;
  const res = await fetch(`${functionsBase()}/r2-presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      fileName,
      fileType: 'image/jpeg',
      fileSize: blob.size,
      folder: kind === 'avatar' ? 'avatars' : 'banners',
    }),
  });
  const data = await res.json();
  if (!res.ok || !data?.presignedUrl) {
    throw new Error(data?.error || 'Could not get an upload URL.');
  }

  const putRes = await fetch(data.presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blob,
  });
  if (!putRes.ok) throw new Error(`Upload failed (${putRes.status}).`);

  // Best-effort cleanup of the asset being replaced.
  const oldKey = keyFromPublicUrl(previousUrl);
  if (oldKey && oldKey !== keyFromPublicUrl(data.publicUrl)) {
    try {
      await fetch(`${functionsBase()}/delete-from-r2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileKey: oldKey }),
      });
    } catch {
      // Non-fatal: the new asset is already live.
    }
  }

  return data.publicUrl as string;
}
