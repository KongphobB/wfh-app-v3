import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Central Config & Single Import Verification', () => {
  it('MAX_MOVEMENT_DISTANCE_KM is imported from lib/geo in checkin/route.ts and spotcheck/route.ts', () => {
    const checkinRoutePath = path.resolve(__dirname, '../app/api/checkin/route.ts');
    const spotcheckRoutePath = path.resolve(__dirname, '../app/api/spotcheck/route.ts');

    const checkinContent = fs.readFileSync(checkinRoutePath, 'utf-8');
    const spotcheckContent = fs.readFileSync(spotcheckRoutePath, 'utf-8');

    // Assert MAX_MOVEMENT_DISTANCE_KM is imported from lib/geo
    expect(checkinContent).toMatch(/import\s*\{[^}]*MAX_MOVEMENT_DISTANCE_KM[^}]*\}\s*from\s*['"]@\/lib\/geo['"]/);
    expect(spotcheckContent).toMatch(/import\s*\{[^}]*MAX_MOVEMENT_DISTANCE_KM[^}]*\}\s*from\s*['"]@\/lib\/geo['"]/);

    // Assert no hardcoded MAX_DISTANCE_KM = 20 inside local route variables
    expect(checkinContent).not.toMatch(/const\s+MAX_DISTANCE_KM\s*=\s*20/);
    expect(spotcheckContent).not.toMatch(/const\s+MAX_DISTANCE_KM\s*=\s*20/);
  });
});
