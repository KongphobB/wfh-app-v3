import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.force_pin_change) {
    redirect('/change-pin');
  }

  if (session.role === 'admin') {
    redirect('/admin');
  }

  if (session.role === 'supervisor') {
    redirect('/supervisor');
  }

  redirect('/dashboard');
}
