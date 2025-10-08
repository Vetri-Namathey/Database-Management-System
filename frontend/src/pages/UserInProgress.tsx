import React from 'react';

export default function UserInProgress() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-100 to-green-300">
      <div className="bg-white/80 rounded-2xl shadow-xl p-10 flex flex-col items-center">
        <h1 className="text-4xl font-bold text-green-700 mb-4">User Page In Progress</h1>
        <p className="text-lg text-green-900 mb-2">This user feature is coming soon!</p>
        <p className="text-green-500">Please check back later or contact the development team for updates.</p>
      </div>
    </div>
  );
}
