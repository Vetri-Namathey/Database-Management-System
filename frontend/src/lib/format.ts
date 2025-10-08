import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';

dayjs.extend(relativeTime);
dayjs.extend(duration);

export const formatCurrency = (amount: number): string => {
  return `₹${amount.toFixed(2)} Cr`;
};

export const formatTime = (date: string | Date): string => {
  return dayjs(date).format('MMM DD, YYYY HH:mm');
};

export const formatRelativeTime = (date: string | Date): string => {
  return dayjs(date).fromNow();
};

export const formatDuration = (seconds: number): string => {
  const duration = dayjs.duration(seconds, 'seconds');
  const minutes = Math.floor(duration.asMinutes());
  const secs = duration.seconds();
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const formatPlayerRole = (role: string): string => {
  switch (role) {
    case 'BATTER':
      return 'Batsman';
    case 'BOWLER':
      return 'Bowler';
    case 'ALL-ROUNDER':
      return 'All-Rounder';
    case 'WICKET-KEEPER':
      return 'Wicket-Keeper';
    default:
      return role;
  }
};

export const getRoleBadgeColor = (role: string): string => {
  switch (role) {
    case 'BATTER':
      return 'bg-blue-100 text-blue-800';
    case 'BOWLER':
      return 'bg-red-100 text-red-800';
    case 'ALL-ROUNDER':
      return 'bg-green-100 text-green-800';
    case 'WICKET-KEEPER':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};