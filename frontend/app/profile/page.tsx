'use client';

import { useState, useEffect } from 'react';
import { User, LogOut, Scale, Target, Settings, ChevronRight } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { logWeight } from '@/lib/api';
import { cacheWeight } from '@/lib/offline';

export default function ProfilePage() {
  const [weight, setWeight] = useState('');
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch {}
    }
  }, []);

  async function handleLogWeight() {
    const w = parseFloat(weight);
    if (!w || w <= 0) return;
    try {
      await logWeight(w);
    } catch {
      const today = new Date().toISOString().split('T')[0];
      await cacheWeight({ date: today, weight: w });
    }
    setWeight('');
    setShowWeightInput(false);
  }

  function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 text-white pt-12 pb-12 px-6 rounded-b-[2.5rem]">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <User size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user?.email?.split('@')[0] || 'Guest'}</h1>
            <p className="text-primary-100 text-sm">{user?.email || 'Sign in to sync data'}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="card p-4 text-center">
            <Target className="mx-auto text-primary-600 mb-1" size={20} />
            <p className="text-lg font-bold text-gray-900">2000</p>
            <p className="text-[10px] text-gray-400">Cal Goal</p>
          </div>
          <div className="card p-4 text-center">
            <Scale className="mx-auto text-blue-500 mb-1" size={20} />
            <p className="text-lg font-bold text-gray-900">--</p>
            <p className="text-[10px] text-gray-400">Weight (kg)</p>
          </div>
          <div className="card p-4 text-center">
            <Settings className="mx-auto text-orange-500 mb-1" size={20} />
            <p className="text-lg font-bold text-gray-900">7</p>
            <p className="text-[10px] text-gray-400">Day Streak</p>
          </div>
        </div>

        {/* Weight Log */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Scale className="text-blue-600" size={18} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Log Weight</h3>
                <p className="text-xs text-gray-400">Track your progress</p>
              </div>
            </div>
            <button
              onClick={() => setShowWeightInput(!showWeightInput)}
              className="text-primary-600 text-sm font-semibold"
            >
              {showWeightInput ? 'Cancel' : 'Add'}
            </button>
          </div>

          {showWeightInput && (
            <div className="flex gap-2 animate-slide-up">
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Weight in kg"
                className="input-field flex-1"
                step="0.1"
              />
              <button onClick={handleLogWeight} className="btn-primary px-6">
                Save
              </button>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="card mb-4">
          <h3 className="font-bold text-gray-900 mb-3">Settings</h3>
          <div className="space-y-1">
            {[
              { label: 'Daily Calorie Goal', value: '2000 kcal', icon: Target },
              { label: 'Notifications', value: 'On', icon: Settings },
              { label: 'Data Export', value: 'CSV', icon: Settings },
            ].map((item) => (
              <button
                key={item.label}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-400">{item.value}</span>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full card flex items-center justify-center gap-2 text-red-600 font-semibold hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
