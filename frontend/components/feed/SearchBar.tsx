'use client';

import React from 'react';
import { SearchFilters, PostCategory } from '../../lib/types';
import { SearchIcon, XIcon } from '../ui/icons';

interface SearchBarProps {
  filters: SearchFilters;
  onFiltersChange: (newFilters: SearchFilters) => void;
  activeCategoryTab?: PostCategory | 'all';
}

export function SearchBar({ filters, onFiltersChange, activeCategoryTab }: SearchBarProps) {
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      query: e.target.value,
    });
  };

  const handleStatusChange = (status: any) => {
    onFiltersChange({
      ...filters,
      itemStatus: status === 'all' ? undefined : status,
    });
  };

  const handleClear = () => {
    onFiltersChange({
      query: '',
      itemStatus: undefined,
      category: undefined,
    });
  };

  const hasActiveFilters = Boolean(filters.query || filters.itemStatus);

  return (
    <div className="p-3 rounded-2xl bg-white/80 backdrop-blur-md border border-[#809DC4]/25 shadow-sm space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#809DC4]"
          />
          <input
            type="text"
            value={filters.query || ''}
            onChange={handleQueryChange}
            placeholder="Search drops, keywords, items, tags, or skills..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#F0F4FA] border border-[#809DC4]/25 text-xs text-[#172B4D] placeholder:text-[#809DC4] outline-none focus:border-[#248BFF] focus:bg-white transition"
          />
          {filters.query && (
            <button
              onClick={() => onFiltersChange({ ...filters, query: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71819A] hover:text-[#172B4D]"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="px-3 py-2 rounded-xl text-xs font-semibold text-[#EF5B72] hover:bg-[#FEEFF1] transition shrink-0"
          >
            Reset
          </button>
        )}
      </div>

      {/* Sub-filter pills for Lost & Found */}
      {activeCategoryTab === 'lost_found' && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-[#809DC4]/15 overflow-x-auto text-xs">
          <span className="text-[10px] font-mono text-[#71819A] uppercase tracking-wider shrink-0 mr-1">
            Status:
          </span>
          {[
            { id: 'all', label: 'All Items' },
            { id: 'lost', label: 'Lost Only' },
            { id: 'found', label: 'Found Only' },
            { id: 'claim_pending', label: 'Claim Pending' },
            { id: 'returned', label: 'Returned' },
          ].map((pill) => {
            const isSelected = (!filters.itemStatus && pill.id === 'all') || filters.itemStatus === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => handleStatusChange(pill.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition shrink-0 ${
                  isSelected
                    ? 'bg-[#248BFF] text-white shadow-xs font-bold'
                    : 'bg-[#F0F4FA] text-[#71819A] hover:text-[#172B4D]'
                }`}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
