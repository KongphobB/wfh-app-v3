import { describe, it, expect, beforeEach } from 'vitest';
import { determineRole, formatPositionForRole, checkRateLimit, recordFailedAttempt, resetFailedAttempt } from '@/lib/auth';
import { verifySessionToken } from '@/lib/jwt';
import { SignJWT } from 'jose';

describe('Authentication & Role Determination QA Suite', () => {
  const testSecret = 'r2VdFyi0Ow4gHzp+kJDU3vRcI/Q7q/PA2v3mofgXocg=';

  beforeEach(() => {
    process.env.JWT_SECRET = testSecret;
    delete process.env.DISABLE_RATE_LIMIT;
  });

  describe('1. determineRole', () => {
    it('Identifies admin by employeeId 9999', () => {
      expect(determineRole('พนักงาน', 'ไอที', '9999')).toBe('admin');
    });

    it('Identifies admin by department containing ผู้ดูแลระบบ', () => {
      expect(determineRole('เจ้าหน้าที่', 'ฝ่ายผู้ดูแลระบบ', '1001')).toBe('admin');
    });

    it('Identifies admin by position tag [Admin] or (Admin)', () => {
      expect(determineRole('System Engineer [Admin]', 'IT', '1002')).toBe('admin');
      expect(determineRole('Manager (admin)', 'IT', '1003')).toBe('admin');
    });

    it('Identifies supervisor by position containing [Supervisor] or (หัวหน้างาน)', () => {
      expect(determineRole('Project Manager [Supervisor]', 'Project', '2001')).toBe('supervisor');
      expect(determineRole('วิศวกรอาวุโส (หัวหน้างาน)', 'Engineering', '2002')).toBe('supervisor');
      expect(determineRole('Team Lead (supervisor)', 'Design', '2003')).toBe('supervisor');
    });

    it('Defaults to employee for regular staff and newly registered users', () => {
      expect(determineRole('Junior Developer', 'IT', '1111')).toBe('employee');
      expect(determineRole('เจ้าหน้าที่ประสานงาน', 'ธุรการ', '1205')).toBe('employee');
      expect(determineRole(undefined, undefined, '3000')).toBe('employee');
    });
  });

  describe('2. formatPositionForRole', () => {
    it('Cleans existing tags and appends [Supervisor] for supervisor role', () => {
      const pos = formatPositionForRole('Developer [Admin]', 'supervisor');
      expect(pos).toBe('Developer [Supervisor]');
    });

    it('Cleans existing tags and appends [Admin] for admin role', () => {
      const pos = formatPositionForRole('Lead (หัวหน้างาน)', 'admin');
      expect(pos).toBe('Lead [Admin]');
    });

    it('Strips tags for regular employee role', () => {
      const pos = formatPositionForRole('Staff [Supervisor]', 'employee');
      expect(pos).toBe('Staff');
    });

    it('Provides sensible fallback when raw position is empty', () => {
      expect(formatPositionForRole('', 'employee')).toBe('พนักงาน');
      expect(formatPositionForRole('', 'supervisor')).toBe('หัวหน้างาน [Supervisor]');
      expect(formatPositionForRole('', 'admin')).toBe('ผู้ดูแลระบบ [Admin]');
    });
  });

  describe('3. Rate Limiting Logic', () => {
    const testEmp = 'qa_test_emp_01';

    beforeEach(async () => {
      await resetFailedAttempt(testEmp);
    });

    it('Allows up to 4 failed attempts without locking account', async () => {
      for (let i = 0; i < 4; i++) {
        await recordFailedAttempt(testEmp);
        const check = await checkRateLimit(testEmp);
        expect(check.isLimited).toBe(false);
      }
    });

    it('Locks account on 5th failed attempt', async () => {
      for (let i = 0; i < 5; i++) {
        await recordFailedAttempt(testEmp);
      }
      const check = await checkRateLimit(testEmp);
      expect(check.isLimited).toBe(true);
      expect(check.lockMinutesRemaining).toBeGreaterThan(0);
      expect(check.lockMinutesRemaining).toBeLessThanOrEqual(15);
    });

    it('Unlocks account immediately when resetFailedAttempt is invoked', async () => {
      for (let i = 0; i < 5; i++) {
        await recordFailedAttempt(testEmp);
      }
      expect((await checkRateLimit(testEmp)).isLimited).toBe(true);

      await resetFailedAttempt(testEmp);
      expect((await checkRateLimit(testEmp)).isLimited).toBe(false);
    });
  });

  describe('4. JWT Session Token Security', () => {
    it('Verifies a valid JWT token signed with secret', async () => {
      const secret = new TextEncoder().encode(testSecret);
      const token = await new SignJWT({
        employee_id: '1111',
        name: 'สมชาย ทดสอบ',
        role: 'employee',
        department: 'IT',
        force_pin_change: false,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(secret);

      const payload = await verifySessionToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.employee_id).toBe('1111');
      expect(payload?.role).toBe('employee');
      expect(payload?.force_pin_change).toBe(false);
    });

    it('Rejects invalid or tampered JWT token', async () => {
      const result = await verifySessionToken('invalid.jwt.token');
      expect(result).toBeNull();
    });

    it('Rejects token signed with a different secret', async () => {
      const wrongSecret = new TextEncoder().encode('another_secret_key_which_is_wrong_1234567890');
      const token = await new SignJWT({ employee_id: '9999', role: 'admin' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(wrongSecret);

      const payload = await verifySessionToken(token);
      expect(payload).toBeNull();
    });
  });
});
