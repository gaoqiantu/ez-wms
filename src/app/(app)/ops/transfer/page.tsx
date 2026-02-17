import { Header } from '@/components/layout/header';
import { getTranslations } from 'next-intl/server';
import { getLocations, getOperationHistory } from '../actions';
import { TransferForm } from './transfer-form';
import { OperationHistory } from '../operation-history';

export default async function TransferPage() {
  const [tOps, tReports, locations, history] = await Promise.all([
    getTranslations('ops'),
    getTranslations('reports'),
    getLocations(),
    getOperationHistory('MOVE'),
  ]);

  return (
    <>
      <Header title={tOps('transfer')} showBack />
      <div className="space-y-6 p-4">
        <TransferForm locations={locations} />
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">{tReports('transactions')}</h2>
          <OperationHistory items={history} />
        </section>
      </div>
    </>
  );
}
