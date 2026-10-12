import React from 'react';

interface PixelCoinPouchProps {
  amount: number;
  maxAmount: number;
  className?: string;
}

export const PixelCoinPouch: React.FC<PixelCoinPouchProps> = ({
  amount,
  maxAmount: _maxAmount,
  className = 'w-7 h-7 sm:w-8 sm:h-8',
}) => {
  const isEmpty = amount === 0;

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Radiant Golden Yellow Mecidiye Coin (Sarı Sikke Simgesi) */}
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_2px_8px_rgba(234,179,8,0.5)] transition-transform duration-200 hover:scale-110"
      >
        <defs>
          <radialGradient id="yellowCoinGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#facc15" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#eab308" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="yellowCoinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="25%" stopColor="#fde047" />
            <stop offset="70%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
          <linearGradient id="yellowCoinRim" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="50%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>

        {/* Outer Warm Ambient Glow */}
        <circle cx="16" cy="16" r="15" fill="url(#yellowCoinGlow)" />

        {/* Drop Shadow */}
        <ellipse cx="16" cy="27" rx="10" ry="2.5" fill="rgba(0,0,0,0.45)" />

        {/* Stacked coin bottom rim (3D thickness effect) */}
        <ellipse cx="16" cy="18" rx="10" ry="9" fill="#92400e" />
        <ellipse cx="16" cy="17" rx="10" ry="9" fill="#b45309" />

        {/* Main Golden Coin Face */}
        <circle
          cx="16"
          cy="15"
          r="9.5"
          fill={isEmpty ? '#a8a29e' : 'url(#yellowCoinGrad)'}
          stroke={isEmpty ? '#78716c' : 'url(#yellowCoinRim)'}
          strokeWidth="1.5"
        />

        {/* Raised Outer Milled Border */}
        <circle
          cx="16"
          cy="15"
          r="7.5"
          stroke={isEmpty ? '#78716c' : '#ca8a04'}
          strokeWidth="0.9"
          strokeDasharray="1.2 1.2"
          fill="none"
        />

        {/* Inner Coin Core Area */}
        <circle
          cx="16"
          cy="15"
          r="6.2"
          fill={isEmpty ? '#78716c' : '#f59e0b'}
          opacity="0.25"
        />

        {/* Imperial Ottoman Crescent & Star Emblem (Hilal ve Yıldız) */}
        {!isEmpty ? (
          <g>
            {/* Golden Crescent */}
            <path
              d="M17 11.2 C14.5 11.2 12.5 12.9 12.5 15 C12.5 17.1 14.5 18.8 17 18.8 C15.6 18.8 14.2 17.4 14.2 15 C14.2 12.6 15.6 11.2 17 11.2 Z"
              fill="#78350f"
            />
            {/* Star */}
            <path
              d="M18.8 14.2 L19.4 15.4 L20.7 15.4 L19.6 16.1 L20 17.3 L18.8 16.5 L17.6 17.3 L18 16.1 L16.9 15.4 L18.2 15.4 Z"
              fill="#78350f"
            />
            {/* Top-left Diamond Specular Glint */}
            <circle cx="12" cy="11" r="1.5" fill="#ffffff" />
            <circle cx="12" cy="11" r="0.8" fill="#fef9c3" />
          </g>
        ) : (
          <circle cx="16" cy="15" r="4" fill="#57534e" />
        )}
      </svg>
    </div>
  );
};
