import React from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
  className?: string;
  imageOnly?: boolean;
}

const sizeMap = {
  xs: { img: 24, box: 'w-6 h-6', text: 'text-xs', sub: 'text-[9px]' },
  sm: { img: 32, box: 'w-8 h-8', text: 'text-sm', sub: 'text-[10px]' },
  md: { img: 40, box: 'w-10 h-10', text: 'text-base', sub: 'text-xs' },
  lg: { img: 48, box: 'w-12 h-12', text: 'text-lg', sub: 'text-xs' },
  xl: { img: 64, box: 'w-16 h-16', text: 'text-2xl', sub: 'text-sm' },
};

export function Logo({
  size = 'md',
  showText = true,
  subtitle,
  className = '',
  imageOnly = false,
}: LogoProps) {
  const currentSize = sizeMap[size] || sizeMap.md;

  if (imageOnly) {
    return (
      <div className={`relative ${currentSize.box} rounded-xl overflow-hidden shrink-0 shadow-lg shadow-indigo-500/20 ring-1 ring-white/10 ${className}`}>
        <Image
          src="/icon.png"
          alt="XamPlus Logo"
          width={currentSize.img}
          height={currentSize.img}
          className="w-full h-full object-cover"
          priority
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative ${currentSize.box} rounded-xl overflow-hidden shrink-0 shadow-lg shadow-indigo-500/25 ring-1 ring-white/10 bg-slate-900`}>
        <Image
          src="/icon.png"
          alt="XamPlus Logo"
          width={currentSize.img}
          height={currentSize.img}
          className="w-full h-full object-cover"
          priority
        />
      </div>
      {showText && (
        <div className="leading-tight">
          <div className={`${currentSize.text} font-black text-white tracking-tight flex items-center gap-1`}>
            <span>XamPlus</span>
          </div>
          {subtitle && (
            <span className={`${currentSize.sub} text-indigo-400 font-medium block`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
