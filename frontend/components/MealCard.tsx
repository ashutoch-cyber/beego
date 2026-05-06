'use client';

import { Utensils, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface MealCardProps {
  meal: {
    id: number;
    food_name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    meal_type: string;
    date: string;
    image_url?: string;
  };
}

const mealTypeColors: Record<string, string> = {
  breakfast: 'bg-orange-50 text-orange-600 border-orange-100',
  lunch: 'bg-green-50 text-green-600 border-green-100',
  dinner: 'bg-blue-50 text-blue-600 border-blue-100',
  snack: 'bg-purple-50 text-purple-600 border-purple-100',
};

const mealTypeIcons: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍿',
};

export default function MealCard({ meal }: MealCardProps) {
  return (
    <div className="card flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${mealTypeColors[meal.meal_type] || mealTypeColors.snack}`}>
        {meal.image_url ? (
          <img src={meal.image_url} alt="" className="w-full h-full object-cover rounded-xl" />
        ) : (
          mealTypeIcons[meal.meal_type] || '🍽️'
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 truncate">{meal.food_name}</h4>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {format(new Date(meal.date), 'h:mm a')}
          </span>
          <span className="capitalize bg-gray-100 px-2 py-0.5 rounded-full">{meal.meal_type}</span>
        </div>
      </div>
      <div className="text-right">
        <span className="text-lg font-bold text-gray-900">{Math.round(meal.calories)}</span>
        <span className="text-xs text-gray-400 ml-1">kcal</span>
        <div className="text-[10px] text-gray-400 mt-0.5">
          P:{Math.round(meal.protein)}g C:{Math.round(meal.carbs)}g F:{Math.round(meal.fat)}g
        </div>
      </div>
    </div>
  );
}
