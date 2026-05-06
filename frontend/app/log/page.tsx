'use client';

import { useState } from 'react';
import { Search, Plus, Minus, Save, Utensils } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { logMeal } from '@/lib/api';
import { cacheMeal } from '@/lib/offline';

const commonFoods = [
  { name: 'Rice (1 cup)', calories: 200, protein: 4, carbs: 45, fat: 0.5 },
  { name: 'Roti (1 piece)', calories: 80, protein: 3, carbs: 15, fat: 0.5 },
  { name: 'Dal (1 cup)', calories: 150, protein: 9, carbs: 20, fat: 5 },
  { name: 'Chicken Curry (1 cup)', calories: 250, protein: 25, carbs: 8, fat: 12 },
  { name: 'Paneer Tikka (100g)', calories: 265, protein: 18, carbs: 6, fat: 20 },
  { name: 'Idli (2 pieces)', calories: 120, protein: 4, carbs: 24, fat: 0.5 },
  { name: 'Dosa (1 piece)', calories: 180, protein: 4, carbs: 30, fat: 6 },
  { name: 'Samosa (1 piece)', calories: 260, protein: 4, carbs: 30, fat: 14 },
  { name: 'Biryani (1 cup)', calories: 350, protein: 12, carbs: 45, fat: 12 },
  { name: 'Egg (1 boiled)', calories: 70, protein: 6, carbs: 0.6, fat: 5 },
  { name: 'Banana (1 medium)', calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { name: 'Milk (1 cup)', calories: 150, protein: 8, carbs: 12, fat: 8 },
  { name: 'Oats (1 cup cooked)', calories: 150, protein: 5, carbs: 27, fat: 2.5 },
  { name: 'Apple (1 medium)', calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { name: 'Yogurt (1 cup)', calories: 150, protein: 12, carbs: 17, fat: 4 },
];

export default function LogPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [servings, setServings] = useState(1);
  const [mealType, setMealType] = useState('breakfast');
  const [customMode, setCustomMode] = useState(false);
  const [customFood, setCustomFood] = useState({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [saved, setSaved] = useState(false);

  const filtered = commonFoods.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSave() {
    const food = customMode ? customFood : selected;
    if (!food) return;

    const meal = {
      food_name: food.name,
      calories: Math.round(food.calories * servings),
      protein: Math.round(food.protein * servings * 10) / 10,
      carbs: Math.round(food.carbs * servings * 10) / 10,
      fat: Math.round(food.fat * servings * 10) / 10,
      meal_type: mealType,
    };

    try {
      await logMeal(meal);
    } catch {
      await cacheMeal({ ...meal, date: new Date().toISOString() });
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setSelected(null);
      setCustomMode(false);
      setServings(1);
      setSearch('');
      setCustomFood({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
    }, 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 text-white pt-12 pb-8 px-6 rounded-b-[2.5rem]">
        <h1 className="text-2xl font-bold">Log Meal</h1>
        <p className="text-primary-100 text-sm mt-1">Search or add custom food</p>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4">
        {saved ? (
          <div className="card text-center py-12 animate-slide-up">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Save className="text-green-600" size={28} />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Saved!</h3>
            <p className="text-gray-500 text-sm mt-1">Meal has been logged successfully.</p>
          </div>
        ) : (
          <>
            {/* Search */}
            {!selected && !customMode && (
              <div className="card">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search food..."
                    className="input-field pl-10"
                  />
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {filtered.map((food) => (
                    <button
                      key={food.name}
                      onClick={() => setSelected(food)}
                      className="w-full text-left p-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{food.name}</p>
                        <p className="text-xs text-gray-400">
                          {food.calories} kcal · P:{food.protein}g C:{food.carbs}g F:{food.fat}g
                        </p>
                      </div>
                      <Plus size={18} className="text-gray-300 group-hover:text-primary-600 transition-colors" />
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCustomMode(true)}
                  className="btn-secondary w-full mt-4 text-sm"
                >
                  <Utensils size={16} className="inline mr-2" />
                  Add Custom Food
                </button>
              </div>
            )}

            {/* Custom Food Form */}
            {customMode && (
              <div className="card animate-slide-up">
                <h3 className="font-bold text-gray-900 mb-4">Custom Food</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={customFood.name}
                    onChange={(e) => setCustomFood({ ...customFood, name: e.target.value })}
                    placeholder="Food name"
                    className="input-field"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      value={customFood.calories || ''}
                      onChange={(e) => setCustomFood({ ...customFood, calories: Number(e.target.value) })}
                      placeholder="Calories"
                      className="input-field"
                    />
                    <input
                      type="number"
                      value={customFood.protein || ''}
                      onChange={(e) => setCustomFood({ ...customFood, protein: Number(e.target.value) })}
                      placeholder="Protein (g)"
                      className="input-field"
                    />
                    <input
                      type="number"
                      value={customFood.carbs || ''}
                      onChange={(e) => setCustomFood({ ...customFood, carbs: Number(e.target.value) })}
                      placeholder="Carbs (g)"
                      className="input-field"
                    />
                    <input
                      type="number"
                      value={customFood.fat || ''}
                      onChange={(e) => setCustomFood({ ...customFood, fat: Number(e.target.value) })}
                      placeholder="Fat (g)"
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Selected Food / Servings */}
            {(selected || customMode) && (
              <div className="card mt-4 animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">{customMode ? customFood.name || 'Custom Food' : selected.name}</h3>
                  <button
                    onClick={() => { setSelected(null); setCustomMode(false); }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    Change
                  </button>
                </div>

                <div className="flex items-center justify-center gap-4 mb-6">
                  <button
                    onClick={() => setServings(Math.max(0.5, servings - 0.5))}
                    className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <Minus size={18} />
                  </button>
                  <div className="text-center w-20">
                    <span className="text-2xl font-bold text-gray-900">{servings}</span>
                    <p className="text-xs text-gray-400">servings</p>
                  </div>
                  <button
                    onClick={() => setServings(servings + 0.5)}
                    className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-500 font-medium mb-2">Total</p>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="font-bold text-gray-900">
                        {Math.round((customMode ? customFood.calories : selected.calories) * servings)}
                      </p>
                      <p className="text-[10px] text-gray-400">kcal</p>
                    </div>
                    <div>
                      <p className="font-bold text-blue-600">
                        {Math.round((customMode ? customFood.protein : selected.protein) * servings * 10) / 10}g
                      </p>
                      <p className="text-[10px] text-gray-400">protein</p>
                    </div>
                    <div>
                      <p className="font-bold text-yellow-600">
                        {Math.round((customMode ? customFood.carbs : selected.carbs) * servings * 10) / 10}g
                      </p>
                      <p className="text-[10px] text-gray-400">carbs</p>
                    </div>
                    <div>
                      <p className="font-bold text-red-600">
                        {Math.round((customMode ? customFood.fat : selected.fat) * servings * 10) / 10}g
                      </p>
                      <p className="text-[10px] text-gray-400">fat</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Meal Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setMealType(type)}
                        className={`py-2 rounded-xl text-xs font-semibold capitalize transition-all ${
                          mealType === type
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleSave} className="btn-primary w-full">
                  <Save size={16} className="inline mr-2" />
                  Save Meal
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
