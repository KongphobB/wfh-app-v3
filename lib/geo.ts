import { VerificationStatus } from '@/types';

export const MAX_MOVEMENT_DISTANCE_KM = 20.0;

/**
 * Haversine formula to calculate spherical distance between two GPS coordinates in meters
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's mean radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Haversine distance in kilometers
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  return calculateHaversineDistanceMeters(lat1, lng1, lat2, lng2) / 1000.0;
}

/**
 * Validate GPS coordinates:
 * Returns false if coordinates are null, undefined, NaN, outside valid geographical range,
 * or exactly (0, 0) which is Null Island (Gulf of Guinea) returned on GPS error/mock failure.
 */
export function isValidCoordinate(
  lat: number | null | undefined,
  lng: number | null | undefined
): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return true;
}

/**
 * Determine check-in verification status based on GPS coordinates and Office config
 */
export function determineVerificationStatus(
  userLat: number | null | undefined,
  userLng: number | null | undefined,
  officeLat: number = 13.7563,
  officeLng: number = 100.5018,
  maxRadiusMeters: number = 500
): VerificationStatus {
  if (!isValidCoordinate(userLat, userLng)) {
    return 'ระบุตำแหน่งไม่ได้';
  }

  const distance = calculateHaversineDistanceMeters(userLat!, userLng!, officeLat, officeLng);
  return distance <= maxRadiusMeters ? 'ปฏิบัติงานที่ออฟฟิศ' : 'นอกพื้นที่ (WFH)';
}

/**
 * Ported from legacy Checkin.js: Check if photo submission is optional based on employee position keywords
 */
export function isPhotoOptionalForPosition(position: string | null | undefined): boolean {
  if (!position) return false;
  const keywords = ['senior', 'manager', 'ผจก.', 'หัวหน้า', 'lead', 'executive', 'director', 'vp', 'head'];
  const posLower = position.toLowerCase();
  return keywords.some((kw) => posLower.includes(kw));
}
