import { categories, categoryEmojis } from '@/lib/data';
import { useI18n } from '@/context/I18nContext';
import type { Category, NewListingForm, ListingCondition, ListingItemType, ListingCurrency } from '@/types';

interface SellBasicFieldsProps {
  form: NewListingForm;
  errors: Record<string, string>;
  setForm: (next: NewListingForm) => void;
}

const CONDITION_KEYS: { value: ListingCondition; key: string }[] = [
  { value: 'new', key: 'condition.new' },
  { value: 'like_new', key: 'condition.like_new' },
  { value: 'good', key: 'condition.good' },
  { value: 'fair', key: 'condition.fair' },
  { value: 'for_parts', key: 'condition.for_parts' },
];

const ITEM_TYPE_KEYS: { value: ListingItemType; key: string; emoji: string }[] = [
  { value: 'physical', key: 'itemType.physical', emoji: '📦' },
  { value: 'food', key: 'itemType.food', emoji: '🍎' },
  { value: 'service', key: 'itemType.service', emoji: '🔧' },
  { value: 'rental', key: 'itemType.rental', emoji: '🔑' },
  { value: 'free', key: 'itemType.free', emoji: '🎁' },
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
          placeholder={t('sell.titlePlaceholder', 'What are you selling?')}
          className="tm-input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        {errors.title && <p className="text-xs text-red-500 font-bold mt-1">{errors.title}</p>}
      </div>

      {/* Item Type chips */}
      <div>
        <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
          {t('sell.itemType', 'Item Type')}
        </label>
        <div className="flex flex-wrap gap-2">
          {ITEM_TYPE_KEYS.map((it) => (
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
              {it.emoji} {t(it.key)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
            {t('sell.price')}
          </label>
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
            <select
              className="tm-input !w-full shrink-0 appearance-none px-3 text-center font-bold"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value as ListingCurrency })}
            >
              <option value="CRC">₡</option>
              <option value="USD">$</option>
            </select>
            <input
              type="text"
              placeholder={form.currency === 'CRC' ? '15.000' : '50'}
              className="tm-input min-w-0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          {form.itemType === 'free' && (
            <p className="text-[10px] text-green-600 font-bold mt-1">{t('sell.freeItem', 'Free item - price will show as "Free"')}</p>
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
            {t('sell.condition', 'Condition')}
          </label>
          <div className="flex flex-wrap gap-2">
            {CONDITION_KEYS.map((c) => (
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
                {t(c.key)}
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
          placeholder={t('sell.descriptionPlaceholder', 'Describe your item... (Condition, details, etc.)')}
          className="tm-input min-h-[100px]"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        {errors.description && <p className="text-xs text-red-500 font-bold mt-1">{errors.description}</p>}
      </div>
    </>
  );
}
