import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface CountdownRingProps {
  duration: number; // in seconds
  currentTime: number; // current countdown value
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
}

export function CountdownRing({
  duration,
  currentTime,
  size = 120,
  strokeWidth = 8,
  className,
  children
}: CountdownRingProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const percentage = ((duration - currentTime) / duration) * 100;
    setProgress(Math.max(0, Math.min(100, percentage)));
  }, [currentTime, duration]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getStrokeColor = () => {
    if (currentTime <= 10) return 'hsl(var(--destructive))';
    if (currentTime <= 20) return 'hsl(var(--warning))';
    return 'hsl(var(--primary))';
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-20"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getStrokeColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums">
              {Math.max(0, currentTime)}
            </div>
            <div className="text-xs text-muted-foreground">seconds</div>
          </div>
        )}
      </div>
    </div>
  );
}