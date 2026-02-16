import { categories, categoryEmojis } from '@/lib/data';
import { useI18n } from '@/context/I18nContext';
import type { Category, NewListingForm, ListingCondition, ListingItemType, ListingCurrency } from '@/types';

interface SellBasicFieldsProps {
  form: NewListingForm;
  errors: Record<string, string>;
  setForm: (next: NewListingForm) => void;
}

const CONDITIONS: { value: ListingCondition; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'for_parts', label: 'For Parts' },
];

const ITEM_TYPES: { value: ListingItemType; label: string; emoji: string }[] = [
  { value: 'physical', label: 'Physical Good', emoji: '📦' },
  { value: 'food', label: 'Food / Produce', emoji: '🍎' },
  { value: 'service', label: 'Service', emoji: '🔧' },
  { value: 'rental', label: 'Rental', emoji: '🔑' },
  { value: 'free', label: 'Free / Giveaway', emoji: '🎁' },
];

export function SellBasicFields({ form, errors, setForm }: SellBasicFieldsProps) {
  const { t } = useI18n();

  return (
    <>
      <div>
        <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
          {t('sell.itemTitle')}
        </label>
        <input
          type="text"
          placeholder="What are you selling?"
          className="tm-input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        {errors.title && <p className="text-xs text-red-500 font-bold mt-1">{errors.title}</p>}
      </div>

      {/* Item Type chips */}
      <div>
        <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
          Item Type
        </label>
        <div className="flex flex-wrap gap-2">
          {ITEM_TYPES.map((it) => (
            <button
              key={it.value}
              type="button"
              onClick={() => setForm({ ...form, itemType: it.value })}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                form.itemType === it.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {it.emoji} {it.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
            {t('sell.price')}
          </label>
          <div className="flex gap-2">
            <select
              className="tm-input w-20 appearance-none text-center font-bold"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value as ListingCurrency })}
            >
              <option value="CRC">₡</option>
              <option value="USD">$</option>
            </select>
            <input
              type="text"
              placeholder={form.currency === 'CRC' ? '15.000' : '50'}
              className="tm-input flex-1"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          {form.itemType === 'free' && (
            <p className="text-[10px] text-green-600 font-bold mt-1">Free item - price will show as "Free"</p>
          )}
          {errors.price && <p className="text-xs text-red-500 font-bold mt-1">{errors.price}</p>}
        </div>
        <div>
          <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
            {t('sell.category')}
          </label>
          <select
            className="tm-input appearance-none"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {categoryEmojis[category]} {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Condition selector */}
      {form.itemType !== 'service' && form.itemType !== 'food' && (
        <div>
          <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
            Condition
          </label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm({ ...form, condition: c.value })}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  form.condition === c.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
          {t('sell.description')}
        </label>
        <textarea
          placeholder="Describe your item... (Condition, details, etc.)"
          className="tm-input min-h-[100px]"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        {errors.description && <p className="text-xs text-red-500 font-bold mt-1">{errors.description}</p>}
      </div>
    </>
  );
}
