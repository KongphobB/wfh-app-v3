import { supabaseAdmin } from '@/lib/supabase/server';
import { NotificationType } from '@/types';

export async function createNotification(params: {
  employee_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  const { employee_id, type, title, message, link } = params;

  try {
    const { error } = await supabaseAdmin.from('notifications').insert({
      employee_id,
      type,
      title,
      message,
      link: link || null,
      is_read: false,
    });

    if (error) {
      console.error('Error inserting notification to Supabase:', error);
    }
  } catch (err) {
    console.error('createNotification helper error:', err);
  }
}

export async function createNotificationForAdmins(params: {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    const { data: admins } = await supabaseAdmin
      .from('employees')
      .select('employee_id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      const notifs = admins.map((admin) => ({
        employee_id: admin.employee_id,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link || null,
        is_read: false,
      }));
      await supabaseAdmin.from('notifications').insert(notifs);
    }
  } catch (err) {
    console.error('createNotificationForAdmins error:', err);
  }
}
