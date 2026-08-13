'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShieldCheck, Users, Ticket as TicketIcon, Settings, Plus, 
  CheckCircle2, RefreshCw, X, Save, Edit3, Trash2, KeyRound, Sparkles, MapPin, Clock
} from 'lucide-react';
import { Employee, Ticket, AppConfig, CheckinLog } from '@/types';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'employees' | 'checkins' | 'tickets' | 'config'>('employees');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allCheckins, setAllCheckins] = useState<(CheckinLog & { employee_name?: string })[]>([]);
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

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchAdminData = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
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
    }
  };

  const openEditModal = (emp: Employee) => {
    setEditEmployee(emp);
    setEditName(emp.name);
    setEditEmail(emp.email || '');
    setEditDepartment(emp.department || '');
    setEditPosition(emp.position || '');
    setEditSupervisorId(emp.supervisor_id || '');
    setEditRole(emp.role);
    setError('');
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmployee) return;
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
        return;
      }

      setMessage(data.message || 'แก้ไขข้อมูลพนักงานสำเร็จ');
      setEditEmployee(null);
      fetchAdminData();
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleDeleteEmployee = async (emp: Employee) => {
    if (!confirm(`คุณต้องการลบพนักงาน ${emp.name} (${emp.employee_id}) ใช่หรือไม่?`)) return;

    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/admin/employees?employee_id=${emp.employee_id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'ลบพนักงานไม่สำเร็จ');
        return;
      }

      setMessage(data.message || 'ลบพนักงานสำเร็จ');
      fetchAdminData();
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleEmployeeAction = async (employee_id: string, action: string, extra: Record<string, any> = {}) => {
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/employees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id, action, ...extra }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'ดำเนินการล้มเหลว');
        return;
      }

      setMessage(data.message || 'บันทึกสำเร็จ');
      fetchAdminData();
    } catch {
      setError('เกิดข้อผิดพลาด');
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;

    try {
      const res = await fetch('/api/admin/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id: selectedTicket.id,
          status: 'Resolved',
          admin_notes: adminNote,
        }),
      });

      if (res.ok) {
        setSelectedTicket(null);
        setAdminNote('');
        fetchAdminData();
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการอัปเดต Ticket');
    }
  };

  const handleSaveConfigs = async () => {
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
            <span>แผงผู้ดูแลระบบ (Admin Dashboard)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">จัดการผู้ใช้งาน ตรวจดู Log การลงเวลา Ticket ปัญหา และตั้งค่าระบบ</p>
        </div>

        <Button onClick={fetchAdminData} variant="outline" size="sm" disabled={loading} className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>รีเฟรชข้อมูล</span>
        </Button>
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
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'employees'
              ? 'border-orange-500 text-orange-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>จัดการพนักงาน ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('checkins')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'checkins'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Log การลงเวลาทั้งหมด ({allCheckins.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'tickets'
              ? 'border-amber-500 text-amber-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <TicketIcon className="w-4 h-4" />
          <span>Ticket แจ้งปัญหา ({pendingTickets})</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'config'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>การตั้งค่าระบบ</span>
        </button>
      </div>

      {/* Tab 1: Employees Tab */}
      {activeTab === 'employees' && (
        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">รายชื่อพนักงานและสิทธิ์ WFH</h3>
            <Button onClick={() => setIsAddModalOpen(true)} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white font-bold gap-1.5 shadow-sm">
              <Plus className="w-4 h-4" />
              <span>เพิ่มพนักงานใหม่</span>
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">รหัส</th>
                  <th className="px-4 py-3.5">ชื่อ-นามสกุล</th>
                  <th className="px-4 py-3.5">ตำแหน่ง / แผนก</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">หัวหน้างาน</th>
                  <th className="px-4 py-3.5">อีเมล</th>
                  <th className="px-4 py-3.5">บทบาท</th>
                  <th className="px-4 py-3.5 text-center whitespace-nowrap">สะสม 1-ดาว</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">สถานะ WFH</th>
                  <th className="px-4 py-3.5 text-right min-w-[320px]">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {employees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-900">{emp.employee_id}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">{emp.name}</td>
                    <td className="px-4 py-3.5 text-slate-600 min-w-[180px]">{emp.position || '-'} / {emp.department || '-'}</td>
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
                          onClick={() => openEditModal(emp)}
                          className="h-8 px-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                          title="แก้ไขข้อมูลพนักงาน"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          <span>แก้ไข</span>
                        </button>

                        {emp.one_star_count > 0 && (
                          <button
                            type="button"
                            onClick={() => handleEmployeeAction(emp.employee_id, 'clear_stars')}
                            className="h-8 px-2.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                            title="ล้างดาวสะสม 1-ดาว"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>ล้างดาว</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleEmployeeAction(emp.employee_id, 'update_wfh', { wfh_status: emp.wfh_status === 'เปิดสิทธิ์' ? 'ระงับสิทธิ์' : 'เปิดสิทธิ์' })}
                          className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all cursor-pointer"
                          title="สลับสิทธิ์การทำงาน WFH"
                        >
                          <span>สลับสิทธิ์</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEmployeeAction(emp.employee_id, 'reset_pin', { reset_pin: true })}
                          className="h-8 px-2.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                          title="รีเซ็ต PIN เป็น 1234"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-orange-500" />
                          <span>รีเซ็ต PIN</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteEmployee(emp)}
                          className="h-8 w-8 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-all shrink-0 cursor-pointer"
                          title="ลบพนักงาน"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2: All Check-in Logs */}
      {activeTab === 'checkins' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span>ประวัติ Log การลงเวลาเข้า-ออกงานทั้งหมด (ทั้งบริษัท)</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">รวม {allCheckins.length} รายการ</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">พนักงาน</th>
                  <th className="px-4 py-3.5">ประเภทการลงเวลา</th>
                  <th className="px-4 py-3.5">เวลาลงบันทึก</th>
                  <th className="px-4 py-3.5">สถานะพิกัด GPS</th>
                  <th className="px-4 py-3.5">พิกัด Lat, Lng</th>
                  <th className="px-4 py-3.5">หมายเหตุ</th>
                  <th className="px-4 py-3.5 text-right">รูปถ่าย Selfie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {allCheckins.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">
                      ยังไม่มีประวัติการลงเวลาในระบบ
                    </td>
                  </tr>
                ) : (
                  allCheckins.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{log.employee_name || log.employee_id}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {log.employee_id}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={
                            log.log_type === 'เข้างาน'
                              ? 'success'
                              : log.log_type === 'ออกงาน'
                              ? 'destructive'
                              : 'default'
                          }
                        >
                          {log.log_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-700 font-bold">
                        {new Date(log.log_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} น.
                        <div className="text-[10px] text-slate-400 font-normal">{log.log_date}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={log.verification_status === 'ปฏิบัติงานที่ออฟฟิศ' ? 'success' : 'default'}>
                          {log.verification_status}
                        </Badge>
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
                          <a
                            href={log.photo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-orange-600 font-bold hover:underline border border-orange-200 bg-orange-50 px-2.5 py-1 rounded-lg"
                          >
                            ดูรูปถ่าย ↗
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Tickets Tab */}
      {activeTab === 'tickets' && (
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900">รายการ Ticket แจ้งปัญหา</h3>
          <div className="space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{t.employee_name} ({t.employee_id})</span>
                  <Badge variant={t.status === 'Resolved' ? 'success' : 'warning'}>{t.status}</Badge>
                </div>
                <p className="font-bold text-slate-900 text-sm">{t.problem_type}</p>
                <p className="text-slate-700 font-medium">{t.description}</p>

                {t.status === 'Pending' && (
                  <div className="pt-2 flex justify-end">
                    <Button onClick={() => setSelectedTicket(t)} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                      แก้ไขปัญหา (Resolve)
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab 4: Config Tab */}
      {activeTab === 'config' && (
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900">ตั้งค่าพารามิเตอร์ระบบ</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Office Latitude</label>
              <input
                type="text"
                value={configs.office_lat || '13.7563'}
                onChange={(e) => setConfigs({ ...configs, office_lat: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Office Longitude</label>
              <input
                type="text"
                value={configs.office_lng || '100.5018'}
                onChange={(e) => setConfigs({ ...configs, office_lng: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold"
              />
            </div>
          </div>
          <Button onClick={handleSaveConfigs} className="bg-orange-500 hover:bg-orange-600 text-white font-bold gap-2">
            <Save className="w-4 h-4" />
            <span>บันทึกการตั้งค่าทั้งหมด</span>
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
                        {sup.name} ({sup.employee_id})
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

              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 mt-3">
                บันทึกพนักงานใหม่ (PIN: 1234)
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <Card className="w-full max-w-lg p-6 relative border-slate-200 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <button onClick={() => setEditEmployee(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900">
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
                          {sup.name} ({sup.employee_id})
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
                <Button type="button" variant="outline" onClick={() => setEditEmployee(null)} className="w-1/2">
                  ยกเลิก
                </Button>
                <Button type="submit" className="w-1/2 bg-orange-500 hover:bg-orange-600 text-white font-bold">
                  บันทึกการแก้ไข
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Resolve Ticket Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <Card className="w-full max-w-md p-6 relative border-emerald-300 bg-white shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">แก้ไขปัญหา Ticket</h3>
            <textarea rows={4} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="ระบุวิธีแก้ไข..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs mb-3 font-medium" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedTicket(null)} className="w-1/2">ยกเลิก</Button>
              <Button onClick={handleResolveTicket} className="w-1/2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold">Resolved</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
