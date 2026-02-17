import { Header } from '@/components/layout/header';
import { getTranslations } from 'next-intl/server';
import { getLocations, getOperationHistory } from '../actions';
import { InboundForm } from './inbound-form';
import { OperationHistory } from '../operation-history';

export default async function InboundPage() {
  const [tOps, tReports, locations, history] = await Promise.all([
    getTranslations('ops'),
    getTranslations('reports'),
    getLocations(),
    getOperationHistory('IN'),
  ]);

  return (
    <>
      <Header title={tOps('inbound')} showBack />
      <div className="space-y-6 p-4">
        <InboundForm locations={locations} />
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">{tReports('transactions')}</h2>
          <OperationHistory items={history} />
        </section>
      </div>
    </>
  );
}
