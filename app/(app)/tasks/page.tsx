'use client';

import { useState, useEffect } from 'react';
import DailyTaskModal from '@/components/DailyTaskModal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Star, RefreshCw } from 'lucide-react';
import { TaskItem } from '@/types';

export default function DailyTasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Fetch tasks error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const renderStars = (rating?: number | null) => {
    if (!rating) return <Badge variant="warning">รอหัวหน้าประเมิน</Badge>;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`w-4 h-4 ${
              rating >= s ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-500" />
            <span>รายงานส่งงานประจำวัน (Daily Tasks)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            บันทึกผลงานประจำวันเพื่อส่งให้หัวหน้างานประเมินผลคะแนนดาว
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={fetchTasks} variant="outline" size="sm" disabled={loading} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </Button>

          <Button onClick={() => setIsModalOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white font-bold gap-2">
            <Plus className="w-4 h-4" />
            <span>ส่งรายงานประจำวัน</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-900 font-bold">ประวัติการส่งรายงานและคะแนนดาว</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              ยังไม่มีรายงานส่งงานในระบบ กดปุ่ม &quot;ส่งรายงานประจำวัน&quot; เพื่อบันทึกผลงาน
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-mono text-[11px] font-medium">
                      วันที่ส่ง: {task.submit_date}
                    </span>
                    {renderStars(task.star_rating)}
                  </div>

                  <p className="text-slate-900 font-bold text-sm leading-relaxed">{task.details}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200 pt-2.5 font-medium">
                    <span>
                      งานสำเร็จ: <strong className="text-emerald-600 font-bold">{task.tasks_completed}</strong> / {task.tasks_assigned} รายการ
                    </span>
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

                  {task.supervisor_note && (
                    <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs font-medium">
                      <strong>ความเห็นหัวหน้างาน:</strong> {task.supervisor_note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DailyTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchTasks}
      />
    </div>
  );
}
