import { cn } from '@/lib/utils';

interface LoadingProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse';
}

export function Loading({ className, size = 'md', variant = 'spinner' }: LoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  if (variant === 'spinner') {
    return (
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-primary border-t-transparent',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  if (variant === 'dots') {
    return (
      <div className={cn('flex space-x-1', className)}>
        <div className="animate-bounce rounded-full bg-primary h-2 w-2" style={{ animationDelay: '0ms' }} />
        <div className="animate-bounce rounded-full bg-primary h-2 w-2" style={{ animationDelay: '150ms' }} />
        <div className="animate-bounce rounded-full bg-primary h-2 w-2" style={{ animationDelay: '300ms' }} />
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div
        className={cn(
          'animate-pulse-soft rounded-lg bg-primary/20',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return null;
}