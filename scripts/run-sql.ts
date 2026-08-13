import { Client } from 'pg';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load .env.local
dotenv.config({ path: '.env.local' });

async function main() {
  const arg = process.argv[2];
  let dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

  if (!dbUrl && process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('postgres')) {
    dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  }

  if (!dbUrl) {
    console.error(`❌ ไม่พบ DATABASE_URL ในไฟล์ .env.local`);
    process.exit(1);
  }

  // Convert direct IPv6 host (db.[ref].supabase.co) to IPv4 pooler if needed for Node pg on Windows IPv4 networks
  if (dbUrl.includes('db.') && dbUrl.includes('.supabase.co')) {
    const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@db\.([^.]+)\.supabase\.co:(\d+)\/(.+)/);
    if (match) {
      const [, user, pass, ref, , dbName] = match;
      dbUrl = `postgresql://${user}.${ref}:${pass}@aws-0-ap-southeast-1.pooler.supabase.com:6543/${dbName}`;
    }
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  console.log(`🔌 กำลังเชื่อมต่อ Supabase Postgres...`);
  try {
    await client.connect();
    console.log(`✅ เชื่อมต่อ Supabase Postgres สำเร็จเรียบร้อย`);

    if (arg === '--verify') {
      console.log(`\n🔍 กำลังตรวจสอบโครงสร้างตารางและ View ใน Supabase Postgres...`);

      const tablesRes = await client.query(`
        SELECT table_name, table_type 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);

      console.log(`\n📋 รายชื่อตารางและ View ทั้งหมดที่พบ (${tablesRes.rows.length} รายการ):`);
      tablesRes.rows.forEach((row) => {
        console.log(`   - [${row.table_type === 'VIEW' ? 'VIEW' : 'TABLE'}] ${row.table_name}`);
      });

      const empRes = await client.query(`SELECT COUNT(*) as count FROM employees;`);
      console.log(`\n👥 จำนวนแถวพนักงานในตาราง employees: ${empRes.rows[0].count} แถว`);

      const empListRes = await client.query(`SELECT employee_id, name, role, wfh_status FROM employees ORDER BY employee_id;`);
      console.log(`\n📄 รายชื่อพนักงานทั้งหมด:`);
      empListRes.rows.forEach((emp) => {
        console.log(`   - ID: ${emp.employee_id} | ${emp.name} | Role: ${emp.role} | WFH: ${emp.wfh_status}`);
      });

      return;
    }

    if (!arg) {
      console.error('❌ กรุณาระบุ path ไฟล์ SQL เช่น: npx tsx scripts/run-sql.ts supabase/schema.sql หรือ --verify');
      process.exit(1);
    }

    const sql = readFileSync(arg, 'utf-8');
    console.log(`📄 กำลังรันไฟล์: ${arg}`);

    await client.query(sql);
    console.log(`🎉 รันไฟล์ ${arg} สำเร็จเรียบร้อย!`);
  } catch (err: any) {
    console.error(`❌ เกิด Error ตอนดำเนินการ:`, err.message || err);
    process.exit(1);
  } finally {
    await client.end();
    console.log(`🔌 ปิดการเชื่อมต่อ Postgres เรียบร้อยแล้ว`);
  }
}

main();
