import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { verifyCronAuth } from '@/lib/cron';

describe('Cron Authentication Security (SEC-04)', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = 'super_secret_cron_token_12345';
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it('Rejects requests when CRON_SECRET is not configured (fail-closed)', () => {
    delete process.env.CRON_SECRET;
    const req = new Request('http://localhost/api/notifications/missing-checkin-tick', {
      headers: { authorization: 'Bearer super_secret_cron_token_12345' },
    });
    const result = verifyCronAuth(req);
    expect(result.authorized).toBe(false);
    expect(result.response?.status).toBe(500);
  });

  it('Rejects requests without authorization header', () => {
    const req = new Request('http://localhost/api/notifications/missing-checkin-tick');
    const result = verifyCronAuth(req);
    expect(result.authorized).toBe(false);
    expect(result.response?.status).toBe(401);
  });

  it('Rejects requests with different secret length without throwing RangeError', () => {
    const req = new Request('http://localhost/api/notifications/missing-checkin-tick', {
      headers: { authorization: 'Bearer short' },
    });
    const result = verifyCronAuth(req);
    expect(result.authorized).toBe(false);
    expect(result.response?.status).toBe(401);
  });

  it('Rejects requests with same length but invalid secret using constant-time comparison', () => {
    // Same length as 'Bearer super_secret_cron_token_12345'
    const wrongHeader = 'Bearer ' + 'x'.repeat('super_secret_cron_token_12345'.length);
    const req = new Request('http://localhost/api/notifications/missing-checkin-tick', {
      headers: { authorization: wrongHeader },
    });
    const result = verifyCronAuth(req);
    expect(result.authorized).toBe(false);
    expect(result.response?.status).toBe(401);
  });

  it('Authorizes valid cron request with exact matching secret', () => {
    const req = new Request('http://localhost/api/notifications/missing-checkin-tick', {
      headers: { authorization: 'Bearer super_secret_cron_token_12345' },
    });
    const result = verifyCronAuth(req);
    expect(result.authorized).toBe(true);
    expect(result.response).toBeUndefined();
  });
});
