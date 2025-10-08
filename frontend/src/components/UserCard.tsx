import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface UserProfile {
  id: number;
  username: string;
  full_name?: string | null;
  teamName?: string | null;
  walletBalance?: number | null;
  joinedAt?: string | null;
  role?: string | null;
}

export default function UserCard({ user }: { user: UserProfile }) {
  const displayName = user.full_name || user.username;
  const initials = user.username ? user.username.split(' ').map(s => s[0]).join('').slice(0,2) : 'U';

  return (
    <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-800/40 p-3 rounded-lg shadow-sm">
      <Avatar>
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-gray-800 dark:text-slate-100">{displayName}</div>
          {user.role && (
            <Badge className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200">{user.role}</Badge>
          )}
        </div>
        <div className="text-sm text-gray-500 dark:text-slate-400">{user.teamName}</div>
      </div>
      <div className="text-right text-sm text-gray-600 dark:text-slate-300">
        <div className="font-medium">{user.walletBalance ? Math.round(user.walletBalance) : '-'}</div>
        <div className="text-xs">joined</div>
      </div>
    </div>
  );
}
