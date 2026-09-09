'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, Users, Ticket as TicketIcon, Settings, Plus, 
  CheckCircle2, RefreshCw, X, Save, Edit3, Trash2, KeyRound, Sparkles, MapPin, Clock,
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Camera, MessageSquarePlus, Shield,
  Calendar, Palmtree, FileText, Upload, Download, Eye, ExternalLink, History, ScrollText, Activity, ShieldAlert
} from 'lucide-react';
import { Employee, Ticket, AppConfig, CheckinLog, SuggestionItem, SuggestionStatus, CompanyHoliday, HolidayPolicyDoc, AuditLogItem } from '@/types';
import { useLanguage } from '@/lib/i18n';
import SelfieLightboxModal, { LightboxPhotoData } from '@/components/SelfieLightboxModal';

export default function AdminPage() {
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<'employees' | 'checkins' | 'tickets' | 'suggestions' | 'holidays' | 'audit' | 'config'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allCheckins, setAllCheckins] = useState<(CheckinLog & { employee_name?: string })[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'attendance' | 'system'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(10);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionItem | null>(null);
  const [sugStatus, setSugStatus] = useState<SuggestionStatus>('New');
  const [sugAdminNote, setSugAdminNote] = useState('');
  const [sugCategoryFilter, setSugCategoryFilter] = useState('all');

  // Holidays state
  const [adminHolidays, setAdminHolidays] = useState<CompanyHoliday[]>([]);
  const [adminPolicyDoc, setAdminPolicyDoc] = useState<HolidayPolicyDoc | null>(null);
  const [isAddHolOpen, setIsAddHolOpen] = useState(false);
  const [newHolDate, setNewHolDate] = useState('');
  const [newHolName, setNewHolName] = useState('');
  const [newHolNameEn, setNewHolNameEn] = useState('');
  const [newHolNotes, setNewHolNotes] = useState('');
  const [isUploadPolicyOpen, setIsUploadPolicyOpen] = useState(false);
  const [policyFileName, setPolicyFileName] = useState('');
  const [policyFileUrl, setPolicyFileUrl] = useState('');
  const [policyFileType, setPolicyFileType] = useState<'pdf' | 'image' | 'link'>('pdf');
  const [policyFileSize, setPolicyFileSize] = useState('');

  // Audit Trail state
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');

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
      const [eRes, cRes, tRes, confRes, sugRes, holRes, auditRes] = await Promise.all([
        fetch('/api/admin/employees'),
        fetch('/api/checkin?scope=all'),
        fetch('/api/admin/tickets'),
        fetch('/api/admin/config'),
        fetch('/api/suggestions'),
        fetch('/api/holidays'),
        fetch('/api/admin/audit'),
      ]);

      if (eRes.ok) setEmployees((await eRes.json()).employees || []);
      if (cRes.ok) setAllCheckins((await cRes.json()).logs || []);
      if (tRes.ok) setTickets((await tRes.json()).tickets || []);
      if (sugRes.ok) setSuggestions((await sugRes.json()).data || []);
      if (holRes.ok) {
        const hData = await holRes.json();
        setAdminHolidays(hData.holidays || []);
        setAdminPolicyDoc(hData.policyDoc || null);
        if (hData.policyDoc) {
          setPolicyFileName(hData.policyDoc.file_name || '');
          setPolicyFileUrl(hData.policyDoc.file_url || '');
          setPolicyFileType(hData.policyDoc.file_type || 'pdf');
          setPolicyFileSize(hData.policyDoc.file_size || '');
        }
      }
      if (auditRes.ok) setAuditLogs((await auditRes.json()).logs || []);
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

  const handleUpdateSuggestion = async () => {
    if (!selectedSuggestion || submitting) return;

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/suggestions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedSuggestion.id,
          status: sugStatus,
          admin_note: sugAdminNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ');
      }

      setMessage(data.message || 'บันทึกสถานะข้อเสนอแนะสำเร็จ');
      setSelectedSuggestion(null);
      await fetchAdminData();
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newHolDate,
          name: newHolName.trim(),
          name_en: newHolNameEn.trim() || undefined,
          notes: newHolNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'เพิ่มวันหยุดไม่สำเร็จ');
      }

      setMessage(data.message || 'เพิ่มวันหยุดเรียบร้อย');
      setIsAddHolOpen(false);
      setNewHolDate('');
      setNewHolName('');
      setNewHolNameEn('');
      setNewHolNotes('');
      await fetchAdminData();
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleHoliday = async (hol: CompanyHoliday) => {
    try {
      const res = await fetch('/api/holidays', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: hol.id,
          is_active: !hol.is_active,
        }),
      });

      if (res.ok) {
        await fetchAdminData();
      }
    } catch (err) {
      console.error('Toggle holiday error:', err);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('คุณต้องการลบวันหยุดนี้ใช่หรือไม่?')) return;

    try {
      const res = await fetch(`/api/holidays?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMessage('ลบวันหยุดเรียบร้อยแล้ว');
        await fetchAdminData();
      }
    } catch (err) {
      console.error('Delete holiday error:', err);
    }
  };

  const handleSavePolicyDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/holidays', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'policy_doc',
          policyDoc: {
            file_name: policyFileName.trim(),
            file_url: policyFileUrl.trim(),
            file_type: policyFileType,
            file_size: policyFileSize.trim() || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'อัปเดตไฟล์ประกาศไม่สำเร็จ');
      }

      setMessage(data.message || 'บันทึกไฟล์ประกาศวันหยุดสำเร็จ');
      setIsUploadPolicyOpen(false);
      await fetchAdminData();
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
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
          onClick={() => setActiveTab('suggestions')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'suggestions'
              ? 'border-teal-600 text-teal-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>ข้อเสนอแนะ ({suggestions.filter((s) => s.status === 'New').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('holidays')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'holidays'
              ? 'border-orange-600 text-orange-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Palmtree className="w-4 h-4" />
          <span>วันหยุด & ประกาศ ({adminHolidays.filter((h) => h.is_active).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>{t.audit.tabTitle} ({auditLogs.length})</span>
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

      {/* Tab 5: Suggestions Tab */}
      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          <Card className="glass-card shadow-sm border border-slate-200">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquarePlus className="w-5 h-5 text-teal-600" />
                  <span>กล่องรับฟังข้อเสนอแนะ ({suggestions.length} รายการ)</span>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  ข้อเสนอแนะและไอเดียการปรับปรุงการทำงานจากพนักงาน
                </p>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">หมวดหมู่:</span>
                <select
                  value={sugCategoryFilter}
                  onChange={(e) => setSugCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="การทำงาน WFH">การทำงาน WFH</option>
                  <option value="ระบบและอุปกรณ์">ระบบและอุปกรณ์</option>
                  <option value="ทั่วไป">ทั่วไป</option>
                  <option value="สวัสดิการและสถานที่">สวัสดิการและสถานที่</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {(() => {
                const filtered = suggestions.filter(
                  (s) => sugCategoryFilter === 'all' || s.category === sugCategoryFilter
                );

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center text-xs text-slate-500">
                      <MessageSquarePlus className="w-10 h-10 text-slate-300 mx-auto mb-2 opacity-80" />
                      <p>ยังไม่มีข้อเสนอแนะในหมวดหมู่นี้</p>
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filtered.map((sug) => (
                      <div key={sug.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900">{sug.topic}</span>
                            <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-800">
                              {sug.category}
                            </Badge>
                            {sug.is_anonymous ? (
                              <Badge variant="default" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 text-[10px] gap-1">
                                <Shield className="w-3 h-3" />
                                <span>ไม่ระบุตัวตน</span>
                              </Badge>
                            ) : (
                              <Badge variant="default" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                {sug.employee_name} ({sug.employee_id})
                              </Badge>
                            )}

                            {sug.status === 'New' && (
                              <Badge variant="warning" className="text-[10px] bg-amber-500 text-white">รับเรื่องใหม่</Badge>
                            )}
                            {sug.status === 'In Progress' && (
                              <Badge variant="default" className="text-[10px] bg-blue-600">กำลังดำเนินการ</Badge>
                            )}
                            {sug.status === 'Resolved' && (
                              <Badge variant="success" className="text-[10px] bg-emerald-600">ดำเนินการเรียบร้อย</Badge>
                            )}
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                            {sug.content}
                          </p>

                          {sug.admin_note && (
                            <p className="text-[11px] text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/30 p-2.5 rounded-xl border border-teal-100 dark:border-teal-900/40 font-medium">
                              <strong>ตอบรับจากแอดมิน:</strong> {sug.admin_note}
                            </p>
                          )}

                          <span className="text-[10px] text-slate-400 font-mono block">
                            ส่งเมื่อ: {new Date(sug.created_at).toLocaleString('th-TH')}
                          </span>
                        </div>

                        <div className="shrink-0">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setSelectedSuggestion(sug);
                              setSugStatus(sug.status);
                              setSugAdminNote(sug.admin_note || '');
                            }}
                            className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs gap-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>ตอบรับ & ปรับสถานะ</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 6: Holidays & Policy Document Tab */}
      {activeTab === 'holidays' && (
        <div className="space-y-6">
          {/* Policy Document Card */}
          <Card className="glass-card shadow-sm border border-slate-200">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  <span>ไฟล์ประกาศวันหยุดประจำปีของบริษัท (Official Holiday Policy)</span>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  แนบไฟล์ประกาศ PDF หรือรูปภาพ เพื่อให้พนักงานทุกคนสามารถเปิดดูและดาวน์โหลดได้จากหน้าปฏิทิน
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setIsUploadPolicyOpen(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs gap-1.5 shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>แนบ / เปลี่ยนไฟล์ประกาศ</span>
              </Button>
            </CardHeader>

            <CardContent>
              {adminPolicyDoc ? (
                <div className="p-4 rounded-2xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-xs">
                      <h4 className="font-bold text-orange-950 dark:text-orange-200 flex items-center gap-2">
                        <span>{adminPolicyDoc.file_name}</span>
                        <Badge variant="outline" className="text-[10px] bg-orange-200/80 text-orange-800 font-mono">
                          {adminPolicyDoc.file_type.toUpperCase()}
                        </Badge>
                      </h4>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        ขนาด: {adminPolicyDoc.file_size || 'ไม่ระบุ'} • อัปเดตเมื่อ: {new Date(adminPolicyDoc.uploaded_at).toLocaleString('th-TH')} • โดย: {adminPolicyDoc.uploaded_by || 'Admin'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={adminPolicyDoc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>เปิดดูไฟล์</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed rounded-2xl">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-1.5 opacity-80" />
                  <p>ยังไม่มีการแนบไฟล์ประกาศวันหยุดของบริษัท</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Holidays List Management */}
          <Card className="glass-card shadow-sm border border-slate-200">
            <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Palmtree className="w-5 h-5 text-orange-600" />
                  <span>รายการวันหยุดประจำปี ({adminHolidays.length} วัน)</span>
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  จัดการวันหยุดนักขัตฤกษ์และวันหยุดพิเศษของบริษัท (เปิด/ปิด หรือเพิ่มวันหยุดเฉพาะขององค์กร)
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setIsAddHolOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ เพิ่มวันหยุดบริษัท</span>
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase border-y border-slate-200 dark:border-slate-800 text-[11px]">
                    <tr>
                      <th className="p-3.5 font-bold">วันที่ (YYYY-MM-DD)</th>
                      <th className="p-3.5 font-bold">ชื่อวันหยุด</th>
                      <th className="p-3.5 font-bold">ประเภท</th>
                      <th className="p-3.5 font-bold text-center">สถานะใช้งาน</th>
                      <th className="p-3.5 font-bold text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {adminHolidays.map((hol) => (
                      <tr key={hol.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {hol.date}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{hol.name}</div>
                          {hol.name_en && (
                            <div className="text-[11px] text-slate-500">{hol.name_en}</div>
                          )}
                          {hol.notes && (
                            <div className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5">📌 {hol.notes}</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <Badge
                            variant={hol.type === 'official' ? 'default' : 'outline'}
                            className={`text-[10px] ${
                              hol.type === 'official' ? 'bg-blue-600 text-white' : 'border-orange-300 text-orange-700 bg-orange-50'
                            }`}
                          >
                            {hol.type === 'official' ? 'นักขัตฤกษ์' : 'วันหยุดบริษัท'}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleHoliday(hol)}
                            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                              hol.is_active
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {hol.is_active ? '✓ เปิดใช้งาน' : '✕ ปิด'}
                          </button>
                        </td>
                        <td className="p-3.5 text-right">
                          {hol.type === 'company' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteHoliday(hol.id)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="ลบวันหยุดนี้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 7: Audit Trail (ประวัติการทำงานของผู้ดูแลระบบ) */}
      {activeTab === 'audit' && (() => {
        const filteredAuditLogs = auditLogs.filter((log) => {
          const matchSearch =
            !auditSearchQuery.trim() ||
            (log.admin_name && log.admin_name.toLowerCase().includes(auditSearchQuery.toLowerCase())) ||
            (log.admin_id && log.admin_id.toLowerCase().includes(auditSearchQuery.toLowerCase())) ||
            (log.target_employee_name && log.target_employee_name.toLowerCase().includes(auditSearchQuery.toLowerCase())) ||
            (log.target_employee_id && log.target_employee_id.toLowerCase().includes(auditSearchQuery.toLowerCase())) ||
            (log.details && log.details.toLowerCase().includes(auditSearchQuery.toLowerCase())) ||
            (log.action_title && log.action_title.toLowerCase().includes(auditSearchQuery.toLowerCase()));

          const matchAction = auditActionFilter === 'all' || log.action_type === auditActionFilter;

          return matchSearch && matchAction;
        });

        const getActionBadge = (type: string) => {
          switch (type) {
            case 'UNSUSPEND_WFH':
              return <Badge variant="success" className="bg-emerald-600 text-white text-[10px]">ปลดระงับสิทธิ์ WFH</Badge>;
            case 'SUSPEND_WFH':
              return <Badge variant="destructive" className="text-[10px]">ระงับสิทธิ์ WFH</Badge>;
            case 'CREATE_EMPLOYEE':
              return <Badge variant="default" className="bg-indigo-600 text-white text-[10px]">สร้างพนักงานใหม่</Badge>;
            case 'EDIT_EMPLOYEE':
              return <Badge variant="outline" className="border-indigo-300 text-indigo-700 bg-indigo-50 text-[10px]">แก้ไขพนักงาน</Badge>;
            case 'TOGGLE_PHOTO_EXEMPT':
              return <Badge variant="outline" className="border-purple-300 text-purple-700 bg-purple-50 text-[10px]">ปรับสิทธิ์ถ่ายภาพ</Badge>;
            case 'UPDATE_CONFIG':
              return <Badge variant="default" className="bg-slate-800 text-white text-[10px]">ตั้งค่าระบบ</Badge>;
            case 'RESOLVE_TICKET':
              return <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 text-[10px]">ตอบกลับ Ticket</Badge>;
            case 'RESPOND_SUGGESTION':
              return <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50 text-[10px]">ตอบกลับข้อเสนอแนะ</Badge>;
            case 'ADD_HOLIDAY':
            case 'TOGGLE_HOLIDAY':
            case 'DELETE_HOLIDAY':
              return <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50 text-[10px]">จัดการวันหยุด</Badge>;
            case 'UPDATE_POLICY_DOC':
              return <Badge variant="outline" className="border-rose-300 text-rose-700 bg-rose-50 text-[10px]">อัปเดตไฟล์ประกาศ</Badge>;
            case 'APPROVE_LEAVE':
              return <Badge variant="success" className="bg-emerald-600 text-white text-[10px]">อนุมัติการลา</Badge>;
            case 'REJECT_LEAVE':
              return <Badge variant="destructive" className="text-[10px]">ปฏิเสธการลา</Badge>;
            default:
              return <Badge variant="outline" className="text-[10px]">{type}</Badge>;
          }
        };

        return (
          <div className="space-y-6">
            {/* Header & Filter Card */}
            <Card className="glass-card shadow-sm border border-slate-200">
              <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <History className="w-5 h-5 text-indigo-600" />
                      <span>{t.audit.pageTitle}</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-1">
                      {t.audit.pageSubtitle}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs border-indigo-200 bg-indigo-50/70 text-indigo-800 font-mono">
                      ทั้งหมด {filteredAuditLogs.length} รายการ
                    </Badge>
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                  <div className="sm:col-span-2 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder={t.audit.searchPlaceholder}
                      value={auditSearchQuery}
                      onChange={(e) => setAuditSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <select
                      value={auditActionFilter}
                      onChange={(e) => setAuditActionFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="all">{t.audit.filterAllActions}</option>
                      <option value="UPDATE_CONFIG">⚙️ ตั้งค่าระบบ (UPDATE_CONFIG)</option>
                      <option value="UNSUSPEND_WFH">🔓 ปลดระงับสิทธิ์ WFH (UNSUSPEND_WFH)</option>
                      <option value="SUSPEND_WFH">🔒 ระงับสิทธิ์ WFH (SUSPEND_WFH)</option>
                      <option value="EDIT_EMPLOYEE">✏️ แก้ไข/ลบพนักงาน (EDIT_EMPLOYEE)</option>
                      <option value="CREATE_EMPLOYEE">➕ สร้างพนักงานใหม่ (CREATE_EMPLOYEE)</option>
                      <option value="TOGGLE_PHOTO_EXEMPT">📸 สิทธิ์ยกเว้นถ่ายรูป (TOGGLE_PHOTO_EXEMPT)</option>
                      <option value="RESOLVE_TICKET">🎫 ดำเนินการ Ticket (RESOLVE_TICKET)</option>
                      <option value="RESPOND_SUGGESTION">💬 ตอบกลับข้อเสนอแนะ (RESPOND_SUGGESTION)</option>
                      <option value="ADD_HOLIDAY">📅 เพิ่มวันหยุด (ADD_HOLIDAY)</option>
                      <option value="TOGGLE_HOLIDAY">🔄 เปิด/ปิดวันหยุด (TOGGLE_HOLIDAY)</option>
                      <option value="UPDATE_POLICY_DOC">📄 ประกาศวันหยุด (UPDATE_POLICY_DOC)</option>
                      <option value="APPROVE_LEAVE">✅ อนุมัติการลา (APPROVE_LEAVE)</option>
                      <option value="REJECT_LEAVE">❌ ปฏิเสธการลา (REJECT_LEAVE)</option>
                    </select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {filteredAuditLogs.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-500">
                    <ScrollText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold">{t.audit.emptyText}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 uppercase border-y border-slate-200 dark:border-slate-800 text-[11px]">
                        <tr>
                          <th className="p-3.5 font-bold whitespace-nowrap">{t.audit.colTimestamp}</th>
                          <th className="p-3.5 font-bold whitespace-nowrap">{t.audit.colAdmin}</th>
                          <th className="p-3.5 font-bold whitespace-nowrap">{t.audit.colAction}</th>
                          <th className="p-3.5 font-bold whitespace-nowrap">{t.audit.colTarget}</th>
                          <th className="p-3.5 font-bold">{t.audit.colDetails}</th>
                          <th className="p-3.5 font-bold text-right whitespace-nowrap">IP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredAuditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="p-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{new Date(log.timestamp).toLocaleString('th-TH')}</span>
                              </div>
                            </td>

                            <td className="p-3.5 whitespace-nowrap">
                              <div className="font-bold text-slate-900 dark:text-slate-100">{log.admin_name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">ID: {log.admin_id}</div>
                            </td>

                            <td className="p-3.5 whitespace-nowrap">
                              <div className="flex flex-col items-start gap-1">
                                {getActionBadge(log.action_type)}
                                <span className="text-[10px] text-slate-500 font-medium">{log.action_title}</span>
                              </div>
                            </td>

                            <td className="p-3.5 whitespace-nowrap">
                              {log.target_employee_name || log.target_employee_id ? (
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-slate-100">
                                    {log.target_employee_name || '-'}
                                  </span>
                                  {log.target_employee_id && (
                                    <span className="text-[10px] text-slate-400 font-mono block">
                                      ({log.target_employee_id})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">- (การตั้งค่าส่วนกลาง)</span>
                              )}
                            </td>

                            <td className="p-3.5 min-w-[280px]">
                              <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                                {log.details}
                              </p>
                            </td>

                            <td className="p-3.5 text-right whitespace-nowrap font-mono text-[10px] text-slate-400">
                              {log.ip_address || '127.0.0.1'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Add Custom Holiday Modal */}
      {isAddHolOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <Card className="w-full max-w-md p-6 relative border-emerald-300 bg-white shadow-2xl space-y-4">
            <button
              onClick={() => !submitting && setIsAddHolOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1.5 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Palmtree className="w-5 h-5 text-emerald-600" />
                <span>เพิ่มวันหยุดพิเศษของบริษัท</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ระบุวันที่และชื่อวันหยุด เช่น วันหยุด Company Outing หรือวันหยุดชดเชย
              </p>
            </div>

            <form onSubmit={handleCreateHoliday} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">วันที่วันหยุด (YYYY-MM-DD) *</label>
                <input
                  type="date"
                  required
                  value={newHolDate}
                  onChange={(e) => setNewHolDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อวันหยุด (ภาษาไทย) *</label>
                <input
                  type="text"
                  required
                  value={newHolName}
                  onChange={(e) => setNewHolName(e.target.value)}
                  placeholder="เช่น วันหยุดสัมมนาประจำปีบริษัท"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อวันหยุด (ภาษาอังกฤษ)</label>
                <input
                  type="text"
                  value={newHolNameEn}
                  onChange={(e) => setNewHolNameEn(e.target.value)}
                  placeholder="e.g. Annual Company Outing"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
                <input
                  type="text"
                  value={newHolNotes}
                  onChange={(e) => setNewHolNotes(e.target.value)}
                  placeholder="เช่น ปิดทำการทุกแผนก"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddHolOpen(false)} className="w-1/2">
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={submitting} className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกวันหยุด'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Upload / Edit Policy Document Modal */}
      {isUploadPolicyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <Card className="w-full max-w-md p-6 relative border-orange-300 bg-white shadow-2xl space-y-4">
            <button
              onClick={() => !submitting && setIsUploadPolicyOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1.5 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                <span>อัปโหลดไฟล์ประกาศวันหยุดบริษัท</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                เลือกไฟล์เอกสาร PDF หรือรูปภาพ (PNG/JPG) จากเครื่องเพื่ออัปโหลดขึ้นระบบโดยตรง
              </p>
            </div>

            <form onSubmit={handleSavePolicyDoc} className="space-y-3.5 text-xs">
              {/* Direct File Picker Zone */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">เลือกไฟล์จากเครื่อง (PDF / รูปภาพ) *</label>
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-orange-300 dark:border-orange-800 rounded-2xl bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors cursor-pointer text-center">
                  <Upload className="w-6 h-6 text-orange-600 dark:text-orange-400 mb-1.5 animate-bounce" />
                  <span className="font-bold text-orange-950 dark:text-orange-200 text-xs">
                    คลิกเพื่อเลือกไฟล์ PDF หรือรูปภาพประกาศ
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    รองรับไฟล์ .PDF, .PNG, .JPG, .JPEG (ขนาดสูงสุด 10 MB)
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      setPolicyFileName(file.name);
                      const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
                      setPolicyFileType(isPdf ? 'pdf' : 'image');

                      const sizeStr =
                        file.size < 1024 * 1024
                          ? `${Math.round(file.size / 1024)} KB`
                          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
                      setPolicyFileSize(sizeStr);

                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setPolicyFileUrl(event.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>

              {/* Selected File Details & Preview */}
              {policyFileName && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <p className="font-bold text-xs truncate">{policyFileName}</p>
                      <p className="text-[10px] text-emerald-700">
                        {policyFileType.toUpperCase()} {policyFileSize ? `• ${policyFileSize}` : ''}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success" className="text-[10px] shrink-0 bg-emerald-600">พร้อมอัปโหลด</Badge>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">ชื่อไฟล์เอกสารที่จะแสดง *</label>
                <input
                  type="text"
                  required
                  value={policyFileName}
                  onChange={(e) => setPolicyFileName(e.target.value)}
                  placeholder="เช่น ประกาศบริษัท_005-2568_วันหยุดประจำปี2569.png"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsUploadPolicyOpen(false)} className="w-1/2">
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={submitting || !policyFileUrl} className="w-1/2 bg-orange-600 hover:bg-orange-500 text-white font-bold">
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกไฟล์ประกาศ'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
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
