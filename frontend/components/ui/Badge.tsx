import React from 'react';

export type BadgeVariant =
  | 'cyan'
  | 'violet'
  | 'mint'
  | 'amber'
  | 'rose'
  | 'muted'
  | 'blue'
  | 'emerald'
  | 'lavender';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({
  children,
  variant = 'blue',
  className = '',
  size = 'md',
  dot = false,
}: BadgeProps) {
  const variantStyles: Record<BadgeVariant, string> = {
    blue: 'bg-[#E8F4FF] text-[#248BFF] border border-[#248BFF]/30 font-semibold',
    cyan: 'bg-[#E8FAFF] text-[#0098CC] border border-[#20C9F8]/35 font-semibold',
    lavender: 'bg-[#F2EFFE] text-[#7A63F4] border border-[#8B78F6]/30 font-semibold',
    violet: 'bg-[#F2EFFE] text-[#7A63F4] border border-[#8B78F6]/30 font-semibold',
    mint: 'bg-[#E8FAF4] text-[#139B79] border border-[#17B890]/35 font-semibold',
    emerald: 'bg-[#E8FAF4] text-[#139B79] border border-[#17B890]/35 font-semibold',
    amber: 'bg-[#FEF5E9] text-[#D48220] border border-[#F4A340]/40 font-semibold',
    rose: 'bg-[#FEEFF1] text-[#D83852] border border-[#EF5B72]/35 font-semibold',
    muted: 'bg-[#F0F4FA] text-[#71819A] border border-[#809DC4]/25',
  };

  const dotColors: Record<BadgeVariant, string> = {
    blue: 'bg-[#248BFF]',
    cyan: 'bg-[#20C9F8]',
    lavender: 'bg-[#8B78F6]',
    violet: 'bg-[#8B78F6]',
    mint: 'bg-[#17B890]',
    emerald: 'bg-[#17B890]',
    amber: 'bg-[#F4A340]',
    rose: 'bg-[#EF5B72]',
    muted: 'bg-[#71819A]',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-mono tracking-wider uppercase',
    md: 'text-xs px-2.5 py-1 font-mono tracking-wider',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} animate-pulse`} />
      )}
      {children}
    </span>
  );
}
