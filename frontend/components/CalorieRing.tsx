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
  size = 200,
  strokeWidth = 14,
}: CalorieRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(consumed / goal, 1);
  const strokeDashoffset = circumference - percentage * circumference;
  const remaining = Math.max(goal - consumed, 0);

  const getColor = () => {
    if (percentage > 1) return '#ef4444';
    if (percentage > 0.85) return '#f97316';
    return '#22c55e';
  };

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f3f4f6"
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
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">{remaining}</span>
        <span className="text-xs text-gray-500 font-medium">remaining</span>
        <span className="text-sm text-gray-400 mt-1">/ {goal} kcal</span>
      </div>
    </div>
  );
}
