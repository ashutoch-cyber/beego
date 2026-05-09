'use client';

interface CalorieRingProps {
  consumed: number;
  goal: number;
  size?: number;
  strokeWidth?: number;
}

export default function CalorieRing({
  consumed,
  goal,
  size = 214,
  strokeWidth = 16,
}: CalorieRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const rawPercentage = goal > 0 ? consumed / goal : 0;
  const percentage = Math.min(rawPercentage, 1);
  const strokeDashoffset = circumference - percentage * circumference;

  const getColor = () => {
    if (rawPercentage > 1) return '#dc2626';
    if (rawPercentage > 0.85) return '#f59e0b';
    return '#2D6A4F';
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e8f1ec"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          filter="drop-shadow(0 8px 14px rgba(15, 122, 59, 0.18))"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black tracking-tight text-[#103f27]">{Math.round(consumed)}</span>
        <span className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#65806f]">of {Math.round(goal)} Cal</span>
        <span className="mt-3 rounded-full bg-[#edf6f1] px-3 py-1 text-xs font-bold text-[#2D6A4F]">
          {Math.round(rawPercentage * 100)}% consumed
        </span>
      </div>
    </div>
  );
}
