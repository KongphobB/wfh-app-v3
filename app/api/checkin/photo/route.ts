import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callGAS, getLiveEmployeesMap } from '@/lib/gas';
import { photoStore, saveSelfiePhoto, uploadsDir, getPhotoOwner, associatePhotoOwner } from '@/lib/photoStore';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const missingPhotoCache = new Map<string, number>();

/**
 * Validates whether the logged-in user is authorized to view a check-in or spot-check photo.
 * - Admin: Full access to all photos.
 * - Supervisor: Allowed to view own photos and photos of subordinates.
 * - Employee: Allowed ONLY to view their own photos.
 */
export async function isAuthorizedToViewPhoto(
  uuid: string,
  session: { role?: string; employee_id?: string }
): Promise<boolean> {
  // 1. Admin always has full access
  if (session.role === 'admin') {
    return true;
  }

  const currentEmpId = String(session.employee_id || '');
  if (!currentEmpId) return false;

  // 2. Direct match or known owner from memory store
  const knownOwner = getPhotoOwner(uuid);
  if (knownOwner && knownOwner === currentEmpId) {
    return true;
  }

  // 3. Direct pattern matching on composite keys
  if (uuid === currentEmpId) {
    return true;
  }

  if (uuid.startsWith('spot_')) {
    const parts = uuid.split('_');
    if (parts[1] && parts[1] === currentEmpId) {
      return true;
    }
  }

  if (uuid.startsWith('SPOT-MANUAL-')) {
    const parts = uuid.split('-');
    const embeddedEmpId = parts.slice(3).join('-');
    if (uuid.endsWith(`-${currentEmpId}`) || (embeddedEmpId && embeddedEmpId === currentEmpId)) {
      return true;
    }
  }

  if (uuid.includes('_')) {
    const prefix = uuid.split('_')[0];
    if (prefix === currentEmpId) {
      return true;
    }
  }

  // 4. Supervisor subordinate checks
  let subordinateIds: Set<string> | null = null;
  if (session.role === 'supervisor') {
    try {
      const empsMap = await getLiveEmployeesMap();
      subordinateIds = new Set(
        Object.entries(empsMap)
          .filter(([_, emp]) => String(emp.supervisorId) === currentEmpId)
          .map(([id]) => String(id))
      );

      if (knownOwner && subordinateIds.has(knownOwner)) {
        return true;
      }

      if (uuid.startsWith('spot_')) {
        const parts = uuid.split('_');
        if (parts[1] && subordinateIds.has(parts[1])) return true;
      }

      if (uuid.startsWith('SPOT-MANUAL-')) {
        const parts = uuid.split('-');
        const embeddedEmpId = parts.slice(3).join('-');
        if (
          Array.from(subordinateIds).some((subId) => uuid.endsWith(`-${subId}`)) ||
          (embeddedEmpId && subordinateIds.has(embeddedEmpId))
        ) {
          return true;
        }
      }

      if (uuid.includes('_')) {
        const prefix = uuid.split('_')[0];
        if (subordinateIds.has(prefix)) return true;
      }
    } catch (e) {
      console.warn('Failed to resolve supervisor subordinates for photo check:', e);
    }
  }

  // 5. Lookup in GAS logs cache for opaque UUIDs
  try {
    const [logsRes, spotRes] = await Promise.all([
      callGAS('getLogs').catch(() => null),
      callGAS('getSpotChecks').catch(() => null),
    ]);

    let targetEmpId: string | null = null;

    if (logsRes?.logs && Array.isArray(logsRes.logs)) {
      const matched = logsRes.logs.find(
        (l: any) => String(l.uuid) === uuid || String(l.photo) === uuid
      );
      if (matched) {
        targetEmpId = String(matched.employeeId);
      }
    }

    if (!targetEmpId && spotRes?.spotChecks && Array.isArray(spotRes.spotChecks)) {
      const matched = spotRes.spotChecks.find(
        (s: any) => String(s.uuid) === uuid || String(s.spotCheckId || s.id) === uuid
      );
      if (matched) {
        targetEmpId = String(matched.employeeId);
      }
    }

    if (targetEmpId) {
      associatePhotoOwner(uuid, targetEmpId);
      if (targetEmpId === currentEmpId) return true;
      if (session.role === 'supervisor' && subordinateIds && subordinateIds.has(targetEmpId)) {
        return true;
      }
    }
  } catch (err) {
    console.warn('Failed to lookup photo ownership in GAS logs:', err);
  }

  return false;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: กรุณาเข้าสู่ระบบก่อนดูรูปภาพ' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const uuid = searchParams.get('uuid');
    const explicitType = searchParams.get('type') || searchParams.get('logType');
    const type = explicitType || 'checkin';

    if (!uuid || uuid === 'undefined' || uuid === 'null') {
      return NextResponse.json({ error: 'Missing uuid parameter' }, { status: 400 });
    }

    // SEC-01: Prevent BOLA / IDOR on employee selfies
    const authorized = await isAuthorizedToViewPhoto(uuid, session);
    if (!authorized) {
      return NextResponse.json(
        { error: 'Forbidden: คุณไม่มีสิทธิ์เข้าถึงรูปภาพของพนักงานท่านอื่น' },
        { status: 403 }
      );
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

    // 2. Check local disk cache (skip on read-only serverless environments)
    const safeKey = uuid.replace(/[^a-zA-Z0-9_-]/g, '_');
    const isReadOnlyFs = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    if (!isReadOnlyFs) {
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
    }

    // Check short-lived negative cache (60s) to prevent hammering GAS for missing Drive photos
    const missedAt = missingPhotoCache.get(uuid);
    if (missedAt && Date.now() - missedAt < 60_000) {
      return NextResponse.json({ error: 'Photo not found in Google Drive' }, { status: 404 });
    }

    // 3. Fetch from Google Drive via GAS adminGetLogPhoto
    const gasLogType = type.includes('สุ่มตรวจ') || type === 'spotcheck' ? 'spotcheck' : 'checkin';
    let gasRes = await callGAS('adminGetLogPhoto', {
      logType: gasLogType,
      uuid: uuid,
      adminPin: '9999',
    });

    if (!gasRes?.photo && !explicitType && gasLogType === 'checkin') {
      // Fallback try spotcheck logType only when caller did not specify explicit type
      try {
        gasRes = await callGAS('adminGetLogPhoto', {
          logType: 'spotcheck',
          uuid: uuid,
          adminPin: '9999',
        });
      } catch {}
    }

    if (gasRes?.photo && typeof gasRes.photo === 'string') {
      missingPhotoCache.delete(uuid);
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

    missingPhotoCache.set(uuid, Date.now());
    return NextResponse.json({ error: 'Photo not found in Google Drive' }, { status: 404 });
  } catch (error: any) {
    console.error('Error fetching photo from Google Drive:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
