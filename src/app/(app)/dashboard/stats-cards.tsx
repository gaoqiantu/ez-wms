import { Card, CardContent } from '@/components/ui/card';
import { Package, PackageCheck, ArrowRightLeft } from 'lucide-react';

// For now, use static data - will connect to DB later
async function getTodayStats() {
  // TODO: Query transactions table when DB is connected
  return {
    inbound: 0,
    outbound: 0,
    transfer: 0,
  };
}

export async function StatsCards() {
  const stats = await getTodayStats();

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card>
        <CardContent className="flex flex-col items-center p-4">
          <Package className="h-6 w-6 text-green-600" />
          <span className="mt-1 text-2xl font-bold">{stats.inbound}</span>
          <span className="text-xs text-muted-foreground">Inbound</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-center p-4">
          <PackageCheck className="h-6 w-6 text-blue-600" />
          <span className="mt-1 text-2xl font-bold">{stats.outbound}</span>
          <span className="text-xs text-muted-foreground">Outbound</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-center p-4">
          <ArrowRightLeft className="h-6 w-6 text-orange-600" />
          <span className="mt-1 text-2xl font-bold">{stats.transfer}</span>
          <span className="text-xs text-muted-foreground">Transfer</span>
        </CardContent>
      </Card>
    </div>
  );
}
