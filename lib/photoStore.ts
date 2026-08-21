import fs from 'fs';
import path from 'path';

declare global {
  var __wfhPhotoStore: Map<string, string> | undefined;
}

if (!global.__wfhPhotoStore) {
  global.__wfhPhotoStore = new Map<string, string>();
}

export const photoStore = global.__wfhPhotoStore;

export const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'selfies');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.error('Error creating uploads directory:', e);
}

/**
 * Save a selfie base64 image into memory store and disk
 */
export function saveSelfiePhoto(primaryKey: string, photoBase64: string, altKeys: string[] = []): string {
  if (!photoBase64 || typeof photoBase64 !== 'string') return '';

  photoStore.set(primaryKey, photoBase64);
  altKeys.forEach((k) => {
    if (k) photoStore.set(k, photoBase64);
  });

  try {
    const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Save as primary key filename
    const safeKey = primaryKey.replace(/[^a-zA-Z0-9_-]/g, '_');
    const diskPath = path.join(uploadsDir, `${safeKey}.jpg`);
    fs.writeFileSync(diskPath, buffer);

    // Also save for each altKey
    altKeys.forEach((k) => {
      if (k) {
        const safeAltKey = k.replace(/[^a-zA-Z0-9_-]/g, '_');
        const altDiskPath = path.join(uploadsDir, `${safeAltKey}.jpg`);
        try {
          fs.writeFileSync(altDiskPath, buffer);
        } catch {}
      }
    });

    return `/uploads/selfies/${safeKey}.jpg`;
  } catch (err) {
    console.error('Failed to save selfie to disk:', err);
    return photoBase64;
  }
}

/**
 * Retrieve selfie URL or base64 from memory or disk
 */
export function getSelfiePhoto(candidateKeys: (string | null | undefined)[]): string | null {
  for (const key of candidateKeys) {
    if (!key) continue;
    if (photoStore.has(key)) {
      return photoStore.get(key) || null;
    }
  }

  // Check disk
  for (const key of candidateKeys) {
    if (!key) continue;
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const diskFile = path.join(uploadsDir, `${safeKey}.jpg`);
    if (fs.existsSync(diskFile)) {
      return `/uploads/selfies/${safeKey}.jpg`;
    }
  }

  return null;
}
