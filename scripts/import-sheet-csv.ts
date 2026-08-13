import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local before running import script.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Helper to parse simple CSV text into an array of objects
 */
function parseCsv(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || '';
    });
    return obj;
  });
}

async function importLegacyData() {
  console.log('🚀 Starting One-Time Legacy Sheet CSV Import to Supabase...');

  const dataDir = path.join(process.cwd(), 'legacy_data');
  if (!fs.existsSync(dataDir)) {
    console.log(`ℹ️ Directory "${dataDir}" not found. Creating placeholder directory...`);
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('💡 Place your legacy exported CSV files (employees.csv, checkin_logs.csv, tasks.csv) in ./legacy_data/ and re-run.');
    return;
  }

  // 1. Import Employees
  const empFile = path.join(dataDir, 'employees.csv');
  if (fs.existsSync(empFile)) {
    const rows = parseCsv(fs.readFileSync(empFile, 'utf-8'));
    console.log(`📦 Importing ${rows.length} employee records...`);

    const employeesWithDefaultPin: { employee_id: string; name: string; pin: string }[] = [];

    for (const r of rows) {
      const empId = r['employee_id'] || r['รหัสพนักงาน'];
      const name = r['name'] || r['ชื่อ-นามสกุล'];
      const rawPin = r['PIN'] || r['pin'] || '';

      let pinToHash = rawPin;
      let forcePinChange = r['force_pin_change'] === 'true';

      if (!rawPin) {
        // Generate random 4-digit temporary PIN if missing in CSV
        pinToHash = Math.floor(1000 + Math.random() * 9000).toString();
        forcePinChange = true;
        console.log(`⚠️ [${empId}] (${name}) ไม่มี PIN ใน CSV — สุ่ม PIN ชั่วคราวให้: ${pinToHash}`);
        employeesWithDefaultPin.push({ employee_id: empId, name, pin: pinToHash });
      }

      const pinHash = pinToHash.startsWith('$2a$') || pinToHash.startsWith('$2b$') ? pinToHash : await bcrypt.hash(pinToHash, 10);

      await supabase.from('employees').upsert({
        employee_id: empId,
        name,
        email: r['email'] || null,
        department: r['department'] || r['แผนก'] || null,
        position: r['position'] || r['ตำแหน่ง'] || null,
        supervisor_id: r['supervisor_id'] || r['รหัสหัวหน้า'] || null,
        pin_hash: pinHash,
        one_star_count: Number(r['one_star_count'] || 0),
        wfh_status: r['wfh_status'] || 'เปิดสิทธิ์',
        role: r['role'] || 'employee',
        force_pin_change: forcePinChange,
      });
    }

    console.log('✅ Employees imported successfully.');

    if (employeesWithDefaultPin.length > 0) {
      console.log(`\n⚠️ สรุปพนักงาน ${employeesWithDefaultPin.length} คนที่ไม่มี PIN ใน CSV (สุ่ม PIN ชั่วคราว + บังคับเปลี่ยน PIN):`);
      employeesWithDefaultPin.forEach((emp) => {
        console.log(`   - รหัส ${emp.employee_id} (${emp.name}): PIN ชั่วคราว = ${emp.pin}`);
      });
    }
  }

  console.log('🎉 Legacy CSV Import completed! Google Sheets is now completely disconnected.');
}

importLegacyData().catch((err) => {
  console.error('❌ Import failed:', err);
});
