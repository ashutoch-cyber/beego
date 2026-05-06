'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { getWeightHistory } from '@/lib/api';
import { getCachedWeightHistory } from '@/lib/offline';
import { format } from 'date-fns';

export default function WeightChart() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const history = await getWeightHistory();
      const formatted = history.map((w: any) => ({
        date: format(new Date(w.date), 'MMM dd'),
        weight: w.weight,
      }));
      setData(formatted);
    } catch {
      const cached = await getCachedWeightHistory();
      const formatted = cached.map((w: any) => ({
        date: format(new Date(w.date), 'MMM dd'),
        weight: w.weight,
      }));
      setData(formatted);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="card h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const trend = data.length >= 2
    ? data[data.length - 1].weight - data[0].weight
    : 0;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">Weight Trend</h3>
        {data.length >= 2 && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${trend <= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend <= 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
            {Math.abs(trend).toFixed(1)} kg
          </div>
        )}
      </div>

      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          No weight data yet. Log your first entry!
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#22c55e"
              strokeWidth={2.5}
              dot={{ fill: '#22c55e', r: 4 }}
              activeDot={{ r: 6, fill: '#16a34a' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
