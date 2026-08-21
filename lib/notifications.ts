import { NotificationType, NotificationItem } from '@/types';

// In-memory notification store
let memoryNotifications: NotificationItem[] = (global as any).__memoryNotifications || [];
(global as any).__memoryNotifications = memoryNotifications;

// Global read notification IDs set
const readNotifIds: Set<string> = (global as any).__readNotifIds || new Set();
(global as any).__readNotifIds = readNotifIds;

export function isNotifRead(id: string): boolean {
  return readNotifIds.has(id);
}

export function markNotifIdAsRead(id: string) {
  readNotifIds.add(id);
}

export async function createNotification(params: {
  employee_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  const { employee_id, type, title, message, link } = params;

  const newNotif: NotificationItem = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    employee_id,
    type,
    title,
    message,
    link: link || null,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  memoryNotifications.unshift(newNotif);
  if (memoryNotifications.length > 200) {
    memoryNotifications = memoryNotifications.slice(0, 200);
  }
}

export async function createNotificationForAdmins(params: {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  await createNotification({
    employee_id: 'ROLE:admin',
    type: params.type,
    title: params.title,
    message: params.message,
    link: params.link,
  });
}

export function getNotificationsForUser(employeeId: string, role?: string) {
  return memoryNotifications.filter((n) => {
    // 1. Direct notification to this specific employee
    if (n.employee_id === employeeId) return true;

    // 2. Admin broadcast notifications (Only for admin role)
    if (role === 'admin' && (n.employee_id === 'ROLE:admin' || n.employee_id === '9999')) {
      return true;
    }

    return false;
  });
}

export function markNotificationsAsRead(employeeId: string, notifId?: string, role?: string) {
  if (notifId) {
    readNotifIds.add(notifId);
  }
  memoryNotifications = memoryNotifications.map((n) => {
    const isTargetUser = n.employee_id === employeeId || (role === 'admin' && (n.employee_id === 'ROLE:admin' || n.employee_id === '9999'));
    if (isTargetUser) {
      if (!notifId || n.id === notifId) {
        readNotifIds.add(n.id);
        return { ...n, is_read: true };
      }
    }
    return n;
  });
}
