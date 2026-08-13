-- ========================================================
-- WFH App v3 - Supabase Postgres Schema Definition
-- ========================================================

-- 1. Employees Table
create table if not exists employees (
  employee_id      text primary key,
  name             text not null,
  email            text,
  department       text,
  position         text,
  supervisor_id    text references employees(employee_id),
  pin_hash         text not null,
  one_star_count   integer not null default 0,
  wfh_status       text not null default 'เปิดสิทธิ์', -- 'เปิดสิทธิ์' / 'ระงับสิทธิ์'
  force_pin_change boolean not null default false,
  role             text not null default 'employee', -- 'employee' / 'supervisor' / 'admin'
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- 2. Checkin Logs Table
create table if not exists checkin_logs (
  id                   uuid primary key default gen_random_uuid(),
  employee_id          text not null references employees(employee_id),
  log_type             text not null, -- 'เข้างาน' / 'ออกงาน' / 'ยืนยันตัวตน'
  log_date             date not null default current_date,
  log_time             timestamptz not null default now(),
  gps_lat              double precision,
  gps_lng              double precision,
  photo_url            text,
  note                 text,
  out_of_bounds_reason text,
  is_early_leave       boolean not null default false,
  verification_status  text, -- 'ปฏิบัติงานที่ออฟฟิศ' / 'นอกพื้นที่ (WFH)' / 'ระบุตำแหน่งไม่ได้' / 'เข้างานสาย' / 'ออกงานก่อนเวลา' / 'ยืนยันตัวตนรอบ 2 สำเร็จ' / 'ยืนยันตัวตนสาย (ถือเป็นขาดงาน)' / 'นอกรัศมี 20 กม. (ถือเป็นขาดงาน)'
  created_at           timestamptz not null default now()
);
create index if not exists idx_checkin_emp_date on checkin_logs (employee_id, log_date);

-- Alter columns for existing checkin_logs table if missing
alter table checkin_logs add column if not exists out_of_bounds_reason text;
alter table checkin_logs add column if not exists is_early_leave boolean not null default false;

-- 3. Missing Checkins Table
create table if not exists missing_checkins (
  id           uuid primary key default gen_random_uuid(),
  log_date     date not null,
  employee_id  text not null references employees(employee_id),
  status       text not null default 'ขาดเช็คอิน',
  recorded_at  timestamptz not null default now()
);

-- 4. Tasks Table (Submissions & Supervisor Star Ratings)
create table if not exists tasks (
  id                  uuid primary key default gen_random_uuid(),
  submit_date         date not null default current_date,
  employee_id         text not null references employees(employee_id),
  tasks_assigned      integer not null default 0,
  tasks_completed     integer not null default 0,
  details             text,
  submission_link     text,
  star_rating         integer check (star_rating >= 1 and star_rating <= 5),
  supervisor_note     text,
  supervisor_id       text references employees(employee_id),
  rating_date         timestamptz,
  created_at          timestamptz not null default now()
);
create index if not exists idx_tasks_emp_date on tasks (employee_id, submit_date);

-- 5. Spot Checks Table
create table if not exists spot_checks (
  id                 uuid primary key default gen_random_uuid(),
  check_date         date not null default current_date,
  round              text not null, -- 'เช้า' / 'บ่าย'
  scheduled_time     time not null,
  employee_id        text not null references employees(employee_id),
  gps_lat            double precision,
  gps_lng            double precision,
  photo_url          text,
  actual_scan_time   timestamptz,
  result_status      text not null default 'Scheduled', -- 'Scheduled' / 'Pending' / 'Pass' / 'Fail' / 'Expired' / 'ไม่ผ่านการสุ่มตรวจ (เลยเวลา)' / 'ไม่ผ่านการสุ่มตรวจ (ขาดการติดต่อ)'
  created_at         timestamptz not null default now()
);
create index if not exists idx_spot_emp_date on spot_checks (employee_id, check_date);

-- 6. Tickets Table (Helpdesk & Automated Suspension tickets)
create table if not exists tickets (
  id             uuid primary key default gen_random_uuid(),
  employee_id    text not null references employees(employee_id),
  problem_type   text not null,
  description    text,
  status         text not null default 'Pending', -- 'Pending' / 'Resolved'
  admin_notes    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 7. App Configuration Table
create table if not exists app_config (
  key         text primary key,
  value       text not null,
  description text
);

-- 8. Login Attempts Table (Rate Limiting)
create table if not exists login_attempts (
  key           text primary key,
  attempts      integer not null default 0,
  locked_until  timestamptz
);

-- 9. Notifications Table (Real-time SSE Notification Bell System)
create table if not exists notifications (
  id            uuid primary key default gen_random_uuid(),
  employee_id   text not null references employees(employee_id),
  type          text not null, -- 'spotcheck' / 'task_rated' / 'ticket_created' / 'ticket_updated' / 'suspension' / 'missing_checkin'
  title         text not null,
  message       text not null,
  link          text, -- path e.g. /spotcheck, /tasks, /admin
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists idx_notifications_emp_read on notifications (employee_id, is_read, created_at desc);

-- 10. Attendance Summary Live SQL View
create or replace view attendance_summary_view as
select 
  e.employee_id,
  e.name,
  e.department,
  count(distinct c.log_date) filter (where c.log_type = 'เข้างาน') as total_checkin_days,
  count(distinct t.id) filter (where t.star_rating is not null) as total_evaluated_tasks,
  e.one_star_count,
  e.wfh_status
from employees e
left join checkin_logs c on e.employee_id = c.employee_id
left join tasks t on e.employee_id = t.employee_id
group by e.employee_id, e.name, e.department, e.one_star_count, e.wfh_status;
