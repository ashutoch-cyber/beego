'use client';

interface MacroBarProps {
  protein: number;
  carbs: number;
  fat: number;
  proteinGoal?: number;
  carbsGoal?: number;
  fatGoal?: number;
}

export default function MacroBar({
  protein,
  carbs,
  fat,
  proteinGoal = 150,
  carbsGoal = 250,
  fatGoal = 65,
}: MacroBarProps) {
  const macros = [
    { label: 'Protein', value: protein, goal: proteinGoal, color: 'bg-blue-500', textColor: 'text-blue-600' },
    { label: 'Carbs', value: carbs, goal: carbsGoal, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
    { label: 'Fat', value: fat, goal: fatGoal, color: 'bg-red-500', textColor: 'text-red-600' },
  ];

  return (
    <div className="space-y-4">
      {macros.map((macro) => {
        const pct = Math.min((macro.value / macro.goal) * 100, 100);
        return (
          <div key={macro.label}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-semibold text-gray-700">{macro.label}</span>
              <span className={`text-sm font-bold ${macro.textColor}`}>
                {Math.round(macro.value)}g <span className="text-gray-400 font-normal">/ {macro.goal}g</span>
              </span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${macro.color} rounded-full transition-all duration-700 ease-out`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
