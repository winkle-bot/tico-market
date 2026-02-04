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
    <div className="bg-white border-b p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => onViewChange('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => onViewChange('map')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'map'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Map View
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar text-sm font-medium text-gray-500">
          {selectedCategories.length > 0 && (
            <button
              onClick={onClearCategories}
              className="bg-red-50 text-red-600 px-3 py-1 rounded-full border border-red-100 whitespace-nowrap hover:bg-red-100 transition-colors flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onToggleCategory(category as Category)}
              className={`px-3 py-1 rounded-full border whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategories.includes(category as Category)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
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
