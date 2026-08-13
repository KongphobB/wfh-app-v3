import bcrypt from 'bcryptjs';
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase/server';

interface EmployeeWithoutPin {
  employee_id: string;
  name: string;
}

/**
 * Migration script: Scans the `employees` table in Supabase for legacy plain-text PINs
 * (where `pin_hash` does not start with bcrypt prefix `$2a$` or `$2b$`), hashes them
 * using bcrypt (10 rounds), and updates the records back into Supabase.
 * If an employee has an empty/null `pin_hash`, it sets `force_pin_change = true` and reports it.
 */
async function rehashLegacyPins() {
  console.log('🔄 Starting legacy PIN rehash migration...');

  if (!isSupabaseConfigured()) {
    console.warn('⚠️ Supabase credentials not set in environment. Skipping DB migration.');
    process.exit(0);
  }

  try {
    const { data: employees, error } = await supabaseAdmin
      .from('employees')
      .select('employee_id, name, pin_hash');

    if (error) {
      console.error('❌ Failed to fetch employees from Supabase:', error);
      process.exit(1);
    }

    if (!employees || employees.length === 0) {
      console.log('ℹ️ No employee records found in Supabase.');
      process.exit(0);
    }

    let updatedCount = 0;
    const employeesWithoutPin: EmployeeWithoutPin[] = [];

    for (const emp of employees) {
      const currentHash = emp.pin_hash ? emp.pin_hash.trim() : '';

      // Case 1: Empty or null pin_hash -> Do NOT auto-set to "1234". Mark force_pin_change = true.
      if (!currentHash) {
        employeesWithoutPin.push({ employee_id: emp.employee_id, name: emp.name });
        await supabaseAdmin
          .from('employees')
          .update({
            force_pin_change: true,
            updated_at: new Date().toISOString(),
          })
          .eq('employee_id', emp.employee_id);
        continue;
      }

      // Case 2: Legacy plain-text PIN -> Rehash using bcrypt
      if (!currentHash.startsWith('$2a$') && !currentHash.startsWith('$2b$')) {
        console.log(`🔑 Rehashing legacy PIN for employee ${emp.name} (${emp.employee_id})...`);
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(currentHash, salt);

        const { error: updateError } = await supabaseAdmin
          .from('employees')
          .update({
            pin_hash: newHash,
            updated_at: new Date().toISOString(),
          })
          .eq('employee_id', emp.employee_id);

        if (updateError) {
          console.error(`❌ Failed to update PIN hash for ${emp.employee_id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`✅ Successfully rehashed PIN for ${emp.employee_id}`);
        }
      }
    }

    console.log(`🎉 Migration complete! Rehashed ${updatedCount} employee records.`);

    if (employeesWithoutPin.length > 0) {
      console.log(
        `\n⚠️ พบพนักงาน ${employeesWithoutPin.length} คนที่ไม่มี PIN ในระบบเดิม (ต้องให้แอดมิน set PIN ใหม่เอง):`
      );
      employeesWithoutPin.forEach((emp) => {
        console.log(`   - ${emp.employee_id} (${emp.name})`);
      });
    }
  } catch (err) {
    console.error('❌ Migration failed with error:', err);
    process.exit(1);
  }
}

rehashLegacyPins();
