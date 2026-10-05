import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isEmployeePhotoExempt, getExemptConfig, getLocalExemptIds, saveLocalExemptIds } from '@/lib/photoExempt';

describe('Photo Exemption Logic QA Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Reads and writes local exempt employee IDs', () => {
    const testIds = new Set(['1304', '9999', 'TEST_EMP_99']);
    saveLocalExemptIds(testIds);

    const loaded = getLocalExemptIds();
    expect(loaded.has('1304')).toBe(true);
    expect(loaded.has('TEST_EMP_99')).toBe(true);
  });

  it('2. Exempts employees who have explicit exempt IDs', async () => {
    saveLocalExemptIds(new Set(['EXEMPT_USER_1']));

    const isExempt = await isEmployeePhotoExempt({
      employee_id: 'EXEMPT_USER_1',
      position: 'Programmer',
      role: 'employee',
    });

    expect(isExempt).toBe(true);
  });

  it('3. Auto-exempts admin and supervisor roles when autoExemptSupervisors is active', async () => {
    const isAdminExempt = await isEmployeePhotoExempt({
      employee_id: '8888',
      position: 'HR Officer',
      role: 'admin',
    });
    expect(isAdminExempt).toBe(true);

    const isSupExempt = await isEmployeePhotoExempt({
      employee_id: '7777',
      position: 'Developer',
      role: 'supervisor',
    });
    expect(isSupExempt).toBe(true);
  });

  it('4. Exempts positions matching keywords: Senior, Manager, Leader, Executive', async () => {
    const seniorExempt = await isEmployeePhotoExempt({
      employee_id: '5001',
      position: 'Senior Software Engineer',
      role: 'employee',
    });
    expect(seniorExempt).toBe(true);

    const mgrExempt = await isEmployeePhotoExempt({
      employee_id: '5002',
      position: 'Product Manager',
      role: 'employee',
    });
    expect(mgrExempt).toBe(true);

    const thaiMgrExempt = await isEmployeePhotoExempt({
      employee_id: '5003',
      position: 'ผู้จัดการฝ่ายขาย',
      role: 'employee',
    });
    expect(thaiMgrExempt).toBe(true);
  });

  it('5. Does NOT exempt regular junior staff without special title or exemption flag', async () => {
    const juniorExempt = await isEmployeePhotoExempt({
      employee_id: '6001',
      position: 'Junior Graphic Designer',
      role: 'employee',
    });
    expect(juniorExempt).toBe(false);

    const generalExempt = await isEmployeePhotoExempt({
      employee_id: '6002',
      position: 'เจ้าหน้าที่ธุรการทั่วไป',
      role: 'employee',
    });
    expect(generalExempt).toBe(false);
  });
});
