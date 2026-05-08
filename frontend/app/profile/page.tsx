'use client';

import { useState, useEffect } from 'react';
import { User, LogOut, Scale, Target, Settings, ChevronRight, Bell, Download, Save, X, Loader2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { exportData, getProfile, getWeightHistory, logWeight, updateProfile } from '@/lib/api';
import { cacheWeight } from '@/lib/offline';

type GoalForm = {
  calorie_goal: string;
  protein_goal: string;
  carbs_goal: string;
  fat_goal: string;
  water_goal: string;
  weight_goal: string;
};

const defaultGoals: GoalForm = {
  calorie_goal: '2000',
  protein_goal: '150',
  carbs_goal: '250',
  fat_goal: '65',
  water_goal: '2500',
  weight_goal: '70',
};

export default function ProfilePage() {
  const [weight, setWeight] = useState('');
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [goals, setGoals] = useState<GoalForm>(defaultGoals);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingGoals, setSavingGoals] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const token = localStorage.getItem('token');
    setNotificationsEnabled(localStorage.getItem('notificationsEnabled') === 'true');

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser(payload);
      } catch {}
    }

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const [profileData, weightHistory, exported] = await Promise.all([
        getProfile(),
        getWeightHistory(),
        exportData(),
      ]);

      setProfile(profileData);
      setGoals(profileToGoals(profileData));

      const latest = weightHistory?.[0]?.weight ?? profileData?.current_weight ?? null;
      setLatestWeight(latest !== null ? Number(latest) : null);
      setStreak(calculateStreak(exported?.meals || []));
    } catch (err: any) {
      setError(err.message || 'Could not load profile settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogWeight() {
    const w = parseFloat(weight);
    if (!w || w <= 0) return;

    setError('');
    setStatus('');
    try {
      await logWeight(w);
      setLatestWeight(w);
      setStatus('Weight logged');
    } catch {
      const today = new Date().toISOString().split('T')[0];
      await cacheWeight({ date: today, weight: w });
      setLatestWeight(w);
      setStatus('Weight saved offline');
    }

    setWeight('');
    setShowWeightInput(false);
  }

  async function handleSaveGoals() {
    const payload = goalsToPayload(goals);
    if (!payload) {
      setError('Enter valid positive numbers for your goals.');
      return;
    }

    setSavingGoals(true);
    setError('');
    setStatus('');
    try {
      await updateProfile(payload);
      setProfile({ ...profile, ...payload });
      setShowGoals(false);
      setStatus('Goals updated');
    } catch (err: any) {
      setError(err.message || 'Could not update goals');
    } finally {
      setSavingGoals(false);
    }
  }

  async function handleToggleNotifications() {
    setError('');
    setStatus('');

    if (notificationsEnabled) {
      localStorage.setItem('notificationsEnabled', 'false');
      setNotificationsEnabled(false);
      setStatus('Notifications turned off');
      return;
    }

    if (!('Notification' in window)) {
      setError('Notifications are not supported in this browser.');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      localStorage.setItem('notificationsEnabled', 'false');
      setNotificationsEnabled(false);
      setError('Notification permission was not granted.');
      return;
    }

    localStorage.setItem('notificationsEnabled', 'true');
    setNotificationsEnabled(true);
    setStatus('Notifications turned on');
  }

  async function handleExportData() {
    setExporting(true);
    setError('');
    setStatus('');

    try {
      const data = await exportData();
      downloadCsv(buildCsv(data), `nutrisnap-export-${new Date().toISOString().split('T')[0]}.csv`);
      setStatus('CSV export downloaded');
    } catch (err: any) {
      setError(err.message || 'Could not export data');
    } finally {
      setExporting(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  const calorieGoal = Number(profile?.calorie_goal || goals.calorie_goal || 2000);

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
        {loading && (
          <div className="card mb-4 flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm">Loading profile...</span>
          </div>
        )}

        {(status || error) && (
          <div className={`card mb-4 ${error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
            <p className="text-sm font-medium">{error || status}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="card p-4 text-center">
            <Target className="mx-auto text-primary-600 mb-1" size={20} />
            <p className="text-lg font-bold text-gray-900">{Math.round(calorieGoal)}</p>
            <p className="text-[10px] text-gray-400">Cal Goal</p>
          </div>
          <div className="card p-4 text-center">
            <Scale className="mx-auto text-blue-500 mb-1" size={20} />
            <p className="text-lg font-bold text-gray-900">{latestWeight ? latestWeight.toFixed(1) : '--'}</p>
            <p className="text-[10px] text-gray-400">Weight (kg)</p>
          </div>
          <div className="card p-4 text-center">
            <Settings className="mx-auto text-orange-500 mb-1" size={20} />
            <p className="text-lg font-bold text-gray-900">{streak}</p>
            <p className="text-[10px] text-gray-400">Day Streak</p>
          </div>
        </div>

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

        <div className="card mb-4">
          <h3 className="font-bold text-gray-900 mb-3">Settings</h3>
          <div className="space-y-1">
            <SettingsRow
              icon={Target}
              label="Daily Calorie Goal"
              value={`${Math.round(calorieGoal)} kcal`}
              onClick={() => setShowGoals(!showGoals)}
            />
            <SettingsRow
              icon={Bell}
              label="Notifications"
              value={notificationsEnabled ? 'On' : 'Off'}
              onClick={handleToggleNotifications}
            />
            <SettingsRow
              icon={Download}
              label="Data Export"
              value={exporting ? 'Exporting...' : 'CSV'}
              onClick={handleExportData}
              disabled={exporting}
            />
          </div>
        </div>

        {showGoals && (
          <div className="card mb-4 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Edit Goals</h3>
              <button onClick={() => setShowGoals(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <GoalInput label="Calories" value={goals.calorie_goal} onChange={(value) => setGoals({ ...goals, calorie_goal: value })} />
              <GoalInput label="Protein (g)" value={goals.protein_goal} onChange={(value) => setGoals({ ...goals, protein_goal: value })} />
              <GoalInput label="Carbs (g)" value={goals.carbs_goal} onChange={(value) => setGoals({ ...goals, carbs_goal: value })} />
              <GoalInput label="Fat (g)" value={goals.fat_goal} onChange={(value) => setGoals({ ...goals, fat_goal: value })} />
              <GoalInput label="Water (ml)" value={goals.water_goal} onChange={(value) => setGoals({ ...goals, water_goal: value })} />
              <GoalInput label="Weight Goal (kg)" value={goals.weight_goal} onChange={(value) => setGoals({ ...goals, weight_goal: value })} />
            </div>
            <button onClick={handleSaveGoals} disabled={savingGoals} className="btn-primary w-full mt-4">
              {savingGoals ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} /> Saving...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Save size={18} /> Save Goals
                </span>
              )}
            </button>
          </div>
        )}

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

function SettingsRow({
  icon: Icon,
  label,
  value,
  onClick,
  disabled = false,
}: {
  icon: any;
  label: string;
  value: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60"
    >
      <div className="flex items-center gap-3">
        <Icon size={18} className="text-gray-400" />
        <span className="text-sm font-medium text-gray-700">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm text-gray-400">{value}</span>
        <ChevronRight size={16} className="text-gray-300" />
      </div>
    </button>
  );
}

function GoalInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500 mb-1 block">{label}</span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field text-sm"
      />
    </label>
  );
}

function profileToGoals(profile: any): GoalForm {
  return {
    calorie_goal: String(profile?.calorie_goal || defaultGoals.calorie_goal),
    protein_goal: String(profile?.protein_goal || defaultGoals.protein_goal),
    carbs_goal: String(profile?.carbs_goal || defaultGoals.carbs_goal),
    fat_goal: String(profile?.fat_goal || defaultGoals.fat_goal),
    water_goal: String(profile?.water_goal || defaultGoals.water_goal),
    weight_goal: String(profile?.weight_goal || defaultGoals.weight_goal),
  };
}

function goalsToPayload(goals: GoalForm) {
  const payload = {
    calorie_goal: Number(goals.calorie_goal),
    protein_goal: Number(goals.protein_goal),
    carbs_goal: Number(goals.carbs_goal),
    fat_goal: Number(goals.fat_goal),
    water_goal: Number(goals.water_goal),
    weight_goal: Number(goals.weight_goal),
  };

  return Object.values(payload).every((value) => Number.isFinite(value) && value > 0) ? payload : null;
}

function calculateStreak(meals: any[]) {
  const dates = new Set(meals.map((meal) => String(meal.date || '').slice(0, 10)).filter(Boolean));
  let streak = 0;
  const cursor = new Date();

  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function buildCsv(data: any) {
  const rows = [
    ['section', 'date', 'name_or_metric', 'calories', 'protein', 'carbs', 'fat', 'amount', 'weight', 'meal_type'],
    ...(data?.meals || []).map((meal: any) => [
      'meal',
      meal.date || meal.created_at || '',
      meal.food_name || '',
      meal.calories || 0,
      meal.protein || 0,
      meal.carbs || 0,
      meal.fat || 0,
      '',
      '',
      meal.meal_type || '',
    ]),
    ...(data?.weights || []).map((item: any) => ['weight', item.date || item.created_at || '', 'weight', '', '', '', '', '', item.weight || '', '']),
    ...(data?.water || []).map((item: any) => ['water', item.date || item.created_at || '', 'water', '', '', '', '', item.amount || '', '', '']),
  ];

  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

function csvCell(value: any) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(csv: string, fileName: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
