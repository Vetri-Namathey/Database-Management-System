import React, { useEffect, useState } from 'react';

interface Props {
  targetIso?: string; // ISO string target time; if not provided, component shows zeros
  onComplete?: () => void;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function EstimatedStartTimer({ targetIso, onComplete }: Props) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!targetIso) {
      setRemaining(0);
      return;
    }

    // Be forgiving about incoming formats: if string lacks timezone, try appending Z
    let parsedTime = new Date(targetIso);
    if (isNaN(parsedTime.getTime())) {
      try {
        let alt = targetIso;
        if (!alt.includes('T') && alt.includes(' ')) alt = alt.replace(' ', 'T');
        if (!alt.endsWith('Z')) alt = alt + 'Z';
        parsedTime = new Date(alt);
      } catch (e) {
        parsedTime = new Date(targetIso);
      }
    }

    const target = parsedTime.getTime();

    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((target - now) / 1000));
      setRemaining(diff);
      if (diff === 0 && onComplete) onComplete();
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetIso, onComplete]);

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  // Format the target time for display
  const formatScheduledTime = () => {
    if (!targetIso) return 'Time not set';
    
    try {
      let parsedTime = new Date(targetIso);
      if (isNaN(parsedTime.getTime())) {
        let alt = targetIso;
        if (!alt.includes('T') && alt.includes(' ')) alt = alt.replace(' ', 'T');
        if (!alt.endsWith('Z')) alt = alt + 'Z';
        parsedTime = new Date(alt);
      }
      
      return parsedTime.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'Invalid time format';
    }
  };

  return (
    <div className="bg-slate-800/80 rounded-2xl p-6 text-center text-white max-w-xl mx-auto">
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className="text-2xl font-semibold inline-flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white opacity-90"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 3"></path></svg>
          Countdown to Start
        </div>
      </div>

      {/* Display scheduled time */}
      <div className="mb-6 p-4 bg-white/10 rounded-xl">
        <div className="text-sm text-gray-300 mb-1">Scheduled Start Time</div>
        <div className="text-lg font-semibold text-orange-300">{formatScheduledTime()}</div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl p-6">
          <div className="text-3xl font-extrabold">{pad(hours)}</div>
          <div className="text-xs mt-1">Hours</div>
        </div>
        <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl p-6">
          <div className="text-3xl font-extrabold">{pad(minutes)}</div>
          <div className="text-xs mt-1">Minutes</div>
        </div>
        <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl p-6">
          <div className="text-3xl font-extrabold">{pad(seconds)}</div>
          <div className="text-xs mt-1">Seconds</div>
        </div>
      </div>

      <div>
        <button className="bg-amber-700 text-white px-6 py-2 rounded-full">
          {remaining > 0 ? 'Auction starting soon...' : 'Admin will start shortly'}
        </button>
      </div>
    </div>
  );
}
