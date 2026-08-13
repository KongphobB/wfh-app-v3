-- ========================================================
-- WFH App v3 - Seed Initial Data
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

-- System Administrator (ก้องภพ บุญชู)
insert into employees (employee_id, name, email, department, position, supervisor_id, role, wfh_status, force_pin_change) values
  ('1304', 'ก้องภพ บุญชู', 'kongphopb38@gmail.com', 'Project', 'System Administrator & Developer', null, 'admin', 'เปิดสิทธิ์', false)
on conflict (employee_id) do update set role = 'admin';
