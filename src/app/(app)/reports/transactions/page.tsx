import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { TransactionList } from './transaction-list';
import { getTransactions } from './actions';

export default async function TransactionsPage() {
  const t = await getTranslations('reports');
  const data = await getTransactions();

  return (
    <>
      <Header title={t('transactions')} showBack />
      <div className="p-4">
        <TransactionList initialData={data} />
      </div>
    </>
  );
}
