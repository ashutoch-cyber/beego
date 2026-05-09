'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Camera, ChevronRight, Flame, Leaf, Plus, Scale, Sparkles } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import CalorieRing from '@/components/CalorieRing';
import MacroBar from '@/components/MacroBar';
import MealCard from '@/components/MealCard';
import { getDashboard, getHistory } from '@/lib/api';
import { getCachedMeals } from '@/lib/offline';
import { format } from 'date-fns';

export default function Dashboard() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [dashData, historyData] = await Promise.all([
        getDashboard(),
        getHistory(),
      ]);
      setDashboard(mergeDashboardWithMeals(dashData, historyData));
      setMeals(historyData.slice(0, 5));
    } catch {
      const cached = await getCachedMeals();
      const today = new Date().toISOString().split('T')[0];
      const todayMeals = cached.filter((m: any) => m.date?.startsWith(today));
      const totalCal = todayMeals.reduce((s: number, m: any) => s + (m.calories || 0), 0);
      const totalP = todayMeals.reduce((s: number, m: any) => s + (m.protein || 0), 0);
      const totalC = todayMeals.reduce((s: number, m: any) => s + (m.carbs || 0), 0);
      const totalF = todayMeals.reduce((s: number, m: any) => s + (m.fat || 0), 0);
      const totalFiber = todayMeals.reduce((s: number, m: any) => s + (m.fiber || 0), 0);
      setDashboard({
        calories_consumed: totalCal,
        calories_goal: 2000,
        protein: totalP,
        carbs: totalC,
        fat: totalF,
        fiber: totalFiber,
        fiber_goal: 25,
      });
      setMeals(todayMeals.slice(0, 5));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const consumed = dashboard?.calories_consumed || 0;
  const goal = dashboard?.calories_goal || 2000;
  const remaining = Math.max(goal - consumed, 0);

  return (
    <div className="min-h-screen bg-[#f5faf7] pb-28">
      <div className="bg-[#1B4332] px-6 pb-24 pt-12 text-white">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9ed8b6]">Healthify</p>
              <h1 className="mt-1 text-2xl font-black">Good {getGreeting()}</h1>
              <p className="mt-1 text-sm font-medium text-[#c7ead4]">{format(new Date(), 'EEEE, MMMM d')}</p>
            </div>
            <Link
              href="/scan"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2D6A4F] shadow-lg shadow-black/10"
              aria-label="Snap food"
            >
              <Camera size={22} />
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-20 max-w-lg px-4">
        <div className="rounded-[2rem] border border-[#dce8e1] bg-white p-5 shadow-[0_18px_45px_rgba(15,65,38,0.12)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-extrabold text-[#183c2a]">Calorie Tracker</p>
              <p className="text-xs font-semibold text-[#7b9587]">Consumed of Goal</p>
            </div>
            <div className="rounded-full bg-[#f0f8f4] px-3 py-1 text-xs font-black text-[#2D6A4F]">
              {Math.round(remaining)} Cal left
            </div>
          </div>
          <div className="flex flex-col items-center">
          <CalorieRing consumed={consumed} goal={goal} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatPill icon={<Flame size={16} />} label="Consumed" value={`${Math.round(consumed)} Cal`} />
            <StatPill icon={<Leaf size={16} />} label="Goal" value={`${Math.round(goal)} Cal`} />
          </div>
        </div>

        <div className="mt-4 rounded-[1.75rem] border border-[#dce8e1] bg-[#f8fcfa] p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-black text-[#183c2a]">Macros</h3>
              <p className="text-xs font-semibold text-[#7b9587]">Target vs Actual</p>
            </div>
            <Sparkles className="text-[#2D6A4F]" size={18} />
          </div>
          <MacroBar
            protein={dashboard?.protein || 0}
            proteinGoal={dashboard?.protein_goal || 150}
            carbs={dashboard?.carbs || 0}
            carbsGoal={dashboard?.carbs_goal || 250}
            fat={dashboard?.fat || 0}
            fatGoal={dashboard?.fat_goal || 65}
            fiber={dashboard?.fiber || dashboard?.fibre || 0}
            fiberGoal={dashboard?.fiber_goal || dashboard?.fibre_goal || 25}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link
            href="/scan"
            className="flex items-center justify-between rounded-[1.5rem] bg-[#2D6A4F] p-4 text-white shadow-lg shadow-[#2D6A4F]/20"
          >
            <div>
              <p className="text-xs font-bold text-[#c9f4d9]">AI Food</p>
              <p className="mt-1 text-lg font-black">Snap Food</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-2">
              <Camera size={22} />
            </div>
          </Link>
          <Link
            href="/log"
            className="flex items-center justify-between rounded-[1.5rem] border border-[#dce8e1] bg-white p-4 text-[#183c2a] shadow-sm"
          >
            <div>
              <p className="text-xs font-bold text-[#7b9587]">Manual</p>
              <p className="mt-1 text-lg font-black">Add Food</p>
            </div>
            <div className="rounded-2xl bg-[#f0f8f4] p-2 text-[#2D6A4F]">
              <Plus size={22} />
            </div>
          </Link>
        </div>

        <div className="mt-4 mb-4">
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="font-black text-[#183c2a]">Today&apos;s Meals</h3>
            <Link href="/log" className="flex items-center gap-1 text-sm font-black text-[#2D6A4F]">
              View all <ChevronRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {meals.length === 0 ? (
              <div className="rounded-[1.5rem] border border-[#dce8e1] bg-white p-8 text-center text-[#7b9587]">
                <Scale size={40} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm font-bold">No meals logged today</p>
                <p className="mt-1 text-xs">Tap Snap Food to detect food from an image</p>
              </div>
            ) : (
              meals.map((meal) => <MealCard key={meal.id} meal={meal} />)
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function StatPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f5faf7] p-3">
      <div className="flex items-center gap-2 text-[#2D6A4F]">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wide text-[#7b9587]">{label}</span>
      </div>
      <p className="mt-1 text-lg font-black text-[#183c2a]">{value}</p>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

function mergeDashboardWithMeals(dashboard: any, meals: any[]) {
  const totals = meals.reduce(
    (sum, meal) => ({
      calories: sum.calories + (Number(meal.calories) || 0),
      protein: sum.protein + (Number(meal.protein) || 0),
      carbs: sum.carbs + (Number(meal.carbs) || 0),
      fat: sum.fat + (Number(meal.fat) || 0),
      fiber: sum.fiber + (Number(meal.fiber) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  const backendHasMacros = Number(dashboard?.protein) > 0 || Number(dashboard?.carbs) > 0 || Number(dashboard?.fat) > 0;

  return {
    ...dashboard,
    calories_consumed: Number(dashboard?.calories_consumed ?? dashboard?.today_calories ?? totals.calories) || 0,
    calories_goal: Number(dashboard?.calories_goal ?? dashboard?.calorie_goal ?? 2000) || 2000,
    protein: backendHasMacros ? Number(dashboard?.protein) || 0 : totals.protein,
    carbs: backendHasMacros ? Number(dashboard?.carbs) || 0 : totals.carbs,
    fat: backendHasMacros ? Number(dashboard?.fat) || 0 : totals.fat,
    fiber: Number(dashboard?.fiber ?? dashboard?.fibre ?? totals.fiber) || 0,
    protein_goal: Number(dashboard?.protein_goal) || 150,
    carbs_goal: Number(dashboard?.carbs_goal) || 250,
    fat_goal: Number(dashboard?.fat_goal) || 65,
    fiber_goal: Number(dashboard?.fiber_goal ?? dashboard?.fibre_goal) || 25,
    water_goal: Number(dashboard?.water_goal) || 2500,
  };
}
