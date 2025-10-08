import React from 'react';

type StampProps = {
  variant: 'sold' | 'sold-to-you' | 'unsold';
  fullScreen?: boolean;
  // structured content for full screen
  title?: string; // e.g., 'SOLD!'
  playerName?: string; // Player display name and role
  price?: string; // e.g., '₹ 12,00,000'
  teamText?: string; // e.g., 'to Team Name (T01)'
  // fallback short text for small stamp
  text?: string;
};

const Stamp: React.FC<StampProps> = ({
  variant,
  fullScreen = false,
  title,
  playerName,
  price,
  teamText,
  text,
}) => {
  // Colors by variant
  const color = variant === 'unsold' ? 'bg-gray-800 text-gray-200' : variant === 'sold-to-you' ? 'bg-green-600 text-white' : 'bg-red-600 text-white';

  if (fullScreen) {
    // Large centered framed panel that resembles the provided image: rounded, padded, bold title, content rows
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className="max-w-3xl w-full px-6">
          <div className={`mx-auto ${color} rounded-2xl shadow-2xl border-4 border-white/20 p-8 text-center`}>
            <div className="text-6xl font-extrabold tracking-tight mb-3">{title || (variant === 'unsold' ? 'UNSOLD' : 'SOLD!')}</div>
            {playerName && <div className="text-2xl font-semibold mb-1">{playerName}</div>}
            {price && <div className="text-xl opacity-90 mb-3">{price}</div>}
            {teamText && <div className="text-sm uppercase tracking-wider opacity-90">{teamText}</div>}
          </div>
        </div>
      </div>
    );
  }

  // small rotated stamp for card-level contexts
  return (
    <div className="absolute top-2 right-2 z-20 pointer-events-none">
      <div className={`transform -rotate-6 inline-block font-bold tracking-wider px-3 py-1 rounded ${color} text-sm`}>{text || (variant === 'unsold' ? 'UNSOLD' : 'SOLD')}</div>
    </div>
  );
};

export default Stamp;

