'use client';

interface MacroBarProps {
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  proteinGoal?: number;
  carbsGoal?: number;
  fatGoal?: number;
  fiberGoal?: number;
}

export default function MacroBar({
  protein,
  carbs,
  fat,
  fiber = 0,
  proteinGoal = 150,
  carbsGoal = 250,
  fatGoal = 65,
  fiberGoal = 25,
}: MacroBarProps) {
  const macros = [
    { label: 'Protein', value: protein, goal: proteinGoal, bar: 'bg-[#1f8a70]', track: 'bg-[#dcefe8]', text: 'text-[#0f5132]' },
    { label: 'Carbs', value: carbs, goal: carbsGoal, bar: 'bg-[#e2a634]', track: 'bg-[#f8ecd2]', text: 'text-[#9a650c]' },
    { label: 'Fat', value: fat, goal: fatGoal, bar: 'bg-[#d95a3f]', track: 'bg-[#f7dfd8]', text: 'text-[#a43c28]' },
    { label: 'Fibre', value: fiber, goal: fiberGoal, bar: 'bg-[#7c5cc4]', track: 'bg-[#ece6f8]', text: 'text-[#5b3fa3]' },
  ];

  return (
    <div className="space-y-3">
      {macros.map((macro) => {
        const rawPct = macro.goal > 0 ? (macro.value / macro.goal) * 100 : 0;
        const pct = Math.min(rawPct, 100);
        const isOver = rawPct > 100;
        return (
          <div key={macro.label} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#e7eee9]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-extrabold text-[#183c2a]">{macro.label}</span>
              <span className={`text-sm font-black ${isOver ? 'text-[#b42318]' : macro.text}`}>
                {Math.round(macro.value)}g <span className="font-semibold text-[#8aa093]">/ {macro.goal}g</span>
              </span>
            </div>
            <div className={`h-3 overflow-hidden rounded-full ${macro.track}`}>
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${isOver ? 'bg-[#dc2626]' : macro.bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] font-bold text-[#8aa093]">
              <span>Target</span>
              <span className={isOver ? 'text-[#b42318]' : ''}>{Math.round(rawPct)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
