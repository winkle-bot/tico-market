'use client';

import { X } from 'lucide-react';
import { categoryEmojis, categories } from '@/lib/data';
import type { Category } from '@/types';

interface FilterBarProps {
  view: 'list' | 'map';
  onViewChange: (view: 'list' | 'map') => void;
  selectedCategories: Category[];
  onToggleCategory: (category: Category) => void;
  onClearCategories: () => void;
}

export function FilterBar({
  view,
  onViewChange,
  selectedCategories,
  onToggleCategory,
  onClearCategories,
}: FilterBarProps) {
  return (
    <div className="bg-white/90 backdrop-blur-lg border-b border-[#dce5f7] p-3 sm:p-4 sticky top-16 z-40">
      <div className="tm-shell flex flex-col gap-3 sm:gap-2 sm:flex-row sm:justify-between sm:items-center">
        <div className="flex gap-2">
          <button
            onClick={() => onViewChange('list')}
            className={`tm-btn px-4 py-2 text-[0.72rem] ${
              view === 'list'
                ? 'tm-btn-primary'
                : 'tm-btn-muted'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => onViewChange('map')}
            className={`tm-btn px-4 py-2 text-[0.72rem] ${
              view === 'map'
                ? 'tm-btn-primary'
                : 'tm-btn-muted'
            }`}
          >
            Map View
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-sm font-medium text-gray-500">
          {selectedCategories.length > 0 && (
            <button
              onClick={onClearCategories}
              className="tm-chip bg-red-50 text-red-600 border-red-100 hover:bg-red-100 whitespace-nowrap"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onToggleCategory(category as Category)}
              className={`tm-chip whitespace-nowrap ${
                selectedCategories.includes(category as Category)
                  ? 'tm-chip-active'
                  : ''
              }`}
            >
              <span>{categoryEmojis[category]}</span>
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
