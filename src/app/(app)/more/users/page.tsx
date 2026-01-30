import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { UsersList } from './users-list';
import { getUsers } from './actions';
import { auth } from '@/lib/auth';

export default async function UsersPage() {
  const session = await auth();

  // Admin only
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/more');
  }

  const t = await getTranslations('more');
  const users = await getUsers();

  return (
    <>
      <Header title={t('users')} showBack />
      <div className="p-4">
        <UsersList initialUsers={users} currentUserId={session.user.id} />
      </div>
    </>
  );
}
