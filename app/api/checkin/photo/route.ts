import { NextResponse } from 'next/server';
import { callGAS } from '@/lib/gas';
import { photoStore, saveSelfiePhoto, uploadsDir } from '@/lib/photoStore';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uuid = searchParams.get('uuid');
    const type = searchParams.get('type') || searchParams.get('logType') || 'checkin';

    if (!uuid) {
      return NextResponse.json({ error: 'Missing uuid parameter' }, { status: 400 });
    }

    // 1. Check in-memory store
    if (photoStore.has(uuid)) {
      const cached = photoStore.get(uuid)!;
      const base64Data = cached.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      return new Response(buffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      });
    }

    // 2. Check local disk cache
    const safeKey = uuid.replace(/[^a-zA-Z0-9_-]/g, '_');
    const diskFile = path.join(uploadsDir, `${safeKey}.jpg`);
    if (fs.existsSync(diskFile)) {
      const buffer = fs.readFileSync(diskFile);
      // Populate memory cache
      try {
        photoStore.set(uuid, `data:image/jpeg;base64,${buffer.toString('base64')}`);
      } catch {}
      return new Response(buffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      });
    }

    // 3. Fetch from Google Drive via GAS adminGetLogPhoto
    const gasLogType = type.includes('สุ่มตรวจ') || type === 'spotcheck' ? 'spotcheck' : 'checkin';
    let gasRes = await callGAS('adminGetLogPhoto', {
      logType: gasLogType,
      uuid: uuid,
      adminPin: '9999',
    });

    if (!gasRes?.photo && gasLogType === 'checkin') {
      // Fallback try spotcheck logType
      try {
        gasRes = await callGAS('adminGetLogPhoto', {
          logType: 'spotcheck',
          uuid: uuid,
          adminPin: '9999',
        });
      } catch {}
    }

    if (gasRes?.photo && typeof gasRes.photo === 'string') {
      const base64Data = gasRes.photo.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Cache in memory and disk for rapid subsequent loads
      try {
        saveSelfiePhoto(uuid, gasRes.photo, [safeKey]);
      } catch {}

      return new Response(buffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      });
    }

    return NextResponse.json({ error: 'Photo not found in Google Drive' }, { status: 404 });
  } catch (error: any) {
    console.error('Error fetching photo from Google Drive:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
