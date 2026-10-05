import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistanceKm,
  calculateHaversineDistanceMeters,
  determineVerificationStatus,
  isPhotoOptionalForPosition,
  isValidCoordinate,
  MAX_MOVEMENT_DISTANCE_KM,
} from '@/lib/geo';

describe('lib/geo.ts Pure Unit Tests', () => {
  it('MAX_MOVEMENT_DISTANCE_KM constant is defined as 20.0', () => {
    expect(MAX_MOVEMENT_DISTANCE_KM).toBe(20.0);
  });

  it('calculateHaversineDistanceKm calculates known distance (Bangkok to Chiang Mai ~590km within <1% error)', () => {
    // Bangkok: 13.7563, 100.5018
    // Chiang Mai: 18.7883, 98.9853
    const distanceKm = calculateHaversineDistanceKm(13.7563, 100.5018, 18.7883, 98.9853);
    
    // Expected distance ~585 km - 590 km
    expect(distanceKm).toBeGreaterThan(580);
    expect(distanceKm).toBeLessThan(600);
    
    // Error percentage check relative to ~587.5 km reference
    const referenceKm = 587.5;
    const errorPct = Math.abs(distanceKm - referenceKm) / referenceKm;
    expect(errorPct).toBeLessThan(0.01); // Error < 1%
  });

  it('calculateHaversineDistanceMeters calculates exact zero for same coordinates', () => {
    const meters = calculateHaversineDistanceMeters(13.7563, 100.5018, 13.7563, 100.5018);
    expect(meters).toBe(0);
  });

  it('determineVerificationStatus returns correct status based on radius and coordinates', () => {
    const officeLat = 13.7563;
    const officeLng = 100.5018;

    // 1. Within 500m radius -> 'ปฏิบัติงานที่ออฟฟิศ'
    const statusAtOffice = determineVerificationStatus(13.7563, 100.5018, officeLat, officeLng, 500);
    expect(statusAtOffice).toBe('ปฏิบัติงานที่ออฟฟิศ');

    // 2. Outside 500m radius -> 'นอกพื้นที่ (WFH)'
    const statusWFH = determineVerificationStatus(13.8000, 100.6000, officeLat, officeLng, 500);
    expect(statusWFH).toBe('นอกพื้นที่ (WFH)');

    // 3. Null/Undefined coordinates -> 'ระบุตำแหน่งไม่ได้'
    const statusNull = determineVerificationStatus(null, null, officeLat, officeLng, 500);
    expect(statusNull).toBe('ระบุตำแหน่งไม่ได้');

    const statusUndefined = determineVerificationStatus(undefined, undefined, officeLat, officeLng, 500);
    expect(statusUndefined).toBe('ระบุตำแหน่งไม่ได้');

    // 4. (0, 0) Null Island coordinates -> 'ระบุตำแหน่งไม่ได้'
    const statusZeroZero = determineVerificationStatus(0, 0, officeLat, officeLng, 500);
    expect(statusZeroZero).toBe('ระบุตำแหน่งไม่ได้');
  });

  it('isValidCoordinate correctly validates latitude/longitude pairs', () => {
    // Valid coordinates
    expect(isValidCoordinate(13.7563, 100.5018)).toBe(true);
    expect(isValidCoordinate(-33.8688, 151.2093)).toBe(true);

    // Invalid coordinates (null, undefined, 0,0, out of bounds)
    expect(isValidCoordinate(null, null)).toBe(false);
    expect(isValidCoordinate(undefined, undefined)).toBe(false);
    expect(isValidCoordinate(0, 0)).toBe(false);
    expect(isValidCoordinate(95, 100)).toBe(false); // Lat > 90
    expect(isValidCoordinate(13, 200)).toBe(false); // Lng > 180
  });

  it('isPhotoOptionalForPosition correctly checks senior/manager positions', () => {
    expect(isPhotoOptionalForPosition('Senior Developer')).toBe(true);
    expect(isPhotoOptionalForPosition('Project Manager')).toBe(true);
    expect(isPhotoOptionalForPosition('Team Lead')).toBe(true);
    expect(isPhotoOptionalForPosition('Junior Engineer')).toBe(false);
    expect(isPhotoOptionalForPosition(null)).toBe(false);
  });
});
