'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { getDailyMovement } from './actions';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

interface ChartsViewProps {
  initialDailyData: { date: string; IN: number; OUT: number }[];
  initialTopProducts: { itemCode: string; description: string | null; count: number }[];
  initialStockByLocation: { location: string; value: number }[];
}

export function ChartsView({
  initialDailyData,
  initialTopProducts,
  initialStockByLocation,
}: ChartsViewProps) {
  const t = useTranslations('charts');

  const [days, setDays] = useState(7);
  const [dailyData, setDailyData] = useState(initialDailyData);
  const [topProducts] = useState(initialTopProducts);
  const [stockByLocation] = useState(initialStockByLocation);

  useEffect(() => {
    getDailyMovement(days).then(setDailyData);
  }, [days]);

  return (
    <div className="space-y-4">
      {/* Daily Movement Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('dailyMovement')}</CardTitle>
            <div className="flex gap-1">
              <Button
                variant={days === 7 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDays(7)}
              >
                7D
              </Button>
              <Button
                variant={days === 30 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDays(30)}
              >
                30D
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="IN" fill="#22c55e" name={t('inbound')} />
                <Bar dataKey="OUT" fill="#3b82f6" name={t('outbound')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('topProducts')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis
                  dataKey="itemCode"
                  type="category"
                  tick={{ fontSize: 10 }}
                  width={70}
                />
                <Tooltip
                  formatter={(value, name, props) => [value, props.payload.description]}
                />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Stock by Location */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('stockByLocation')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockByLocation}
                  dataKey="value"
                  nameKey="location"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label={({ name, percent }) =>
                    `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {stockByLocation.map((entry, index) => (
                    <Cell key={entry.location} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
