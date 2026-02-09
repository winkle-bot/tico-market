import { categories, categoryEmojis } from '@/lib/data';
import { useI18n } from '@/context/I18nContext';
import type { Category, NewListingForm } from '@/types';

interface SellBasicFieldsProps {
  form: NewListingForm;
  errors: Record<string, string>;
  setForm: (next: NewListingForm) => void;
}

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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
            {t('sell.price')}
          </label>
          <input
            type="text"
            placeholder="15,000"
            className="tm-input"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
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
