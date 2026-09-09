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
      {/* Handcrafted Pixel Art Ottoman Leather Coin Pouch (Mecidiye Kesesi) */}
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-transform duration-200 hover:scale-105"
        style={{ shapeRendering: 'crispEdges' }}
      >
        {/* Shadow underneath */}
        <ellipse cx="16" cy="29" rx="10" ry="2" fill="rgba(0,0,0,0.4)" />

        {/* Golden coins peeking from top opening when pouch has coins */}
        {!isEmpty && (
          <g>
            {/* Rear coin 1 */}
            <circle cx="13" cy="8" r="3" fill="#b45309" />
            <circle cx="13" cy="8" r="2" fill="#fbbf24" />
            {/* Rear coin 2 */}
            <circle cx="18" cy="7" r="3.2" fill="#d97706" />
            <circle cx="18" cy="7" r="2.2" fill="#fde047" />
            {/* Sparkle glint on top coin */}
            <rect x="18" y="5" width="1.5" height="1.5" fill="#ffffff" />
          </g>
        )}

        {/* Leather Pouch Body - Outline / Deep Shadow */}
        <path
          d="
            M12 9 H20 V11 H22 V13 H24 V17 H25 V23 H24 V25 H22 V27 H18 V28 H14 V27 H10 V25 H8 V23 H7 V17 H8 V13 H10 V11 H12 V9 Z
          "
          fill="#351403"
        />

        {/* Leather Base Fill - Dark/Warm Umber */}
        <path
          d="
            M13 10 H19 V12 H21 V14 H23 V17 H24 V22 H23 V24 H21 V26 H18 V27 H14 V26 H11 V24 H9 V22 H8 V17 H9 V14 H11 V12 H13 V10 Z
          "
          fill={isEmpty ? '#542308' : '#78350f'}
        />

        {/* Midtone Leather Texture */}
        <path
          d="
            M14 12 H18 V14 H20 V16 H22 V21 H21 V23 H19 V25 H15 V25 H12 V23 H10 V21 H10 V16 H12 V14 H14 V12 Z
          "
          fill={isEmpty ? '#6c2e0b' : '#92400e'}
        />

        {/* Sunlight Highlight (Top-left leather facet) */}
        <path
          d="
            M14 12 H17 V13 H13 V16 H11 V20 H10 V16 H12 V14 H14 V12 Z
            M12 17 H14 V21 H12 V17 Z
            M15 14 H18 V15 H15 V14 Z
          "
          fill={isEmpty ? '#853e12' : '#b45309'}
        />

        {/* Soft Warm Glint */}
        <rect x="13" y="14" width="2" height="2" fill={isEmpty ? '#9a4714' : '#d97706'} />

        {/* Top Ruffled Leather Collar (Folded open mouth of the purse) */}
        <path
          d="
            M10 8 H13 V10 H10 Z
            M15 7 H17 V9 H15 Z
            M19 8 H22 V10 H19 Z
          "
          fill="#a14e13"
        />
        <path
          d="
            M11 9 H12 V10 H11 Z
            M16 8 H17 V9 H16 Z
            M20 9 H21 V10 H20 Z
          "
          fill="#fbbf24"
          opacity={isEmpty ? '0.3' : '0.8'}
        />

        {/* Golden Drawstring Cord (Tied around neck at y=11) */}
        <rect x="11" y="11" width="10" height="2" fill="#d97706" />
        <rect x="12" y="11" width="8" height="1" fill="#fde047" />

        {/* Center Knot & Golden Dangling Tassels */}
        <rect x="15" y="11" width="2" height="3" fill="#f59e0b" />
        <rect x="15.5" y="12" width="1" height="1" fill="#ffffff" />
        {/* Left tassel string */}
        <rect x="14" y="13" width="1.5" height="3" fill="#d97706" />
        <rect x="13.5" y="16" width="2" height="2" fill="#fbbf24" />
        {/* Right tassel string */}
        <rect x="17" y="13" width="1.5" height="4" fill="#b45309" />
        <rect x="16.5" y="17" width="2" height="2" fill="#fde047" />

        {/* Embossed Ottoman Mecidiye Gold Emblem in Center of Pouch */}
        <g opacity={isEmpty ? '0.45' : '1.0'}>
          {/* Embossed medallion backing */}
          <circle cx="16" cy="19.5" r="3.5" fill="#451a03" />
          <circle cx="16" cy="19.5" r="3" fill="#b45309" />
          <circle cx="16" cy="19.5" r="2.2" fill="#fbbf24" />
          {/* Crescent & Star impression */}
          <path
            d="
              M16.8 18.2 C15.5 18.2 14.5 19 14.5 20 C14.5 21 15.5 21.8 16.8 21.8 C16.2 21.8 15.5 21.2 15.5 20 C15.5 18.8 16.2 18.2 16.8 18.2 Z
            "
            fill="#78350f"
          />
          <rect x="17" y="19.2" width="1" height="1" fill="#78350f" />
        </g>

        {/* Stitched leather seam details */}
        <line x1="10" y1="21" x2="10" y2="23" stroke="#260e02" strokeWidth="0.8" />
        <line x1="22" y1="21" x2="22" y2="23" stroke="#260e02" strokeWidth="0.8" />
        <line x1="14" y1="26" x2="18" y2="26" stroke="#260e02" strokeWidth="0.8" />
      </svg>
    </div>
  );
};
