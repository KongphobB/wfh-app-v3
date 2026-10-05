import { describe, it, expect } from 'vitest';
import {
  getAllHolidays,
  addCustomHoliday,
  updateHoliday,
  deleteHoliday,
  getHolidayPolicyDoc,
} from '@/lib/holidayStore';
import { getThaiDateStr, getThaiTime, syncServerTime, getSyncedNow } from '@/lib/timeSync';

describe('Company Holidays & Time Synchronization QA Suite', () => {
  describe('1. Holiday Store Management', () => {
    it('Initializes with official 2026 SNU company holidays', () => {
      const holidays = getAllHolidays();
      expect(holidays.length).toBeGreaterThanOrEqual(15);
      const newYear = holidays.find((h) => h.date === '2026-01-01');
      expect(newYear).toBeDefined();
      expect(newYear?.name).toBe('วันขึ้นปีใหม่');
    });

    it('Adds a new custom company holiday', () => {
      const custom = addCustomHoliday({
        date: '2026-12-25',
        name: 'วันคริสต์มาส (วันหยุดพิเศษ)',
        name_en: 'Christmas Day',
        notes: 'กิจกรรมพิเศษบริษัท',
      });

      expect(custom.id).toBeDefined();
      expect(custom.type).toBe('company');
      expect(custom.is_active).toBe(true);

      const all = getAllHolidays();
      const found = all.find((h) => h.id === custom.id);
      expect(found).toBeDefined();
    });

    it('Updates existing holiday name and active status', () => {
      const added = addCustomHoliday({
        date: '2026-11-20',
        name: 'วันกีฬาและสัมพันธ์องค์กร',
      });

      const updated = updateHoliday({
        id: added.id,
        name: 'วันสถาปนาบริษัทและกีฬา',
        is_active: false,
      });

      expect(updated?.name).toBe('วันสถาปนาบริษัทและกีฬา');
      expect(updated?.is_active).toBe(false);
    });

    it('Deletes custom holiday', () => {
      const added = addCustomHoliday({
        date: '2026-09-09',
        name: 'วันจัดกิจกรรมชั่วคราว',
      });

      const deleted = deleteHoliday(added.id);
      expect(deleted).toBe(true);

      const all = getAllHolidays();
      expect(all.find((h) => h.id === added.id)).toBeUndefined();
    });

    it('Returns official holiday policy document metadata', () => {
      const doc = getHolidayPolicyDoc();
      expect(doc).not.toBeNull();
      expect(doc?.file_name).toContain('ประกาศบริษัท');
    });
  });

  describe('2. Bangkok Timezone & Date Formatting', () => {
    it('Formats UTC ISO timestamp correctly into Asia/Bangkok date YYYY-MM-DD', () => {
      // 2026-10-05T01:00:00Z -> 2026-10-05 08:00:00 in Bangkok (+7)
      const dateStr = getThaiDateStr('2026-10-05T01:00:00Z');
      expect(dateStr).toBe('2026-10-05');

      // 2026-10-04T20:00:00Z -> 2026-10-05 03:00:00 in Bangkok (+7)
      const nextDayStr = getThaiDateStr('2026-10-04T20:00:00Z');
      expect(nextDayStr).toBe('2026-10-05');
    });

    it('Calculates Thai time components correctly', () => {
      // 2026-10-05T01:30:45Z -> 08:30:45 Bangkok time
      const thaiTime = getThaiTime('2026-10-05T01:30:45Z');
      expect(thaiTime.hour).toBe(8);
      expect(thaiTime.minute).toBe(30);
      expect(thaiTime.second).toBe(45);
    });

    it('Synchronizes with server timestamp and computes offset', () => {
      const futureServerTime = Date.now() + 5000;
      syncServerTime(futureServerTime);

      const now = getSyncedNow();
      expect(now).toBeGreaterThanOrEqual(futureServerTime - 50);
    });
  });
});
