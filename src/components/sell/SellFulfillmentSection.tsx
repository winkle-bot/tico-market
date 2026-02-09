import { MapPin, PlusCircle, Trash2, Truck } from 'lucide-react';
import { useI18n } from '@/context/I18nContext';
import type { MarketEvent, NewListingForm } from '@/types';

interface SellFulfillmentSectionProps {
  form: NewListingForm;
  errors: Record<string, string>;
  newEvent: Partial<MarketEvent>;
  showEventForm: boolean;
  setForm: (next: NewListingForm) => void;
  setNewEvent: (event: Partial<MarketEvent>) => void;
  setShowEventForm: (show: boolean) => void;
  onAddEvent: () => void;
  onRemoveEvent: (id: string) => void;
}

export function SellFulfillmentSection({
  form,
  errors,
  newEvent,
  showEventForm,
  setForm,
  setNewEvent,
  setShowEventForm,
  onAddEvent,
  onRemoveEvent,
}: SellFulfillmentSectionProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4 pt-4 border-t border-gray-100">
      <h3 className="text-sm font-black text-[#18284a] uppercase">{t('sell.fulfillment')}</h3>

      <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f5f8ff] cursor-pointer transition-colors border border-transparent hover:border-[#dce5f7]">
        <input
          type="checkbox"
          className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={form.deliveryAvailable}
          onChange={(e) => setForm({ ...form, deliveryAvailable: e.target.checked })}
        />
        <div className="flex-1">
          <div className="font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-500" />
            {t('sell.expressAvailable')}
          </div>
          <p className="text-xs text-gray-400">Buyers can book a driver to pick this up.</p>
        </div>
      </label>

      <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f5f8ff] cursor-pointer transition-colors border border-transparent hover:border-[#dce5f7]">
        <input
          type="checkbox"
          className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500"
          checked={form.pickupAvailable}
          onChange={(e) => setForm({ ...form, pickupAvailable: e.target.checked })}
        />
        <div className="flex-1">
          <div className="font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            {t('sell.pickupAvailable')}
          </div>
          <p className="text-xs text-gray-400">Buyers can collect in person.</p>
        </div>
      </label>

      {errors.fulfillment && <p className="text-xs text-red-500 font-bold px-3">{errors.fulfillment}</p>}

      {form.pickupAvailable && (
        <div className="pl-8 space-y-4">
          <div>
            <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
              Lead Time / Availability
            </label>
            <input
              type="text"
              placeholder="e.g. Ready in 2 days, Available Wednesdays..."
              className="tm-input min-h-[44px]"
              value={form.leadTime}
              onChange={(e) => setForm({ ...form, leadTime: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
              Market Days / Events
            </label>

            <div className="space-y-2 mb-3">
              {form.marketEvents.map((event) => (
                <div key={event.id} className="bg-blue-50 p-3 rounded-xl flex justify-between items-center group">
                  <div>
                    <div className="font-bold text-sm text-blue-900">{event.name}</div>
                    <div className="text-xs text-blue-600">{event.date} • {event.timeWindow}</div>
                  </div>
                  <button onClick={() => onRemoveEvent(event.id)} className="p-1 hover:bg-blue-100 rounded-lg text-blue-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {showEventForm ? (
              <div className="bg-[#f5f8ff] p-3 rounded-xl border border-[#dce5f7] space-y-3">
                <input
                  placeholder="Event Name (e.g. Feria de Escazú)"
                  className="tm-input min-h-[40px] text-sm font-semibold"
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="When? (e.g. Sat 7-12)"
                    className="tm-input min-h-[40px] text-sm font-semibold"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  />
                  <input
                    placeholder="Waze Link (Optional)"
                    className="tm-input min-h-[40px] text-sm font-semibold"
                    value={newEvent.wazeLink}
                    onChange={(e) => setNewEvent({ ...newEvent, wazeLink: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={onAddEvent} className="flex-1 tm-btn bg-black text-white hover:bg-[#101010] text-xs">Add Event</button>
                  <button onClick={() => setShowEventForm(false)} className="px-3 tm-btn tm-btn-muted text-xs">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowEventForm(true)}
                className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"
              >
                <PlusCircle className="w-3 h-3" /> Add Market/Event
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
