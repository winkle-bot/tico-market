import { X, Camera } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import type { NewListingForm } from '@/types';

interface SellImageUploadProps {
  form: NewListingForm;
  setForm: (next: NewListingForm) => void;
  onInvalidSize: () => void;
}

const MAX_IMAGES = 8;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export function SellImageUpload({ form, setForm, onInvalidSize }: SellImageUploadProps) {
  const { t } = useI18n();

  const handleAddImages = (files: FileList | null) => {
    if (!files) return;
    const newImages = [...form.images];
    for (let i = 0; i < files.length && newImages.length < MAX_IMAGES; i++) {
      if (files[i].size > MAX_FILE_SIZE) {
        onInvalidSize();
        continue;
      }
      newImages.push(files[i]);
    }
    setForm({ ...form, images: newImages });
  };

  const removeImage = (index: number) => {
    const newImages = form.images.filter((_, i) => i !== index);
    setForm({ ...form, images: newImages });
  };

  return (
    <div>
      <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
        {t('sell.image')} ({form.images.length}/{MAX_IMAGES})
      </label>

      {/* Preview grid */}
      {form.images.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          {form.images.map((file, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
              <img
                src={URL.createObjectURL(file)}
                alt={`Upload ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
              {i === 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-blue-600/80 text-white text-[9px] font-bold text-center py-0.5">
                  Cover
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {form.images.length < MAX_IMAGES && (
        <label className="flex items-center justify-center gap-2 w-full p-4 bg-[#f5f8ff] rounded-2xl border-2 border-dashed border-[#dce5f7] hover:border-blue-400 focus-within:border-blue-500 font-bold text-[#7d91b8] transition-all cursor-pointer">
          <Camera className="w-5 h-5" />
          <span>{form.images.length === 0 ? 'Add Photos' : 'Add More'}</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            onChange={(e) => handleAddImages(e.target.files)}
          />
        </label>
      )}
      <p className="text-[10px] text-gray-400 mt-1">Max {MAX_IMAGES} photos, 2MB each. First photo is the cover.</p>
    </div>
  );
}
