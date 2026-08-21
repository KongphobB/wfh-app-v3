'use client';

import { useState, useEffect } from 'react';
import DailyTaskModal from '@/components/DailyTaskModal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Star, RefreshCw, Edit3 } from 'lucide-react';
import { TaskItem } from '@/types';

import { useLanguage } from '@/lib/i18n';

export default function DailyTasksPage() {
  const { t, lang } = useLanguage();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTask = tasks.find((t) => t.submit_date === todayStr);

  const fetchTasks = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Fetch tasks error:', err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(true);

    const interval = setInterval(() => {
      fetchTasks(false);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const renderStars = (rating?: number | null) => {
    if (!rating) return <Badge variant="warning">{t.tasks.pendingRating}</Badge>;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 shrink-0" />
            <span className="break-words">{t.tasks.pageTitle}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t.tasks.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold gap-2 shadow-sm shadow-orange-500/20 text-xs sm:text-sm py-2.5 sm:py-2 cursor-pointer"
          >
            {todayTask ? (
              <>
                <Edit3 className="w-4 h-4" />
                <span>{t.tasks.editTodayReport}</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>{t.tasks.submitButton}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-slate-900 font-bold">{t.tasks.historyTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              {t.common.noData}
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
                      {lang === 'en' ? 'Submitted Date: ' : 'วันที่ส่ง: '}{task.submit_date}
                    </span>
                    {renderStars(task.star_rating)}
                  </div>

                  <p className="text-slate-900 font-bold text-sm leading-relaxed">{task.details}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200 pt-2.5 font-medium">
                    <span>
                      {t.tasks.tasksCompleted}: <strong className="text-emerald-600 font-bold">{task.tasks_completed}</strong> / {task.tasks_assigned} {lang === 'en' ? 'items' : 'รายการ'}
                    </span>
                    {task.submission_link && (
                      <a
                        href={task.submission_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-orange-600 font-bold hover:underline"
                      >
                        {lang === 'en' ? 'Open Submission Link ↗' : 'เปิดลิงก์ส่งงาน ↗'}
                      </a>
                    )}
                  </div>

                  {task.supervisor_note && (
                    <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs font-medium">
                      <strong>{t.tasks.supervisorFeedback}:</strong> {task.supervisor_note}
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
        existingTask={todayTask}
      />
    </div>
  );
}
