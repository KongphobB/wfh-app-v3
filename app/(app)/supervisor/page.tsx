'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  UserCheck,
  Star,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  X,
  MapPin,
  Clock,
  FileText,
  Search,
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Camera,
  Sparkles,
  BellRing,
  Send,
} from 'lucide-react';
import { TaskItem, CheckinLog } from '@/types';
import { useLanguage } from '@/lib/i18n';
import SelfieLightboxModal, { LightboxPhotoData } from '@/components/SelfieLightboxModal';

interface TriggerSpotCheckState {
  id: string;
  name: string;
}

export default function SupervisorPage() {
  const { t, lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<'tasks' | 'checkins' | 'team'>('tasks');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [teamCheckins, setTeamCheckins] = useState<(CheckinLog & { employee_name?: string })[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; dept?: string; position?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Rating Modal State
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Quick Photo Lightbox State
  const [previewPhoto, setPreviewPhoto] = useState<LightboxPhotoData | null>(null);

  // Trigger Spot Check Modal State
  const [triggerTarget, setTriggerTarget] = useState<TriggerSpotCheckState | null>(null);
  const [triggerNote, setTriggerNote] = useState('');
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerSuccess, setTriggerSuccess] = useState('');
  const [triggerError, setTriggerError] = useState('');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'unrated' | 'rated'>('all');
  const [checkinTypeFilter, setCheckinTypeFilter] = useState<'all' | 'in' | 'out' | 'spotcheck' | 'late'>('all');

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const fetchSupervisorData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);

    try {
      const [tasksRes, checkinsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/checkin?scope=team'),
      ]);

      if (tasksRes.ok) {
        const tData = await tasksRes.json();
        setTasks(tData.tasks || []);
      }

      if (checkinsRes.ok) {
        const cData = await checkinsRes.json();
        const logs: (CheckinLog & { employee_name?: string })[] = cData.logs || [];
        setTeamCheckins(logs);

        // Derive unique team members from logs & tasks
        const memberMap = new Map<string, { id: string; name: string; dept?: string; position?: string }>();
        logs.forEach((l) => {
          if (l.employee_id && !memberMap.has(l.employee_id)) {
            memberMap.set(l.employee_id, {
              id: l.employee_id,
              name: l.employee_name || l.employee_id,
              dept: l.department || undefined,
              position: l.position || undefined,
            });
          }
        });
        (tasks || []).forEach((t) => {
          if (t.employee_id && !memberMap.has(t.employee_id)) {
            memberMap.set(t.employee_id, {
              id: t.employee_id,
              name: t.employee_name || t.employee_id,
            });
          }
        });

        // Ensure 1111 and 1304 exist as fallback subordinates
        if (!memberMap.has('1111')) memberMap.set('1111', { id: '1111', name: 'ก้องภพ', dept: 'IT', position: 'เทสระบบ WFH' });
        if (!memberMap.has('1304')) memberMap.set('1304', { id: '1304', name: 'ก้องภพ บุญชู', dept: 'Project', position: 'พนักงาน' });

        setTeamMembers(Array.from(memberMap.values()));
      }
    } catch (err) {
      console.error('Fetch supervisor data error:', err);
    } finally {
      if (isInitial) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSupervisorData(true);

    const interval = setInterval(() => {
      fetchSupervisorData(false);
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  // Filter Attendance Logs
  const attendanceLogs = useMemo(() => {
    return teamCheckins.filter(
      (log) =>
        ['เข้างาน', 'ออกงาน', 'สุ่มตรวจ', 'ยืนยันตัวตน'].some((t) => log.log_type?.includes(t)) &&
        !['แก้ไขประวัติ', 'เปลี่ยน PIN', 'สมัครสมาชิก'].includes(log.log_type)
    );
  }, [teamCheckins]);

  // Real-time Overview Statistics Calculations
  const stats = useMemo(() => {
    const todayLogs = attendanceLogs.filter((l) => l.log_date === todayStr);

    // Subordinates who checked in today
    const checkedInTodayEmps = new Set(
      todayLogs.filter((l) => l.log_type?.includes('เข้างาน')).map((l) => l.employee_id)
    );

    // On-time vs Late
    let onTimeCount = 0;
    let lateCount = 0;
    todayLogs
      .filter((l) => l.log_type?.includes('เข้างาน'))
      .forEach((l) => {
        if (l.verification_status?.includes('สาย') || l.note?.includes('สาย')) {
          lateCount++;
        } else {
          onTimeCount++;
        }
      });

    // Subordinates missing check-in today
    const missingEmployees = teamMembers.filter((m) => !checkedInTodayEmps.has(m.id));

    // Pending tasks unrated
    const unratedCount = tasks.filter((t) => !t.star_rating).length;

    // Average Star Rating of team
    const ratedTasks = tasks.filter((t) => t.star_rating != null && t.star_rating > 0);
    const avgRating =
      ratedTasks.length > 0
        ? (ratedTasks.reduce((acc, t) => acc + (t.star_rating || 0), 0) / ratedTasks.length).toFixed(1)
        : '5.0';

    return {
      checkedInCount: checkedInTodayEmps.size,
      onTimeCount,
      lateCount,
      missingCount: missingEmployees.length,
      missingEmployees,
      unratedCount,
      totalTasks: tasks.length,
      avgRating,
      ratedCount: ratedTasks.length,
      totalTeam: teamMembers.length,
    };
  }, [attendanceLogs, tasks, teamMembers, todayStr]);

  // Available unique departments
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    teamMembers.forEach((m) => {
      if (m.dept && m.dept.trim()) set.add(m.dept.trim());
    });
    teamCheckins.forEach((c) => {
      if (c.department && c.department.trim()) set.add(c.department.trim());
    });
    return Array.from(set).sort();
  }, [teamMembers, teamCheckins]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Department Filter
      if (departmentFilter !== 'all') {
        const empDept = teamMembers.find((m) => m.id === t.employee_id)?.dept;
        if (empDept !== departmentFilter) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = t.employee_name?.toLowerCase().includes(q);
        const matchId = t.employee_id?.toLowerCase().includes(q);
        const matchDetails = t.details?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchDetails) return false;
      }

      // Date Filter
      if (dateFilter === 'today') {
        if (t.submit_date !== todayStr) return false;
      } else if (dateFilter === 'custom' && customDate) {
        if (t.submit_date !== customDate) return false;
      }

      // Rating Status Filter
      if (taskStatusFilter === 'unrated') {
        if (t.star_rating != null && t.star_rating > 0) return false;
      } else if (taskStatusFilter === 'rated') {
        if (!t.star_rating) return false;
      }

      return true;
    });
  }, [tasks, searchQuery, departmentFilter, teamMembers, dateFilter, customDate, taskStatusFilter, todayStr]);

  // Filtered Checkin Logs
  const filteredCheckins = useMemo(() => {
    return attendanceLogs.filter((l) => {
      // Department Filter
      if (departmentFilter !== 'all') {
        const empDept = l.department || teamMembers.find((m) => m.id === l.employee_id)?.dept;
        if (empDept !== departmentFilter) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = l.employee_name?.toLowerCase().includes(q);
        const matchId = l.employee_id?.toLowerCase().includes(q);
        const matchNote = l.note?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchNote) return false;
      }

      // Date Filter
      if (dateFilter === 'today') {
        if (l.log_date !== todayStr) return false;
      } else if (dateFilter === 'custom' && customDate) {
        if (l.log_date !== customDate) return false;
      }

      // Log Type Filter
      if (checkinTypeFilter === 'in') {
        if (!l.log_type?.includes('เข้างาน')) return false;
      } else if (checkinTypeFilter === 'out') {
        if (!l.log_type?.includes('ออกงาน')) return false;
      } else if (checkinTypeFilter === 'spotcheck') {
        if (!l.log_type?.includes('สุ่มตรวจ') && !l.log_type?.includes('ยืนยันตัวตน')) return false;
      } else if (checkinTypeFilter === 'late') {
        const isLate = l.verification_status?.includes('สาย') || l.note?.includes('สาย');
        if (!isLate) return false;
      }

      return true;
    });
  }, [attendanceLogs, searchQuery, departmentFilter, teamMembers, dateFilter, customDate, checkinTypeFilter, todayStr]);

  const hasActiveFilters = searchQuery !== '' || departmentFilter !== 'all' || dateFilter !== 'today' || taskStatusFilter !== 'all' || checkinTypeFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setDepartmentFilter('all');
    setDateFilter('today');
    setCustomDate('');
    setTaskStatusFilter('all');
    setCheckinTypeFilter('all');
  };

  const openRatingModal = (task: TaskItem) => {
    setSelectedTask(task);
    setRating(task.star_rating || 5);
    setNote(task.supervisor_note || '');
    setMessage('');
    setError('');
  };

  const handleRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || submitting) return;

    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: selectedTask.id,
          star_rating: Number(rating),
          supervisor_note: note.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'ประเมินดาวไม่สำเร็จ');
        setSubmitting(false);
        return;
      }

      setMessage(data.message || 'ประเมินผลงานเรียบร้อยแล้ว');
      setTimeout(() => {
        setSelectedTask(null);
        fetchSupervisorData(false);
      }, 1000);
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  const openTriggerSpotCheckModal = (member: { id: string; name: string }) => {
    setTriggerTarget(member);
    setTriggerNote('');
    setTriggerSuccess('');
    setTriggerError('');
  };

  const handleTriggerSpotCheckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerTarget || triggerLoading) return;

    setTriggerLoading(true);
    setTriggerSuccess('');
    setTriggerError('');

    try {
      const res = await fetch('/api/spotcheck/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: triggerTarget.id,
          note: triggerNote.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTriggerError(data.error || 'ส่งคำสั่งสุ่มตรวจไม่สำเร็จ');
        setTriggerLoading(false);
        return;
      }

      setTriggerSuccess(data.message || 'ส่งคำสั่งสุ่มตรวจสำเร็จแล้ว (เริ่มนับถอยหลัง 10 นาที)');
      setTimeout(() => {
        setTriggerTarget(null);
        fetchSupervisorData(false);
      }, 1500);
    } catch {
      setTriggerError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setTriggerLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-emerald-600" />
            <span>{t.supervisor.pageTitle}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t.supervisor.subtitle}
          </p>
        </div>

        <Button
          onClick={() => fetchSupervisorData(false)}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs font-bold text-slate-700 bg-white shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
          <span>{refreshing ? t.common.loading : t.common.refresh}</span>
        </Button>
      </div>

      {/* Feature 2: Team Attendance & Performance Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Checkin Today */}
        <Card className="border-slate-200/80 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-white to-emerald-50/30">
          <CardContent className="p-4.5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t.supervisor.checkedInToday}
              </span>
              <div className="text-2xl font-black text-slate-900">
                {stats.checkedInCount}{' '}
                <span className="text-xs font-bold text-slate-500">/ {stats.totalTeam || stats.checkedInCount} {lang === 'en' ? 'members' : 'คน'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 pt-0.5">
                <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
                  <CheckCircle className="w-3 h-3" /> {lang === 'en' ? 'On Time ' : 'ตรงเวลา '}{stats.onTimeCount}
                </span>
                {stats.lateCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-rose-600 font-bold ml-1">
                    <AlertCircle className="w-3 h-3" /> {lang === 'en' ? 'Late ' : 'สาย '}{stats.lateCount}
                  </span>
                )}
              </div>
            </div>
            <div className="p-3 bg-emerald-100/70 text-emerald-700 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Missing Check-in */}
        <Card className="border-slate-200/80 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-white to-rose-50/30">
          <CardContent className="p-4.5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t.supervisor.missingCheckin}
              </span>
              <div className="text-2xl font-black text-slate-900">
                {stats.missingCount}{' '}
                <span className="text-xs font-bold text-slate-500">{lang === 'en' ? 'members' : 'คน'}</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-600 truncate max-w-[170px] pt-0.5">
                {stats.missingCount === 0 ? (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {lang === 'en' ? 'All members checked in 🎉' : 'ทุกคนลงเวลาครบแล้ว 🎉'}
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold">
                    {stats.missingEmployees.map((m) => m.name).join(', ')}
                  </span>
                )}
              </div>
            </div>
            <div className={`p-3 rounded-2xl ${stats.missingCount === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              <Users className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Pending Ratings */}
        <Card
          onClick={() => {
            setActiveTab('tasks');
            setTaskStatusFilter('unrated');
          }}
          className="border-slate-200/80 shadow-xs hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br from-white to-orange-50/30 hover:border-orange-300"
        >
          <CardContent className="p-4.5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t.supervisor.pendingRating}
              </span>
              <div className="text-2xl font-black text-orange-600">
                {stats.unratedCount}{' '}
                <span className="text-xs font-bold text-slate-500">/ {stats.totalTasks} {lang === 'en' ? 'tasks' : 'งาน'}</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-500 pt-0.5">
                {stats.unratedCount > 0 ? (
                  <span className="text-orange-600 font-bold hover:underline">{lang === 'en' ? 'Click to review tasks ↗' : 'คลิกเพื่อเริ่มตรวจงาน ↗'}</span>
                ) : (
                  <span className="text-emerald-600 font-bold">{lang === 'en' ? 'All tasks reviewed ✨' : 'ตรวจครบทุกใบงานแล้ว ✨'}</span>
                )}
              </div>
            </div>
            <div className="p-3 bg-orange-100/80 text-orange-600 rounded-2xl">
              <Sparkles className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Team Average Rating */}
        <Card className="border-slate-200/80 shadow-xs hover:shadow-md transition-shadow bg-gradient-to-br from-white to-amber-50/30">
          <CardContent className="p-4.5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t.supervisor.avgTeamRating}
              </span>
              <div className="text-2xl font-black text-amber-500 flex items-center gap-1.5">
                {stats.avgRating}{' '}
                <span className="text-xs font-bold text-slate-500">/ 5.0</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-500 pt-0.5">
                {lang === 'en' ? `Evaluated ${stats.ratedCount} items` : `ประเมินแล้ว ${stats.ratedCount} รายการ`}
              </div>
            </div>
            <div className="p-3 bg-amber-100/80 text-amber-600 rounded-2xl">
              <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature 1: Filter & Search Bar */}
      <Card className="border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'en' ? 'Search employee name, ID, or task details...' : 'ค้นหาชื่อพนักงาน, รหัสพนักงาน หรือรายละเอียดงาน...'}
              className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <button
                onClick={() => {
                  setDateFilter('today');
                  setCustomDate('');
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  dateFilter === 'today' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                {lang === 'en' ? 'Today' : 'วันนี้'}
              </button>
              <button
                onClick={() => {
                  setDateFilter('all');
                  setCustomDate('');
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  dateFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
                }`}
              >
                {lang === 'en' ? 'All' : 'ทั้งหมด'}
              </button>
              <button
                onClick={() => setDateFilter('custom')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  dateFilter === 'custom' ? 'bg-white text-orange-700 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>{lang === 'en' ? 'Custom Date' : 'ระบุวันที่'}</span>
              </button>
            </div>

            {dateFilter === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
              />
            )}

            {/* Department Dropdown Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 shadow-2xs"
            >
              <option value="all">{lang === 'en' ? '🏢 Dept: All' : '🏢 แผนก: ทั้งหมด'}</option>
              {availableDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* Status Dropdowns */}
            {activeTab === 'tasks' ? (
              <select
                value={taskStatusFilter}
                onChange={(e: any) => setTaskStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-orange-500"
              >
                <option value="all">{lang === 'en' ? 'Evaluation: All' : 'สถานะประเมิน: ทั้งหมด'}</option>
                <option value="unrated">{lang === 'en' ? '⏳ Pending Review' : '⏳ รอประเมินดาว'}</option>
                <option value="rated">{lang === 'en' ? '⭐ Evaluated' : '⭐ ประเมินดาวแล้ว'}</option>
              </select>
            ) : activeTab === 'checkins' ? (
              <select
                value={checkinTypeFilter}
                onChange={(e: any) => setCheckinTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">{lang === 'en' ? 'Type: All' : 'ประเภท: ทั้งหมด'}</option>
                <option value="in">{lang === 'en' ? '🟢 Morning Check-in' : '🟢 เข้างาน (IN)'}</option>
                <option value="out">{lang === 'en' ? '🔴 Evening Check-out' : '🔴 ออกงาน (OUT)'}</option>
                <option value="spotcheck">{lang === 'en' ? '🔔 Spot Check' : '🔔 สุ่มตรวจ (Spot Check)'}</option>
                <option value="late">{lang === 'en' ? '⚠️ Late Check-in' : '⚠️ เข้างานสาย'}</option>
              </select>
            ) : null}

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{lang === 'en' ? 'Reset Filters' : 'ล้างตัวกรอง'}</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 px-1 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'tasks'
              ? 'border-orange-500 text-orange-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>
            {t.supervisor.tabTasks} ({filteredTasks.length}
            {stats.unratedCount > 0 && <span className="ml-1 text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full text-[10px]">{lang === 'en' ? `Pending ${stats.unratedCount}` : `รอตรวจ ${stats.unratedCount}`}</span>}
            )
          </span>
        </button>

        <button
          onClick={() => setActiveTab('checkins')}
          className={`pb-3 px-1 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'checkins'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>{t.supervisor.tabCheckins} ({filteredCheckins.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`pb-3 px-1 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'team'
              ? 'border-rose-500 text-rose-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <BellRing className="w-4 h-4" />
          <span>{t.supervisor.tabSpotchecks} ({teamMembers.length})</span>
        </button>
      </div>

      {/* Tab 1: Task Rating List */}
      {activeTab === 'tasks' && (
        <Card className="border-slate-200/80 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-base text-slate-900 font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-500" />
              <span>รายการรายงานส่งงานประจำวันของลูกทีม</span>
            </CardTitle>
            <span className="text-xs text-slate-500 font-medium">พบ {filteredTasks.length} รายการ</span>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
                <span>กำลังโหลดรายการส่งงาน...</span>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-medium">
                {hasActiveFilters ? 'ไม่พบรายงานส่งงานตามเงื่อนไขที่ค้นหา' : 'ยังไม่มีรายงานส่งงานในระบบ'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{task.employee_name}</span>
                        <span className="text-slate-500 font-mono text-[11px] bg-slate-200/70 px-2 py-0.5 rounded-md">
                          ID: {task.employee_id}
                        </span>
                        <span className="text-slate-400 text-[11px] flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {task.submit_date}
                        </span>
                      </div>

                      <p className="text-slate-800 text-xs font-semibold leading-relaxed bg-white p-3 rounded-xl border border-slate-200/60">
                        {task.details}
                      </p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium flex-wrap">
                        <span>
                          งานสำเร็จ:{' '}
                          <strong className="text-emerald-600 font-bold text-xs">{task.tasks_completed}</strong> /{' '}
                          {task.tasks_assigned} งาน
                        </span>
                        {task.submission_link && (
                          <a
                            href={task.submission_link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-orange-600 font-bold hover:underline flex items-center gap-1 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg"
                          >
                            <span>เปิดลิงก์ผลงาน</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        {task.supervisor_note && (
                          <span className="text-slate-600 italic bg-amber-50/60 border border-amber-200/60 px-2 py-0.5 rounded-lg">
                            💬 ข้อคิดเห็นหัวหน้า: &quot;{task.supervisor_note}&quot;
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-slate-200 pt-3 md:pt-0 shrink-0">
                      <div>
                        <p className="text-[11px] text-slate-500 mb-1 font-semibold">ผลการประเมินดาว:</p>
                        {task.star_rating ? (
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-4 h-4 ${
                                  task.star_rating! >= s
                                    ? 'text-amber-500 fill-amber-500'
                                    : 'text-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                        ) : (
                          <Badge variant="warning">⏳ ยังไม่ประเมิน</Badge>
                        )}
                      </div>

                      <Button
                        onClick={() => openRatingModal(task)}
                        className={`font-bold text-xs shadow-md ${
                          task.star_rating
                            ? 'bg-slate-800 hover:bg-slate-700 text-white'
                            : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20'
                        }`}
                      >
                        {task.star_rating ? 'แก้ไขการให้ดาว' : '⭐ ให้ดาวประเมิน'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Team Check-in / Check-out Logs */}
      {activeTab === 'checkins' && (
        <Card className="border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span>{lang === 'en' ? 'Team Attendance & Spot Check Records' : 'ประวัติเวลาเข้า-ออกงานและการสุ่มตรวจพนักงานในทีม'}</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">พบ {filteredCheckins.length} รายการ</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">พนักงาน</th>
                  <th className="px-4 py-3.5">ประเภทการลงเวลา</th>
                  <th className="px-4 py-3.5">เวลาลงบันทึก</th>
                  <th className="px-4 py-3.5">สถานะพิกัด</th>
                  <th className="px-4 py-3.5">หมายเหตุ</th>
                  <th className="px-4 py-3.5 text-right">รูปถ่าย Selfie สด</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-600 inline mr-2" />
                      กำลังโหลดข้อมูลประวัติการลงเวลา...
                    </td>
                  </tr>
                ) : filteredCheckins.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                      {hasActiveFilters ? 'ไม่พบข้อมูลการลงเวลาตามเงื่อนไขที่ค้นหา' : 'ยังไม่มีประวัติการลงเวลาของลูกทีมในวันนี้'}
                    </td>
                  </tr>
                ) : (
                  filteredCheckins.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 text-sm">{log.employee_name || log.employee_id}</div>
                        <div className="text-[10px] text-slate-400 font-mono">ID: {log.employee_id}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={
                            log.log_type === 'เข้างาน'
                              ? 'success'
                              : log.log_type === 'ออกงาน'
                              ? 'destructive'
                              : log.log_type.includes('สุ่มตรวจ')
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {log.log_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-700 font-bold">
                        {new Date(log.log_time).toLocaleTimeString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}{' '}
                        น.
                        <div className="text-[10px] text-slate-400 font-normal">{log.log_date}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={log.verification_status === 'ปฏิบัติงานที่ออฟฟิศ' ? 'success' : 'default'}>
                            {log.verification_status}
                          </Badge>
                          {log.gps_lat && log.gps_lng ? (
                            <a
                              href={`https://www.google.com/maps?q=${log.gps_lat},${log.gps_lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-blue-600 font-bold hover:underline bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 transition-colors shadow-2xs"
                              title={`ดูพิกัด GPS บน Google Maps (${log.gps_lat}, ${log.gps_lng})`}
                            >
                              <MapPin className="w-3 h-3 text-blue-500" />
                              <span>แผนที่ ↗</span>
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-[200px] truncate">{log.note || '-'}</td>
                      <td className="px-4 py-3.5 text-right">
                        {log.photo_url ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewPhoto({
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
                            className="text-xs text-emerald-700 font-bold hover:bg-emerald-100 border border-emerald-300 bg-emerald-50 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 transition-all shadow-2xs hover:scale-105 cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
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
        </Card>
      )}

      {/* Tab 3: Team Subordinates List & Trigger Spot Check */}
      {activeTab === 'team' && (
        <Card className="border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BellRing className="w-5 h-5 text-rose-500" />
                <span>รายชื่อลูกทีมในสายบังคับบัญชา & สั่งสุ่มตรวจเฉพาะกิจ</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                หัวหน้างานสามารถกดสั่งสุ่มตรวจเพื่อส่งการแจ้งเตือนและให้นับถอยหลัง 10 นาทีแก่ลูกทีมรายบุคคลได้ทันที
              </p>
            </div>
            <span className="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-1 rounded-xl">
              ลูกทีม {teamMembers.length} คน
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {teamMembers.map((member) => {
              const todayLog = attendanceLogs.find(
                (l) => l.employee_id === member.id && l.log_date === todayStr && l.log_type.includes('เข้างาน')
              );

              return (
                <div
                  key={member.id}
                  className="p-4.5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{member.name}</h4>
                        <div className="text-[11px] text-slate-500 font-mono">ID: {member.id}</div>
                      </div>
                      <Badge variant={todayLog ? 'success' : 'secondary'} className="text-[10px]">
                        {todayLog ? '🟢 เข้างานแล้ว' : '🔴 ยังไม่ลงเวลา'}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>แผนก: <strong className="text-slate-800">{member.dept || 'ทั่วไป'}</strong></div>
                      <div>ตำแหน่ง: <strong className="text-slate-800">{member.position || 'พนักงาน'}</strong></div>
                      {todayLog && (
                        <div className="text-emerald-700 font-medium pt-0.5">
                          เวลาเข้างาน: {new Date(todayLog.log_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น. ({todayLog.verification_status})
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => openTriggerSpotCheckModal(member)}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 gap-1.5 py-2.5"
                  >
                    <BellRing className="w-4 h-4" />
                    <span>🔔 สั่งสุ่มตรวจทันที (นับถอยหลัง 10 นาที)</span>
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Feature 3: Quick Photo Preview Lightbox Modal */}
      <SelfieLightboxModal photo={previewPhoto} onClose={() => setPreviewPhoto(null)} />

      {/* Feature 4: Trigger Spot Check Confirmation Modal */}
      {triggerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <Card className="w-full max-w-md border-slate-200 bg-white p-6 relative shadow-2xl">
            <button
              onClick={() => setTriggerTarget(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <BellRing className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">สั่งสุ่มตรวจยืนยันตัวตนเฉพาะกิจ</h3>
                <p className="text-xs text-slate-500 font-medium">
                  พนักงานเป้าหมาย: <strong className="text-slate-900">{triggerTarget.name}</strong> ({triggerTarget.id})
                </p>
              </div>
            </div>

            {triggerError && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {triggerError}
              </div>
            )}

            {triggerSuccess && (
              <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{triggerSuccess}</span>
              </div>
            )}

            <div className="p-3.5 bg-rose-50/80 rounded-2xl border border-rose-200/80 space-y-2 mb-4 text-xs text-rose-900 leading-relaxed font-medium">
              <div className="flex items-center gap-1.5 font-bold text-rose-700">
                <Clock className="w-4 h-4" />
                <span>เงื่อนไขการสุ่มตรวจเฉพาะกิจ:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                <li>ระบบจะส่งการแจ้งเตือนแบบ In-App เด้งไปยังหน้าจอของพนักงานทันที</li>
                <li>พนักงานจะมีเวลานับถอยหลัง <strong className="text-rose-600 font-bold">10:00 นาที</strong> เพื่อเปิดกล้องถ่ายภาพ Selfie สด</li>
                <li>บันทึกพิกัด GPS เพื่อยืนยันว่าปฏิบัติงานอยู่หน้าโต๊ะจริง</li>
              </ul>
            </div>

            <form onSubmit={handleTriggerSpotCheckSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  หมายเหตุเพิ่มเติมถึงพนักงาน (ไม่บังคับ)
                </label>
                <textarea
                  rows={2}
                  value={triggerNote}
                  onChange={(e) => setTriggerNote(e.target.value)}
                  placeholder="เช่น ตรวจสอบความพร้อมการปฏิบัติงาน..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button type="button" variant="outline" onClick={() => setTriggerTarget(null)} className="w-1/2 text-xs font-bold">
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={triggerLoading}
                  className="w-1/2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 shadow-md shadow-rose-600/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{triggerLoading ? 'กำลังส่งคำสั่ง...' : 'ยืนยันสั่งตรวจ (10 นาที)'}</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Supervisor Rating Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <Card className="w-full max-w-md border-slate-200 bg-white p-6 relative shadow-2xl">
            <button
              onClick={() => setSelectedTask(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">ประเมินดาวผลงาน</h3>
            <p className="text-xs text-slate-500 mb-4 font-medium">
              พนักงาน: <strong className="text-slate-900">{selectedTask.employee_name}</strong> ({selectedTask.employee_id})
            </p>

            {error && <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{error}</div>}
            {message && (
              <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={handleRateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  ให้คะแนนดาว (1 - 5 ดาว)
                </label>
                <div className="flex items-center justify-center gap-3 py-3.5 bg-amber-50/60 rounded-2xl border border-amber-200">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-125 transition-transform"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          rating >= star
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300 hover:text-amber-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {rating === 1 && (
                  <p className="text-xs text-rose-600 mt-2 font-bold flex items-center gap-1 justify-center">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>คำเตือน: 1 ดาวจะถูกสะสมเพิ่ม (ครบ 3 ครั้ง ระงับสิทธิ์ WFH)</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  ความคิดเห็นหัวหน้างาน
                </label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เขียนความคิดเห็นหรือข้อปรับปรุง..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setSelectedTask(null)} className="w-1/2">
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={submitting} className="w-1/2 bg-orange-500 hover:bg-orange-600 text-white font-bold">
                  บันทึกผลดาว
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
