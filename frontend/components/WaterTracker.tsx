'use client';

import { useState, useEffect } from 'react';
import { Droplets, Plus, Minus } from 'lucide-react';
import { logWater, getWaterToday } from '@/lib/api';
import { cacheWater, getCachedWater } from '@/lib/offline';

export default function WaterTracker({ goal = 2500 }: { goal?: number }) {
  const [water, setWater] = useState(0);
  const [loading, setLoading] = useState(false);
  const glasses = Math.floor(water / 250);
  const totalGlasses = Math.ceil(goal / 250);

  useEffect(() => {
    loadWater();
  }, []);

  async function loadWater() {
    try {
      const data = await getWaterToday();
      setWater(data.amount || 0);
    } catch {
      const today = new Date().toISOString().split('T')[0];
      const cached = await getCachedWater(today);
      const total = cached.reduce((sum, item) => sum + item.amount, 0);
      setWater(total);
    }
  }

  async function addWater(amount: number) {
    setLoading(true);
    try {
      await logWater(amount);
      setWater((prev) => prev + amount);
    } catch {
      const today = new Date().toISOString().split('T')[0];
      await cacheWater({ amount, date: today });
      setWater((prev) => prev + amount);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Droplets className="text-blue-500" size={20} />
          <h3 className="font-bold text-gray-900">Water Intake</h3>
        </div>
        <span className="text-sm font-semibold text-blue-600">
          {water}ml <span className="text-gray-400">/ {goal}ml</span>
        </span>
      </div>

      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {Array.from({ length: totalGlasses }).map((_, i) => (
          <div
            key={i}
            className={`w-8 h-10 rounded-lg border-2 flex items-end justify-center pb-1 transition-all duration-500 ${
              i < glasses
                ? 'bg-blue-400 border-blue-400 text-white'
                : 'bg-gray-50 border-gray-200 text-gray-300'
            }`}
          >
            <Droplets size={14} />
          </div>
        ))}
      </div>

      <div className="flex gap-2 justify-center">
        <button
          onClick={() => addWater(-250)}
          disabled={loading || water < 250}
          className="btn-secondary py-2 px-4 text-sm"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={() => addWater(250)}
          disabled={loading}
          className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
        >
          <Plus size={16} />
          Add Glass (250ml)
        </button>
      </div>
    </div>
  );
}
