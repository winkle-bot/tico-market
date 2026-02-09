import { useI18n } from '@/context/I18nContext';
import type { NewListingForm } from '@/types';

interface SellImageUploadProps {
  form: NewListingForm;
  setForm: (next: NewListingForm) => void;
  onInvalidSize: () => void;
}

export function SellImageUpload({ form, setForm, onInvalidSize }: SellImageUploadProps) {
  const { t } = useI18n();

  return (
    <div>
      <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
        {t('sell.image')}
      </label>
      <input
        type="file"
        accept="image/*"
        className="w-full p-4 bg-[#f5f8ff] rounded-2xl border-2 border-dashed border-[#dce5f7] focus:border-blue-500 focus:outline-none font-bold text-[#7d91b8] transition-all cursor-pointer"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && file.size > 2 * 1024 * 1024) {
            onInvalidSize();
            e.target.value = '';
            return;
          }
          setForm({ ...form, image: file || null });
        }}
      />
      <p className="text-[10px] text-gray-400 mt-1">Max file size: 2MB</p>
    </div>
  );
}
