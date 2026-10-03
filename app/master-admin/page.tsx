import { redirect } from 'next/navigation';

export default function MasterAdminRedirectPage() {
  redirect('/admin/login');
}
