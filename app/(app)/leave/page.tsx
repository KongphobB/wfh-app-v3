'use client';

import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, Plus, CheckCircle2, XCircle, Clock, 
  ShieldCheck, AlertCircle, RefreshCw, UserCheck, MessageSquare, ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LeaveRequestModal } from '@/components/LeaveRequestModal';
import { LeaveRequest, LeaveStatus } from '@/types';
import { useLanguage } from '@/lib/i18n';

export default function LeavePage() {
  const { t, lang } = useLanguage();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [role, setRole] = useState<string>('employee');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my_requests' | 'team_approvals'>('my_requests');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/leave');
      const data = await res.json();
      if (res.ok && data.success) {
        setRequests(data.data || []);
        setRole(data.role || 'employee');
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleReview = async (id: string, status: LeaveStatus, note?: string) => {
    setProcessingId(id);
    try {
      const res = await fetch('/api/leave', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, review_note: note || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchRequests();
      }
    } catch (err) {
      console.error('Error updating leave status:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const myRequests = requests.filter((r) => role === 'employee' || activeTab === 'my_requests');
  const pendingApprovals = requests.filter((r) => r.status === 'Pending');

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'Approved':
        return (
          <Badge variant="success" className="gap-1 font-bold text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{t.leave.approved}</span>
          </Badge>
        );
      case 'Rejected':
        return (
          <Badge variant="destructive" className="gap-1 font-bold text-xs">
            <XCircle className="w-3.5 h-3.5" />
            <span>{t.leave.rejected}</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="warning" className="gap-1 font-bold text-xs bg-amber-500 text-white">
            <Clock className="w-3.5 h-3.5" />
            <span>{t.leave.pending}</span>
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-orange-600" />
            <span>{t.leave.title}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">{t.leave.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRequests}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t.common.refresh}</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold gap-1.5 text-xs shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t.leave.requestBtn}</span>
          </Button>
        </div>
      </div>

      {/* Auto Exemption Notice Card */}
      <Card className="border-orange-200 bg-orange-50/70 dark:bg-orange-950/20 shadow-xs">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-orange-950 dark:text-orange-200">
              {lang === 'en' ? 'Automatic Missing Check-in Exemption' : 'ระบบยกเว้นการแจ้งเตือนขาดงานอัตโนมัติ'}
            </h4>
            <p className="text-xs text-orange-800 dark:text-orange-300 mt-0.5">
              {t.leave.autoExemptNote}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Role Tabs for Supervisor & Admin */}
      {(role === 'supervisor' || role === 'admin') && (
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('team_approvals')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'team_approvals'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>{t.leave.supervisorTitle}</span>
            {pendingApprovals.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white text-orange-600 font-extrabold">
                {pendingApprovals.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_requests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'my_requests'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>{t.leave.historyTitle}</span>
          </button>
        </div>
      )}

      {/* Supervisor Team Approvals View */}
      {(role === 'supervisor' || role === 'admin') && activeTab === 'team_approvals' && (
        <Card className="glass-card shadow-sm border border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
              <span>{t.leave.supervisorTitle}</span>
              <Badge variant="default" className="text-xs">{pendingApprovals.length} {t.leave.pending}</Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">{t.leave.supervisorSubtitle}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {pendingApprovals.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-semibold">{lang === 'en' ? 'No pending leave requests to review' : 'ไม่มีรายการคำขอลาที่ค้างรอการพิจารณา'}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingApprovals.map((req) => (
                  <div key={req.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{req.employee_name}</span>
                        <span className="text-xs text-slate-400 font-mono">({req.employee_id})</span>
                        {req.department && (
                          <Badge variant="outline" className="text-[10px]">{req.department}</Badge>
                        )}
                        <Badge variant="default" className="bg-orange-100 text-orange-700 border-orange-200 text-[10px]">
                          {req.leave_type}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-700 font-medium flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>ช่วงวันที่: <strong>{req.start_date}</strong> ถึง <strong>{req.end_date}</strong></span>
                      </p>

                      <p className="text-xs text-slate-600 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <strong>เหตุผล:</strong> {req.reason}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="default"
                        disabled={processingId === req.id}
                        onClick={() => handleReview(req.id, 'Approved')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t.leave.approveBtn}</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={processingId === req.id}
                        onClick={() => handleReview(req.id, 'Rejected')}
                        className="text-xs gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{t.leave.rejectBtn}</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* My Requests List View */}
      {activeTab === 'my_requests' && (
        <Card className="glass-card shadow-sm border border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-slate-900">{t.leave.historyTitle}</CardTitle>
            <CardDescription className="text-xs text-slate-500">{t.leave.historySubtitle}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {myRequests.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-2 opacity-80" />
                <p>{t.leave.noRequests}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {myRequests.map((req) => (
                  <div key={req.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{req.leave_type}</span>
                        {getStatusBadge(req.status)}
                      </div>

                      <p className="text-xs text-slate-600 font-medium">
                        วันที่: <strong>{req.start_date}</strong> {req.start_date !== req.end_date ? `ถึง ${req.end_date}` : ''}
                      </p>

                      <p className="text-xs text-slate-500">
                        {req.reason}
                      </p>

                      {req.reviewed_by && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          ผู้พิจารณา: {req.reviewed_by} {req.review_note ? `(${req.review_note})` : ''}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-slate-400 font-mono">
                        ยื่นเมื่อ: {new Date(req.created_at).toLocaleDateString('th-TH')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leave Submission Modal */}
      <LeaveRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchRequests}
      />
    </div>
  );
}
