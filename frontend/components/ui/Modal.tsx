import React, { useEffect } from 'react';
import { XIcon } from './icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'md' }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#172B4D]/35 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} rounded-3xl bg-white/95 backdrop-blur-xl border border-[#809DC4]/30 shadow-[0_20px_60px_-15px_rgba(36,139,255,0.25)] overflow-hidden z-10 flex flex-col max-h-[90vh]`}
      >
        {/* Soft top gradient accent line */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[#248BFF] via-[#20C9F8] to-[#8B78F6]" />

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4.5 border-b border-[#809DC4]/20 bg-white/70">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#172B4D] tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-[#71819A] font-mono mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#71819A] hover:text-[#172B4D] hover:bg-[#F0F4FA] border border-transparent hover:border-[#809DC4]/20 transition"
            aria-label="Close modal"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div
          className="p-6 overflow-y-auto min-h-0 flex-1"
          style={{ maxHeight: 'calc(90vh - 150px)', overscrollBehavior: 'contain' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
