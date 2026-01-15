import React from 'react';

const LoadingSpinner = ({ text = 'Carregando...' }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className="animate-spin rounded-full border-4 border-zinc-800 border-t-emerald-500 h-10 w-10"
        aria-label="loading"
      />
      <div className="text-zinc-400 text-sm">{text}</div>
    </div>
  );
};

export default LoadingSpinner;