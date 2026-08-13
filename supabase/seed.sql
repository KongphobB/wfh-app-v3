-- ========================================================
-- WFH App v3 - Seed Initial Data
-- Default PIN for all seed users is '1234'
-- Valid bcrypt hash for '1234': $2b$10$sODvIkDh5neT9nAyDod9geBEhNGmOddwTr5Bivne8v3HeorZMXMVC
-- ========================================================

-- Initial System Configuration
insert into app_config (key, value, description) values
  ('office_lat', '13.7563', 'Office latitude coordinate'),
  ('office_lng', '100.5018', 'Office longitude coordinate'),
  ('max_allowed_radius_meters', '500', 'Maximum radius in meters for office checkin verification'),
  ('spot_check_morning_time', '10:00', 'Morning spot check scheduled time'),
  ('spot_check_afternoon_time', '15:00', 'Afternoon spot check scheduled time'),
  ('suspension_threshold_stars', '3', 'Number of 1-star ratings required to suspend WFH privilege')
on conflict (key) do update set value = excluded.value;

-- Initial Seed Employees (PIN: 1234)
insert into employees (employee_id, name, email, department, position, supervisor_id, pin_hash, role, force_pin_change) values
  ('0001', 'ผู้ดูแลระบบ (Admin)', 'admin@company.com', 'IT & Operations', 'System Administrator', null, '$2b$10$sODvIkDh5neT9nAyDod9geBEhNGmOddwTr5Bivne8v3HeorZMXMVC', 'admin', false),
  ('0002', 'หัวหน้างาน (Supervisor)', 'supervisor@company.com', 'Software Engineering', 'Team Lead / Manager', null, '$2b$10$sODvIkDh5neT9nAyDod9geBEhNGmOddwTr5Bivne8v3HeorZMXMVC', 'supervisor', false),
  ('1001', 'พนักงาน สมชาย (Developer)', 'somchai@company.com', 'Software Engineering', 'Senior Developer', '0002', '$2b$10$sODvIkDh5neT9nAyDod9geBEhNGmOddwTr5Bivne8v3HeorZMXMVC', 'employee', false),
  ('1002', 'พนักงาน สมหญิง (Graphic Designer)', 'somying@company.com', 'Design', 'UI Designer', '0002', '$2b$10$sODvIkDh5neT9nAyDod9geBEhNGmOddwTr5Bivne8v3HeorZMXMVC', 'employee', false)
on conflict (employee_id) do update set pin_hash = excluded.pin_hash;
