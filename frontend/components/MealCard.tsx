'use client';

import { Clock, Utensils } from 'lucide-react';
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
  breakfast: 'bg-[#fff4e6] text-[#b85c00]',
  lunch: 'bg-[#e5f5ec] text-[#0f7a3b]',
  dinner: 'bg-[#eaf1ff] text-[#3156a3]',
  snack: 'bg-[#f0eafe] text-[#6d45b8]',
};

export default function MealCard({ meal }: MealCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-[1.5rem] border border-[#dce8e1] bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl ${mealTypeColors[meal.meal_type] || mealTypeColors.snack}`}>
        {meal.image_url ? (
          <img src={meal.image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <Utensils size={22} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-black text-[#183c2a]">{meal.food_name}</h4>
        <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-[#7b9587]">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {format(new Date(meal.date), 'h:mm a')}
          </span>
          <span className="rounded-full bg-[#f0f8f4] px-2 py-0.5 capitalize text-[#0f7a3b]">{meal.meal_type}</span>
        </div>
      </div>
      <div className="text-right">
        <span className="text-lg font-black text-[#183c2a]">{Math.round(meal.calories)}</span>
        <span className="ml-1 text-xs font-semibold text-[#7b9587]">Cal</span>
        <div className="mt-0.5 text-[10px] font-semibold text-[#8aa093]">
          P:{Math.round(meal.protein)}g C:{Math.round(meal.carbs)}g F:{Math.round(meal.fat)}g
        </div>
      </div>
    </div>
  );
}
