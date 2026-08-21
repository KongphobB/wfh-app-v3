import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 1. Mock Server Modules
vi.mock('@/lib/gas', () => ({
  callGAS: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/notifications', () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}));

import { callGAS } from '@/lib/gas';
import { GET as spotcheckTickGET } from '@/app/api/spotcheck/tick/route';
import { GET as missingCheckinTickGET } from '@/app/api/notifications/missing-checkin-tick/route';

describe('Cron Auth Guard Test Suite', () => {
  const TEST_CRON_SECRET = '9a14146f08f8d44d333bcad0a816ab732ab708ffeadf9b535f57efa174aaf613';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = TEST_CRON_SECRET;
  });

  afterEach(() => {
    process.env.CRON_SECRET = TEST_CRON_SECRET;
  });

  it('1. Rejects request without Authorization header with 401', async () => {
    const req = new Request('http://localhost/api/spotcheck/tick');
    const res = await spotcheckTickGET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Unauthorized cron request');

    const req2 = new Request('http://localhost/api/notifications/missing-checkin-tick');
    const res2 = await missingCheckinTickGET(req2);
    const data2 = await res2.json();

    expect(res2.status).toBe(401);
    expect(data2.error).toBe('Unauthorized cron request');
  });

  it('2. Rejects request with wrong/invalid Bearer token with 401', async () => {
    const req = new Request('http://localhost/api/spotcheck/tick', {
      headers: { Authorization: 'Bearer wrong-secret-token' },
    });
    const res = await spotcheckTickGET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Unauthorized cron request');
  });

  it('3. Accepts request with correct Bearer token and executes tick logic', async () => {
    vi.setSystemTime(new Date(2026, 7, 13, 10, 0, 0)); // Thursday

    const req = new Request('http://localhost/api/spotcheck/tick', {
      headers: { Authorization: `Bearer ${TEST_CRON_SECRET}` },
    });
    const res = await spotcheckTickGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('4. Fail-closed: Rejects with 500 when CRON_SECRET is unconfigured in process.env regardless of header', async () => {
    delete process.env.CRON_SECRET;

    const req = new Request('http://localhost/api/spotcheck/tick', {
      headers: { Authorization: `Bearer ${TEST_CRON_SECRET}` },
    });
    const res = await spotcheckTickGET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('CRON_SECRET is not configured');

    const req2 = new Request('http://localhost/api/notifications/missing-checkin-tick', {
      headers: { Authorization: `Bearer ${TEST_CRON_SECRET}` },
    });
    const res2 = await missingCheckinTickGET(req2);
    const data2 = await res2.json();

    expect(res2.status).toBe(500);
    expect(data2.error).toBe('CRON_SECRET is not configured');
  });
});
