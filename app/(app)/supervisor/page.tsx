'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Star, AlertTriangle, RefreshCw, CheckCircle2, X, MapPin, Clock, FileText } from 'lucide-react';
import { TaskItem, CheckinLog } from '@/types';

export default function SupervisorPage() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'checkins'>('tasks');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [teamCheckins, setTeamCheckins] = useState<(CheckinLog & { employee_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchSupervisorData = async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/checkin?scope=team'),
      ]);

      if (tRes.ok) setTasks((await tRes.json()).tasks || []);
      if (cRes.ok) setTeamCheckins((await cRes.json()).logs || []);
    } catch (err) {
      console.error('Error loading supervisor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupervisorData();
  }, []);

  const openRatingModal = (task: TaskItem) => {
    setSelectedTask(task);
    setRating(task.star_rating || 5);
    setNote(task.supervisor_note || '');
    setMessage('');
    setError('');
  };

  const handleRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

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
        fetchSupervisorData();
      }, 1200);
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSubmitting(false);
    }
  };

  const unratedCount = tasks.filter((t) => !t.star_rating).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-emerald-600" />
            <span>แผงประเมินงานหัวหน้า (Supervisor Panel)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            ประเมินดาวผลงานประจำวัน และติดตามเวลาเข้า-ออกงานของพนักงานในทีม
          </p>
        </div>

        <Button onClick={fetchSupervisorData} variant="outline" size="sm" disabled={loading} className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>รีเฟรชข้อมูล</span>
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-4 text-xs font-bold">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'tasks'
              ? 'border-orange-500 text-orange-600 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>ประเมินรายงานผลงาน ({unratedCount > 0 ? `ยังไม่ประเมิน ${unratedCount}` : tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('checkins')}
          className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'checkins'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Log เวลาเข้า-ออกงานลูกทีม ({teamCheckins.length})</span>
        </button>
      </div>

      {/* Tab 1: Task Rating List */}
      {activeTab === 'tasks' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-slate-900 font-bold">รายการรายงานส่งงานประจำวันทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-medium">
                ยังไม่มีรายงานส่งงานในระบบ
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{task.employee_name}</span>
                        <span className="text-slate-500 font-mono text-[11px]">({task.employee_id})</span>
                        <span className="text-slate-400 text-[11px]">• {task.submit_date}</span>
                      </div>

                      <p className="text-slate-800 text-xs font-semibold">{task.details}</p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium">
                        <span>งานสำเร็จ: <strong className="text-emerald-600 font-bold">{task.tasks_completed}</strong> / {task.tasks_assigned}</span>
                        {task.submission_link && (
                          <a
                            href={task.submission_link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-orange-600 font-bold hover:underline"
                          >
                            เปิดลิงก์ส่งงาน ↗
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-slate-200 pt-3 md:pt-0">
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
                                    : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                        ) : (
                          <Badge variant="warning">ยังไม่ประเมิน</Badge>
                        )}
                      </div>

                      <Button onClick={() => openRatingModal(task)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs">
                        {task.star_rating ? 'แก้ไขการให้ดาว' : 'ให้ดาวประเมิน'}
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
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span>ประวัติเวลาเข้า-ออกงานและตำแหน่งพนักงานในทีม</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">รวม {teamCheckins.length} รายการ</span>
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
                  <th className="px-4 py-3.5 text-right">รูปถ่าย Selfie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {teamCheckins.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                      ยังไม่มีประวัติการลงเวลาของลูกทีม
                    </td>
                  </tr>
                ) : (
                  teamCheckins.map((log) => (
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
            {message && <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>{message}</span></div>}

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
