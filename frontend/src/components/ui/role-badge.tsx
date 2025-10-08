import { Badge } from '@/components/ui/badge';
import { formatPlayerRole, getRoleBadgeColor } from '@/lib/format';
import { cn } from '@/lib/utils';

interface RoleBadgeProps {
  role: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function RoleBadge({ role, className, size = 'md' }: RoleBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };

  return (
    <Badge
      variant="secondary"
      className={cn(
        getRoleBadgeColor(role),
        sizeClasses[size],
        'font-medium',
        className
      )}
    >
      {formatPlayerRole(role)}
    </Badge>
  );
}