'use client';

import { useState, useEffect } from 'react';
import { Flame, Dumbbell, Scale, ChevronRight } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import CalorieRing from '@/components/CalorieRing';
import MacroBar from '@/components/MacroBar';
import MealCard from '@/components/MealCard';
import WaterTracker from '@/components/WaterTracker';
import WeightChart from '@/components/WeightChart';
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
      setDashboard({
        calories_consumed: totalCal,
        calories_goal: 2000,
        protein: totalP,
        carbs: totalC,
        fat: totalF,
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

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 text-white pt-12 pb-8 px-6 rounded-b-[2.5rem] shadow-lg">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-1">Good {getGreeting()}</h1>
          <p className="text-primary-100 text-sm">{format(new Date(), 'EEEE, MMMM d')}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-6">
        {/* Calorie Ring */}
        <div className="card flex flex-col items-center">
          <CalorieRing consumed={consumed} goal={goal} />
          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <div className="flex items-center gap-1 text-orange-500">
                <Flame size={16} />
                <span className="font-bold">{Math.round(consumed)}</span>
              </div>
              <span className="text-xs text-gray-400">consumed</span>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-primary-600">
                <Dumbbell size={16} />
                <span className="font-bold">{Math.round(goal - consumed)}</span>
              </div>
              <span className="text-xs text-gray-400">remaining</span>
            </div>
          </div>
        </div>

        {/* Macros */}
        <div className="card mt-4">
          <h3 className="font-bold text-gray-900 mb-4">Macro Breakdown</h3>
          <MacroBar
            protein={dashboard?.protein || 0}
            proteinGoal={dashboard?.protein_goal || 150}
            carbs={dashboard?.carbs || 0}
            carbsGoal={dashboard?.carbs_goal || 250}
            fat={dashboard?.fat || 0}
            fatGoal={dashboard?.fat_goal || 65}
          />
        </div>

        {/* Water Tracker */}
        <div className="mt-4">
          <WaterTracker />
        </div>

        {/* Weight Chart */}
        <div className="mt-4">
          <WeightChart />
        </div>

        {/* Recent Meals */}
        <div className="mt-4 mb-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-bold text-gray-900">Recent Meals</h3>
            <button className="text-primary-600 text-sm font-medium flex items-center gap-1 hover:underline">
              View All <ChevronRight size={16} />
            </button>
          </div>
          <div className="space-y-3">
            {meals.length === 0 ? (
              <div className="card text-center py-8 text-gray-400">
                <Scale size={40} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No meals logged today</p>
                <p className="text-xs mt-1">Tap Scan to detect food from an image</p>
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
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const backendHasMacros = Number(dashboard?.protein) > 0 || Number(dashboard?.carbs) > 0 || Number(dashboard?.fat) > 0;

  return {
    ...dashboard,
    calories_consumed: Number(dashboard?.calories_consumed ?? dashboard?.today_calories ?? totals.calories) || 0,
    calories_goal: Number(dashboard?.calories_goal ?? dashboard?.calorie_goal ?? 2000) || 2000,
    protein: backendHasMacros ? Number(dashboard?.protein) || 0 : totals.protein,
    carbs: backendHasMacros ? Number(dashboard?.carbs) || 0 : totals.carbs,
    fat: backendHasMacros ? Number(dashboard?.fat) || 0 : totals.fat,
    protein_goal: Number(dashboard?.protein_goal) || 150,
    carbs_goal: Number(dashboard?.carbs_goal) || 250,
    fat_goal: Number(dashboard?.fat_goal) || 65,
  };
}
