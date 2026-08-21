'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, Users, Ticket as TicketIcon, Settings, Plus, 
  CheckCircle2, RefreshCw, X, Save, Edit3, Trash2, KeyRound, Sparkles, MapPin, Clock,
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Camera
} from 'lucide-react';
import { Employee, Ticket, AppConfig, CheckinLog } from '@/types';
import { useLanguage } from '@/lib/i18n';
import SelfieLightboxModal, { LightboxPhotoData } from '@/components/SelfieLightboxModal';

export default function AdminPage() {
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<'employees' | 'checkins' | 'tickets' | 'config'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allCheckins, setAllCheckins] = useState<(CheckinLog & { employee_name?: string })[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'attendance' | 'system'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(10);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // New Employee Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmpId, setNewEmpId] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newSupervisorId, setNewSupervisorId] = useState('');
  const [newRole, setNewRole] = useState<'employee' | 'supervisor' | 'admin'>('employee');

  // Edit Employee Form State
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editSupervisorId, setEditSupervisorId] = useState('');
  const [editRole, setEditRole] = useState<'employee' | 'supervisor' | 'admin'>('employee');

  // Ticket Resolution Modal
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [adminPreviewPhoto, setAdminPreviewPhoto] = useState<LightboxPhotoData | null>(null);

  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('all');
  const [empRoleFilter, setEmpRoleFilter] = useState('all');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchAdminData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const [eRes, cRes, tRes, confRes] = await Promise.all([
        fetch('/api/admin/employees'),
        fetch('/api/checkin?scope=all'),
        fetch('/api/admin/tickets'),
        fetch('/api/admin/config'),
      ]);

      if (eRes.ok) setEmployees((await eRes.json()).employees || []);
      if (cRes.ok) setAllCheckins((await cRes.json()).logs || []);
      if (tRes.ok) setTickets((await tRes.json()).tickets || []);
      if (confRes.ok) {
        const cData = await confRes.json();
        const confObj: Record<string, string> = {};
        (cData.configs || []).forEach((c: AppConfig) => {
          confObj[c.key] = c.value;
        });
        setConfigs(confObj);
      }
    } catch (err) {
      console.error('Fetch admin data error:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData(true);

    const interval = setInterval(() => {
      fetchAdminData(false);
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: newEmpId.trim(),
          name: newName.trim(),
          email: newEmail.trim() || undefined,
          department: newDepartment.trim() || undefined,
          position: newPosition.trim() || undefined,
          supervisor_id: newSupervisorId.trim() || undefined,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'สร้างพนักงานไม่สำเร็จ');
        setSubmitting(false);
        return;
      }

      setMessage(data.message || 'สร้างพนักงานสำเร็จ');
      setIsAddModalOpen(false);
      setNewEmpId('');
      setNewName('');
      setNewEmail('');
      setNewDepartment('');
      setNewPosition('');
      setNewSupervisorId('');
      fetchAdminData();
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (emp: Employee) => {
    setEditEmployee(emp);
    setEditName(emp.name);
    setEditEmail(emp.email || '');
    setEditDepartment(emp.department || '');
    setEditPosition((emp.position || '').replace(/\s*\[(Supervisor|Admin)\]/gi, '').replace(/\s*\(หัวหน้างาน\)/g, '').replace(/\s*\(Admin\)/g, '').trim());
    setEditSupervisorId(emp.supervisor_id || '');
    setEditRole(emp.role);
    setError('');
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmployee || submitting) return;

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: editEmployee.employee_id,
          name: editName.trim(),
          email: editEmail.trim() || null,
          department: editDepartment.trim() || null,
          position: editPosition.trim() || null,
          supervisor_id: editSupervisorId.trim() || null,
          role: editRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'แก้ไขข้อมูลพนักงานไม่สำเร็จ');
        setSubmitting(false);
        return;
      }

      setMessage(data.message || 'แก้ไขข้อมูลพนักงานสำเร็จ');
      setEditEmployee(null);
      fetchAdminData();
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (emp: Employee) => {
    if (submitting) return;
    if (!confirm(`คุณต้องการลบพนักงาน ${emp.name} (${emp.employee_id}) ใช่หรือไม่?`)) return;

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/admin/employees?employee_id=${emp.employee_id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'ลบพนักงานไม่สำเร็จ');
        setSubmitting(false);
        return;
      }

      setMessage(data.message || 'ลบพนักงานสำเร็จ');
      fetchAdminData();
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmployeeAction = async (employee_id: string, action: string, extra: Record<string, any> = {}) => {
    if (actionLoadingId) return;

    setActionLoadingId(`${employee_id}_${action}`);
    setError('');
    setMessage('');

    // Instant optimistic UI update
    if (action === 'update_wfh') {
      const newStatus = extra.wfh_status || 'เปิดสิทธิ์';
      setEmployees((prev) =>
        prev.map((emp) => (emp.employee_id === employee_id ? { ...emp, wfh_status: newStatus } : emp))
      );
    } else if (action === 'clear_stars') {
      setEmployees((prev) =>
        prev.map((emp) => (emp.employee_id === employee_id ? { ...emp, one_star_count: 0 } : emp))
      );
    }

    try {
      const res = await fetch('/api/admin/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id, action, ...extra }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'ดำเนินการล้มเหลว');
        fetchAdminData();
        return;
      }

      setMessage(data.message || 'บันทึกสำเร็จ');
      await fetchAdminData();
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      fetchAdminData();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTogglePhotoExempt = async (emp: Employee) => {
    const nextState = !emp.is_photo_exempt;
    const loadingKey = `${emp.employee_id}_photo_exempt`;
    setActionLoadingId(loadingKey);
    setError('');
    setMessage('');

    // Instant optimistic update
    setEmployees((prev) =>
      prev.map((e) =>
        e.employee_id === emp.employee_id ? { ...e, is_photo_exempt: nextState } : e
      )
    );

    try {
      const res = await fetch('/api/admin/employees/toggle-photo-exempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: emp.employee_id, is_exempt: nextState }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'เปลี่ยนสิทธิ์ยกเว้นถ่ายภาพไม่สำเร็จ');
        fetchAdminData();
        return;
      }

      setMessage(data.message || (lang === 'en' ? 'Photo exemption updated' : 'อัปเดตสิทธิ์ยกเว้นถ่ายภาพสำเร็จ'));
      await fetchAdminData();
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      fetchAdminData();
    } finally {
      setActionLoadingId(null);
    }
  };

  const openTicketModal = (t: Ticket) => {
    setSelectedTicket(t);
    setAdminNote(t.admin_notes || '');
    setError('');
    setMessage('');
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket || submitting) return;

    setSubmitting(true);
    setError('');
    setMessage('');

    const targetId = selectedTicket.id;
    const noteToSave = adminNote.trim() || 'แก้ไขเรียบร้อย';

    // Instant optimistic update
    setTickets((prev) =>
      prev.map((t) => (t.id === targetId ? { ...t, status: 'Resolved', admin_notes: noteToSave } : t))
    );

    try {
      const res = await fetch('/api/admin/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: targetId,
          status: 'Resolved',
          admin_notes: noteToSave,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'เกิดข้อผิดพลาดในการอัปเดต Ticket');
        fetchAdminData();
        return;
      }

      setMessage(data.message || 'บันทึกสถานะ Ticket ใน Google Sheet สำเร็จ');
      setSelectedTicket(null);
      setAdminNote('');
      await fetchAdminData();
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      fetchAdminData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveConfigs = async () => {
    if (submitting) return;

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'บันทึกการตั้งค่าเรียบร้อย');
      }
    } catch {
      setError('บันทึกการตั้งค่าไม่สำเร็จ');
    }
  };

  const pendingTickets = tickets.filter((t) => t.status === 'Pending').length;
  const supervisorsList = employees.filter((e) => e.role === 'supervisor' || e.role === 'admin');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
            <span>{t.admin.pageTitle}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">{t.admin.subtitle}</p>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <X className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 space-x-4 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('employees')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'employees'
              ? 'border-orange-500 text-orange-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t.admin.tabEmployees} ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('checkins')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'checkins'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t.admin.tabLogs} ({allCheckins.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'tickets'
              ? 'border-amber-500 text-amber-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <TicketIcon className="w-4 h-4" />
          <span>{t.admin.tabTickets} ({pendingTickets})</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'config'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>{t.admin.tabConfig}</span>
        </button>
      </div>

      {/* Tab 1: Employees Tab */}
      {activeTab === 'employees' && (() => {
        const adminAvailableDepts = Array.from(
          new Set(employees.map((e) => e.department).filter(Boolean))
        ).sort();

        const filteredEmployees = employees.filter((e) => {
          if (empDeptFilter !== 'all' && e.department !== empDeptFilter) return false;
          if (empRoleFilter !== 'all' && e.role !== empRoleFilter) return false;
          if (empSearchQuery.trim()) {
            const q = empSearchQuery.toLowerCase().trim();
            const matchId = e.employee_id.toLowerCase().includes(q);
            const matchName = e.name.toLowerCase().includes(q);
            const matchPos = (e.position || '').toLowerCase().includes(q);
            const matchEmail = (e.email || '').toLowerCase().includes(q);
            return matchId || matchName || matchPos || matchEmail;
          }
          return true;
        });

        const hasActiveEmpFilters = empSearchQuery !== '' || empDeptFilter !== 'all' || empRoleFilter !== 'all';

        return (
          <Card className="space-y-4 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">{t.admin.employeeListTitle}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lang === 'en'
                    ? `Showing ${filteredEmployees.length} of ${employees.length} employees`
                    : `แสดง ${filteredEmployees.length} จากทั้งหมด ${employees.length} คน`}
                </p>
              </div>

              <Button onClick={() => setIsAddModalOpen(true)} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-bold gap-1.5 shadow-sm cursor-pointer self-start sm:self-auto">
                <Plus className="w-4 h-4" />
                <span>{t.admin.addEmployeeBtn}</span>
              </Button>
            </div>

            {/* Quick Search & Department Filters Toolbar */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={empSearchQuery}
                  onChange={(e) => setEmpSearchQuery(e.target.value)}
                  placeholder={lang === 'en' ? 'Search employee name, ID, position, or email...' : 'ค้นหาชื่อ, รหัสพนักงาน 4 หลัก, ตำแหน่ง หรืออีเมล...'}
                  className="w-full pl-9.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-orange-500 transition-colors"
                />
                {empSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setEmpSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Department Dropdown Filter */}
                <select
                  value={empDeptFilter}
                  onChange={(e) => setEmpDeptFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-orange-500 shadow-2xs cursor-pointer"
                >
                  <option value="all">{lang === 'en' ? '🏢 Dept: All' : '🏢 แผนก: ทั้งหมด'}</option>
                  {adminAvailableDepts.map((dept) => (
                    <option key={dept} value={dept as string}>
                      {dept}
                    </option>
                  ))}
                </select>

                {/* Role Filter */}
                <select
                  value={empRoleFilter}
                  onChange={(e) => setEmpRoleFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-orange-500 shadow-2xs cursor-pointer"
                >
                  <option value="all">{lang === 'en' ? '👤 Role: All' : '👤 สิทธิ์: ทั้งหมด'}</option>
                  <option value="employee">{lang === 'en' ? 'Employee (พนักงาน)' : 'พนักงาน (Employee)'}</option>
                  <option value="supervisor">{lang === 'en' ? 'Supervisor (หัวหน้างาน)' : 'หัวหน้างาน (Supervisor)'}</option>
                  <option value="admin">{lang === 'en' ? 'Admin (ผู้ดูแลระบบ)' : 'ผู้ดูแลระบบ (Admin)'}</option>
                </select>

                {hasActiveEmpFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmpSearchQuery('');
                      setEmpDeptFilter('all');
                      setEmpRoleFilter('all');
                    }}
                    className="px-3 py-2 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{lang === 'en' ? 'Reset' : 'ล้างตัวกรอง'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">{t.admin.thEmpId}</th>
                    <th className="px-4 py-3.5">{t.admin.thName}</th>
                    <th className="px-4 py-3.5">{t.admin.thPosition}</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">{t.admin.thSupervisor}</th>
                    <th className="px-4 py-3.5">{t.admin.thEmail}</th>
                    <th className="px-4 py-3.5">{t.admin.thRole}</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">{lang === 'en' ? 'Photo Exempt' : 'ยกเว้นถ่ายภาพ'}</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap">{t.admin.thStars}</th>
                    <th className="px-4 py-3.5 whitespace-nowrap">{t.admin.thWfhStatus}</th>
                    <th className="px-4 py-3.5 text-right min-w-[320px]">{t.admin.thActions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredEmployees.map((emp) => {
                  const isExempt = !!emp.is_photo_exempt;
                  const isToggling = actionLoadingId === `${emp.employee_id}_photo_exempt`;

                  return (
                    <tr key={emp.employee_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">{emp.employee_id}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">{emp.name}</td>
                      <td className="px-4 py-3.5 text-slate-600 min-w-[180px]">{(emp.position || '-').replace(/\s*\[(Supervisor|Admin)\]/gi, '').replace(/\s*\(หัวหน้างาน\)/g, '').replace(/\s*\(Admin\)/g, '').trim()} / {emp.department || '-'}</td>
                      <td className="px-4 py-3.5 text-slate-600 font-medium whitespace-nowrap">
                        {emp.supervisor_id ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] whitespace-nowrap shadow-2xs">
                            {supervisorsList.find((s) => s.employee_id === emp.supervisor_id)?.name || emp.supervisor_id}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 font-mono">{emp.email || '-'}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant={emp.role === 'admin' ? 'default' : emp.role === 'supervisor' ? 'warning' : 'success'}>
                          {emp.role}
                        </Badge>
                      </td>
                      {/* Photo Exemption Toggle Switch */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleTogglePhotoExempt(emp)}
                          disabled={submitting || Boolean(actionLoadingId)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer shadow-2xs ${
                            isExempt
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                          }`}
                          title={lang === 'en' ? 'Click to toggle photo exemption' : 'คลิกเพื่อเปิด/ปิดสิทธิ์ยกเว้นถ่ายภาพ'}
                        >
                          <span className={`w-2 h-2 rounded-full ${isExempt ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          <span>
                            {isToggling
                              ? (lang === 'en' ? 'Saving...' : 'กำลังบันทึก...')
                              : isExempt
                              ? (lang === 'en' ? '🛡️ Exempt (ON)' : '🛡️ ยกเว้น (เปิด)')
                              : (lang === 'en' ? '📷 Required (OFF)' : '📷 บังคับถ่าย (ปิด)')}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-amber-600">{emp.one_star_count} ครั้ง</td>
                      <td className="px-4 py-3.5">
                        <Badge variant={emp.wfh_status === 'เปิดสิทธิ์' ? 'success' : 'destructive'}>
                          {emp.wfh_status}
                        </Badge>
                      </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={submitting || Boolean(actionLoadingId)}
                          onClick={() => openEditModal(emp)}
                          className="h-8 px-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                          title="แก้ไขข้อมูลพนักงาน"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          <span>แก้ไข</span>
                        </button>

                        {emp.one_star_count > 0 && (
                          <button
                            type="button"
                            disabled={submitting || Boolean(actionLoadingId)}
                            onClick={() => handleEmployeeAction(emp.employee_id, 'clear_stars')}
                            className="h-8 px-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                            title="ล้างดาวสะสม 1-ดาว"
                          >
                            <Sparkles className={`w-3.5 h-3.5 text-amber-600 ${actionLoadingId === `${emp.employee_id}_clear_stars` ? 'animate-spin' : ''}`} />
                            <span>{actionLoadingId === `${emp.employee_id}_clear_stars` ? 'กำลังล้าง...' : 'ล้างดาว'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={submitting || Boolean(actionLoadingId)}
                          onClick={() => handleEmployeeAction(emp.employee_id, 'update_wfh', { wfh_status: emp.wfh_status === 'เปิดสิทธิ์' ? 'ระงับสิทธิ์' : 'เปิดสิทธิ์' })}
                          className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                          title="สลับสิทธิ์การทำงาน WFH"
                        >
                          <span>{actionLoadingId === `${emp.employee_id}_update_wfh` ? 'กำลังสลับ...' : 'สลับสิทธิ์'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={submitting || Boolean(actionLoadingId)}
                          onClick={() => handleEmployeeAction(emp.employee_id, 'reset_pin', { reset_pin: true })}
                          className="h-8 px-2.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          title="รีเซ็ต PIN เป็น 1234"
                        >
                          <KeyRound className={`w-3.5 h-3.5 text-orange-500 ${actionLoadingId === `${emp.employee_id}_reset_pin` ? 'animate-spin' : ''}`} />
                          <span>{actionLoadingId === `${emp.employee_id}_reset_pin` ? 'กำลังรีเซ็ต...' : 'รีเซ็ต PIN'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={submitting || Boolean(actionLoadingId)}
                          onClick={() => handleDeleteEmployee(emp)}
                          className="h-8 w-8 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:opacity-50"
                          title="ลบพนักงาน"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </Card>
      );
    })()}

      {/* Tab 2: All Check-in & System Logs */}
      {activeTab === 'checkins' && (() => {
        const filteredLogs = allCheckins.filter((l) => {
          if (logFilter === 'attendance' && !['เข้างาน', 'ออกงาน', 'ยืนยันตัวตน'].includes(l.log_type)) return false;
          if (logFilter === 'system' && ['เข้างาน', 'ออกงาน', 'ยืนยันตัวตน'].includes(l.log_type)) return false;

          if (logSearch.trim()) {
            const q = logSearch.toLowerCase().trim();
            const matchEmp = (l.employee_name || '').toLowerCase().includes(q) || l.employee_id.toLowerCase().includes(q);
            const matchType = (l.log_type || '').toLowerCase().includes(q);
            const matchNote = (l.note || '').toLowerCase().includes(q);
            const matchStatus = (l.verification_status || '').toLowerCase().includes(q);
            return matchEmp || matchType || matchNote || matchStatus;
          }
          return true;
        });

        const totalLogPages = Math.max(1, Math.ceil(filteredLogs.length / logPageSize));
        const safeLogPage = Math.min(Math.max(1, logPage), totalLogPages);
        const pagedLogs = filteredLogs.slice((safeLogPage - 1) * logPageSize, safeLogPage * logPageSize);
        const startIndex = filteredLogs.length === 0 ? 0 : (safeLogPage - 1) * logPageSize + 1;
        const endIndex = Math.min(safeLogPage * logPageSize, filteredLogs.length);

        return (
          <Card className="p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <span>ประวัติ Log การลงเวลาและกิจกรรมระบบทั้งหมด (ทั้งบริษัท)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">รวมประวัติการบันทึกเวลาเข้า-ออกงาน การยืนยันตัวตน และ Audit Log จาก Google Sheet</p>
              </div>

              {/* Filter Toggle Pills */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => { setLogFilter('all'); setLogPage(1); }}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                    logFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ทั้งหมด ({allCheckins.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setLogFilter('attendance'); setLogPage(1); }}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                    logFilter === 'attendance'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  เฉพาะลงเวลา ({allCheckins.filter((l) => ['เข้างาน', 'ออกงาน', 'ยืนยันตัวตน'].includes(l.log_type)).length})
                </button>
                <button
                  type="button"
                  onClick={() => { setLogFilter('system'); setLogPage(1); }}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                    logFilter === 'system'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  กิจกรรมระบบ ({allCheckins.filter((l) => !['เข้างาน', 'ออกงาน', 'ยืนยันตัวตน'].includes(l.log_type)).length})
                </button>
              </div>
            </div>

            {/* Search & Page Size Control Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/80 p-2.5 rounded-2xl border border-slate-200">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => {
                    setLogSearch(e.target.value);
                    setLogPage(1);
                  }}
                  placeholder="ค้นหาชื่อ, รหัส, สถานะ, หมายเหตุ..."
                  className="w-full pl-8.5 pr-8 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 font-medium"
                />
                {logSearch && (
                  <button
                    type="button"
                    onClick={() => { setLogSearch(''); setLogPage(1); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 shrink-0">
                <span className="font-medium">แสดง:</span>
                <select
                  value={logPageSize}
                  onChange={(e) => {
                    setLogPageSize(Number(e.target.value));
                    setLogPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-emerald-500 text-xs"
                >
                  <option value={10}>10 รายการ / หน้า</option>
                  <option value={20}>20 รายการ / หน้า</option>
                  <option value={50}>50 รายการ / หน้า</option>
                  <option value={100}>100 รายการ / หน้า</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">พนักงาน</th>
                    <th className="px-4 py-3.5">ประเภทรายการ</th>
                    <th className="px-4 py-3.5">เวลาลงบันทึก</th>
                    <th className="px-4 py-3.5">สถานะพิกัด GPS</th>
                    <th className="px-4 py-3.5">พิกัด Lat, Lng</th>
                    <th className="px-4 py-3.5">หมายเหตุ</th>
                    <th className="px-4 py-3.5 text-right">รูปถ่าย Selfie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {pagedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                        {logSearch ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา' : 'ไม่มีรายการประวัติในหมวดหมู่นี้'}
                      </td>
                    </tr>
                  ) : (
                    pagedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900">{log.employee_name || log.employee_id}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {log.employee_id}</div>
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {log.log_type === 'เข้างาน' ? (
                            <Badge variant="success">เข้างาน</Badge>
                          ) : log.log_type === 'ออกงาน' ? (
                            <Badge variant="destructive">ออกงาน</Badge>
                          ) : log.log_type === 'ยืนยันตัวตน' ? (
                            <Badge variant="default">ยืนยันตัวตน</Badge>
                          ) : log.log_type === 'แก้ไขประวัติ' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              แก้ไขประวัติ
                            </span>
                          ) : log.log_type === 'เปลี่ยน PIN' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              เปลี่ยน PIN
                            </span>
                          ) : (
                            <Badge variant="warning">{log.log_type}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-700 font-bold">
                          {new Date(log.log_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} น.
                          <div className="text-[10px] text-slate-400 font-normal">{log.log_date}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          {['เข้างาน', 'ออกงาน', 'ยืนยันตัวตน'].includes(log.log_type) ? (
                            <Badge variant={log.verification_status === 'ปฏิบัติงานที่ออฟฟิศ' ? 'success' : 'default'}>
                              {log.verification_status}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-slate-500 text-[11px]">
                          {log.gps_lat && log.gps_lng ? (
                            <a
                              href={`https://www.google.com/maps?q=${log.gps_lat},${log.gps_lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-blue-600 font-bold hover:underline bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 transition-colors shadow-2xs"
                              title={`ดูพิกัด GPS บน Google Maps (${log.gps_lat}, ${log.gps_lng})`}
                            >
                              <MapPin className="w-3 h-3 text-blue-500" />
                              <span>{log.gps_lat.toFixed(4)}, {log.gps_lng.toFixed(4)} ↗</span>
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{log.note || '-'}</td>
                        <td className="px-4 py-3.5 text-right">
                          {log.photo_url ? (
                            <button
                              type="button"
                              onClick={() =>
                                setAdminPreviewPhoto({
                                  url: log.photo_url!,
                                  name: log.employee_name || log.employee_id,
                                  employee_id: log.employee_id,
                                  time: new Date(log.log_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
                                  date: log.log_date,
                                  type: log.log_type,
                                  status: log.verification_status,
                                  gps_lat: log.gps_lat,
                                  gps_lng: log.gps_lng,
                                  note: log.note,
                                })
                              }
                              className="text-xs text-orange-700 font-bold hover:bg-orange-100 border border-orange-200 bg-orange-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 transition-all shadow-2xs hover:scale-105 cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5 text-orange-600" />
                              <span>ดูรูปถ่าย Selfie</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">- (ไม่มีไฟล์รูป)</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs text-slate-600">
              <div className="font-medium text-slate-500">
                แสดงรายการที่ <span className="font-bold text-slate-900">{startIndex}</span> - <span className="font-bold text-slate-900">{endIndex}</span> จากทั้งหมด <span className="font-bold text-slate-900">{filteredLogs.length}</span> รายการ
              </div>

              {totalLogPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safeLogPage <= 1}
                    onClick={() => setLogPage(1)}
                    className="h-8 w-8 p-0 rounded-lg"
                    title="หน้าแรกสุด"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safeLogPage <= 1}
                    onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>ก่อนหน้า</span>
                  </Button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalLogPages }, (_, i) => i + 1)
                      .filter((p) => {
                        // Show current, first, last, and immediate neighbors
                        return p === 1 || p === totalLogPages || Math.abs(p - safeLogPage) <= 1;
                      })
                      .map((p, idx, arr) => {
                        const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <div key={p} className="flex items-center gap-1">
                            {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                            <button
                              type="button"
                              onClick={() => setLogPage(p)}
                              className={`h-8 w-8 rounded-lg font-bold text-xs transition-all ${
                                safeLogPage === p
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {p}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safeLogPage >= totalLogPages}
                    onClick={() => setLogPage((p) => Math.min(totalLogPages, p + 1))}
                    className="h-8 px-2.5 rounded-lg text-xs font-bold gap-1"
                  >
                    <span>ถัดไป</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safeLogPage >= totalLogPages}
                    onClick={() => setLogPage(totalLogPages)}
                    className="h-8 w-8 p-0 rounded-lg"
                    title="หน้าสุดท้าย"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        );
      })()}

      {/* Tab 3: Tickets Tab */}
      {activeTab === 'tickets' && (
        <Card className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TicketIcon className="w-5 h-5 text-orange-500" />
                <span>รายการ Ticket แจ้งปัญหาจากพนักงาน</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">รวมรายการแจ้งปัญหาการใช้งาน พิกัด GPS หรือขอความช่วยเหลือจากพนักงาน</p>
            </div>
          </div>

          <div className="space-y-3">
            {tickets.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                ไม่มีรายการ Ticket แจ้งปัญหาในขณะนี้
              </div>
            ) : (
              tickets.map((t) => (
                <div key={t.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{t.employee_name}</span>
                        <span className="text-[11px] font-mono text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          ID: {t.employee_id}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        หมวดหมู่: <span className="font-bold text-slate-700">{t.problem_type}</span>
                      </div>
                    </div>

                    <div>
                      {t.status === 'Resolved' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>ปิดเรื่องแล้ว (Resolved)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>รอดำเนินการ (Pending)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <p className="text-slate-800 font-medium whitespace-pre-wrap">{t.description || '(ไม่มีรายละเอียดเพิ่มเติม)'}</p>
                  </div>

                  {t.admin_notes && (
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-[11px]">
                      <span className="font-bold text-emerald-900">💬 บันทึกจากแอดมิน: </span>
                      <span className="text-emerald-800 font-medium">{t.admin_notes}</span>
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' น.' : '-'}
                    </span>

                    {t.status === 'Pending' ? (
                      <Button
                        onClick={() => openTicketModal(t)}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 px-4 py-2 rounded-xl shadow-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>ตอบกลับ & ปิดตั๋วปัญหา</span>
                      </Button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openTicketModal(t)}
                        className="text-[11px] text-slate-500 hover:text-slate-900 underline font-medium cursor-pointer"
                      >
                        แก้ไขบันทึกแอดมิน
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Tab 4: Config Tab (Admin Only) */}
      {activeTab === 'config' && (
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">ตั้งค่าพารามิเตอร์ระบบ (System Configurations)</h3>
              <p className="text-xs text-slate-500">กำหนดพิกัดออฟฟิศ รัศมี และตำแหน่งที่ได้รับการยกเว้นไม่ต้องถ่ายภาพเซลฟี่</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Office Latitude (พิกัดละติจูด)</label>
              <input
                type="text"
                value={configs.office_lat || '12.736929'}
                onChange={(e) => setConfigs({ ...configs, office_lat: e.target.value })}
                placeholder="เช่น 12.736929"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Office Longitude (พิกัดลองจิจูด)</label>
              <input
                type="text"
                value={configs.office_lng || '101.114387'}
                onChange={(e) => setConfigs({ ...configs, office_lng: e.target.value })}
                placeholder="เช่น 101.114387"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">รัศมีพิกัดออฟฟิศที่อนุญาต (เมตร)</label>
              <input
                type="text"
                value={configs.max_allowed_radius_meters || '200'}
                onChange={(e) => setConfigs({ ...configs, max_allowed_radius_meters: e.target.value })}
                placeholder="เช่น 200"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-orange-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">หากพนักงานเช็คอินในรัศมีนี้ ระบบจะถือว่า &quot;ปฏิบัติงานที่ออฟฟิศ&quot; อัตโนมัติ</p>
            </div>

            {/* Master Switch: Auto-Exempt Supervisors / Admins */}
            <div className="md:col-span-2 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{lang === 'en' ? 'Auto-Exempt Supervisors & Admins' : 'สวิตช์หลัก: ยกเว้นอัตโนมัติสำหรับระดับหัวหน้างานและ Admin'}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {lang === 'en'
                    ? 'When enabled, all employees with Role Supervisor or Admin are automatically exempt from live selfies.'
                    : 'เมื่อเปิดใช้งาน พนักงานทุกคนที่มีสิทธิ์ระดับหัวหน้างาน (Supervisor) หรือ Admin จะได้รับการยกเว้นถ่ายภาพ Selfie อัตโนมัติ'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const current = configs.auto_exempt_supervisors !== 'false';
                  setConfigs({ ...configs, auto_exempt_supervisors: current ? 'false' : 'true' });
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  configs.auto_exempt_supervisors !== 'false' ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    configs.auto_exempt_supervisors !== 'false' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Information Notice for Per-Employee Photo Exemption Toggle */}
            <div className="md:col-span-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-orange-100 text-orange-600 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="text-xs space-y-1">
                <div className="font-bold text-slate-900">
                  {lang === 'en' ? 'Per-Employee Photo Exemption Control' : 'การจัดการสิทธิ์ยกเว้นถ่ายภาพแบบรายบุคคล'}
                </div>
                <p className="text-slate-500 leading-relaxed text-[11px]">
                  {lang === 'en'
                    ? 'You can toggle photo exemption ON or OFF for any individual employee directly from the "Manage Employees" table tab.'
                    : 'แอดมินสามารถเปิดหรือปิดสิทธิ์ยกเว้นการถ่ายภาพ Selfie ให้พนักงานแต่ละคนได้อย่างอิสระผ่านสวิตช์ [ 🛡️ ยกเว้น (เปิด) / 📷 บังคับถ่าย (ปิด) ] ในแท็บตาราง "จัดการรายชื่อพนักงาน"'}
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSaveConfigs}
            disabled={submitting}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold gap-2 flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึกการตั้งค่า...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกการตั้งค่าระบบลง Google Sheets</span>
              </>
            )}
          </Button>
        </Card>
      )}

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <Card className="w-full max-w-lg p-6 relative border-slate-200 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-500" />
              <span>เพิ่มพนักงานใหม่</span>
            </h3>

            <form onSubmit={handleCreateEmployee} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">รหัสพนักงาน (4 หลัก) *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={newEmpId}
                    onChange={(e) => setNewEmpId(e.target.value)}
                    placeholder="เช่น 1003"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="นาย สมศักดิ์ ใจดี"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">อีเมลพนักงาน</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="somsak@company.com"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ตำแหน่งงาน</label>
                  <input
                    type="text"
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    placeholder="เช่น Senior Developer"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">แผนก / ฝ่าย</label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    placeholder="เช่น Software Engineering"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">หัวหน้างานผู้ควบคุม</label>
                  <select
                    value={newSupervisorId}
                    onChange={(e) => setNewSupervisorId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-orange-500"
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    {supervisorsList.map((sup) => (
                      <option key={sup.employee_id} value={sup.employee_id}>
                        {sup.name} ({sup.employee_id}) [{sup.role}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">บทบาท (Role) *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-orange-500"
                  >
                    <option value="employee">Employee (พนักงาน)</option>
                    <option value="supervisor">Supervisor (หัวหน้างาน)</option>
                    <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                  </select>
                </div>
              </div>

              <Button type="submit" disabled={submitting} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 mt-3 flex items-center justify-center gap-2">
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังบันทึกพนักงานใหม่...</span>
                  </>
                ) : (
                  <span>บันทึกพนักงานใหม่ (PIN: 1234)</span>
                )}
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <Card className="w-full max-w-lg p-6 relative border-slate-200 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => !submitting && setEditEmployee(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-orange-500" />
              <span>แก้ไขข้อมูลพนักงาน (ID: {editEmployee.employee_id})</span>
            </h3>

            <form onSubmit={handleUpdateEmployee} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">อีเมลพนักงาน</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ตำแหน่งงาน</label>
                  <input
                    type="text"
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">แผนก / ฝ่าย</label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">หัวหน้างานผู้ควบคุม</label>
                  <select
                    value={editSupervisorId}
                    onChange={(e) => setEditSupervisorId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-orange-500"
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    {supervisorsList
                      .filter((s) => s.employee_id !== editEmployee.employee_id)
                      .map((sup) => (
                        <option key={sup.employee_id} value={sup.employee_id}>
                          {sup.name} ({sup.employee_id}) [{sup.role}]
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">บทบาท (Role) *</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-orange-500"
                  >
                    <option value="employee">Employee (พนักงาน)</option>
                    <option value="supervisor">Supervisor (หัวหน้างาน)</option>
                    <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" disabled={submitting} onClick={() => setEditEmployee(null)} className="w-1/2">
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={submitting} className="w-1/2 bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center justify-center gap-2">
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>บันทึกการแก้ไข</span>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Resolve Ticket Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <Card className="w-full max-w-md p-6 relative border-emerald-300 bg-white shadow-2xl space-y-4">
            <button
              onClick={() => !submitting && setSelectedTicket(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>บันทึกการแก้ไขปัญหา Ticket</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                พนักงาน: <span className="font-bold text-slate-800">{selectedTicket.employee_name}</span> ({selectedTicket.employee_id}) — {selectedTicket.problem_type}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
              <span className="font-bold text-slate-900 block mb-0.5">รายละเอียดปัญหา:</span>
              <p className="whitespace-pre-wrap">{selectedTicket.description || '-'}</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 text-xs mb-1.5">
                บันทึกวิธีแก้ไขจากแอดมิน (Admin Notes) *
              </label>
              <textarea
                rows={4}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="เช่น แอดมินรับทราบและแก้ไขปัญหาให้เรียบร้อยแล้ว..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => setSelectedTicket(null)}
                className="w-1/2"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={handleResolveTicket}
                disabled={submitting}
                className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <span>บันทึกและปิดตั๋ว</span>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Selfie Lightbox Modal */}
      <SelfieLightboxModal photo={adminPreviewPhoto} onClose={() => setAdminPreviewPhoto(null)} />
    </div>
  );
}
