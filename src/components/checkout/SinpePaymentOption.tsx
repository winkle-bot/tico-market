import { Banknote } from 'lucide-react';
import type { CheckoutPaymentMethod, SinpeConfig } from '@/types';

interface SinpePaymentOptionProps {
  paymentMethod: CheckoutPaymentMethod;
  onPaymentMethodChange: (method: CheckoutPaymentMethod) => void;
  sinpeConfig: SinpeConfig | null;
  sinpeReference: string;
  senderPhone: string;
  onSinpeReferenceChange: (value: string) => void;
  onSenderPhoneChange: (value: string) => void;
  orderType?: 'delivery' | 'pickup' | null;
}

export function SinpePaymentOption({
  paymentMethod,
  onPaymentMethodChange,
  sinpeConfig,
  sinpeReference,
  senderPhone,
  onSinpeReferenceChange,
  onSenderPhoneChange,
  orderType,
}: SinpePaymentOptionProps) {
  const sinpeAvailable = Boolean(sinpeConfig?.isEnabled);
  // Cash on delivery is available for pickup and delivery orders
  const cashAvailable = true;

  return (
    <div className="space-y-3 rounded-2xl border border-[#dce5f7] bg-white p-4">
      <h4 className="text-xs font-black uppercase tracking-wider text-[#7d91b8]">Payment Method</h4>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => onPaymentMethodChange('card')}
          className={`rounded-xl border-2 px-3 py-3 text-left transition-colors ${
            paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-[#dce5f7] bg-white'
          }`}
        >
          <p className="text-sm font-black text-[#1f3561]">Card (Stripe)</p>
          <p className="text-xs text-[#6881b1]">Instant confirmation</p>
        </button>

        <button
          type="button"
          onClick={() => sinpeAvailable && onPaymentMethodChange('sinpe_movil')}
          disabled={!sinpeAvailable}
          className={`rounded-xl border-2 px-3 py-3 text-left transition-colors ${
            paymentMethod === 'sinpe_movil'
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-[#dce5f7] bg-white'
          } ${!sinpeAvailable ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          <p className="text-sm font-black text-[#1f3561]">SINPE Movil</p>
          <p className="text-xs text-[#6881b1]">Bank transfer</p>
        </button>

        <button
          type="button"
          onClick={() => cashAvailable && onPaymentMethodChange('cash')}
          disabled={!cashAvailable}
          className={`rounded-xl border-2 px-3 py-3 text-left transition-colors ${
            paymentMethod === 'cash'
              ? 'border-amber-500 bg-amber-50'
              : 'border-[#dce5f7] bg-white'
          }`}
        >
          <p className="text-sm font-black text-[#1f3561] flex items-center gap-1">
            <Banknote className="w-4 h-4" /> Cash
          </p>
          <p className="text-xs text-[#6881b1]">
            {orderType === 'delivery' ? 'Pay on delivery' : 'Pay at pickup'}
          </p>
        </button>
      </div>

      {paymentMethod === 'sinpe_movil' && sinpeAvailable && sinpeConfig && (
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
          <div className="text-sm">
            <p className="font-black text-[#1f3561]">{sinpeConfig.label}</p>
            <p className="text-[#3e5c8f]">Phone: {sinpeConfig.phoneNumber}</p>
            <p className="text-[#3e5c8f]">Account: {sinpeConfig.accountHolder}</p>
            {sinpeConfig.instructions && <p className="mt-1 text-xs text-[#4a6798]">{sinpeConfig.instructions}</p>}
          </div>

          <label className="block text-[11px] font-black uppercase tracking-wider text-[#56749f]">
            SINPE Reference *
            <input
              className="tm-input mt-1"
              placeholder="Transfer reference / comprobante"
              value={sinpeReference}
              onChange={(e) => onSinpeReferenceChange(e.target.value)}
            />
          </label>

          <label className="block text-[11px] font-black uppercase tracking-wider text-[#56749f]">
            Sender Phone (optional)
            <input
              className="tm-input mt-1"
              placeholder="8888-8888"
              value={senderPhone}
              onChange={(e) => onSenderPhoneChange(e.target.value)}
            />
          </label>
        </div>
      )}

      {paymentMethod === 'cash' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
          <p className="text-sm font-bold text-amber-800">
            {orderType === 'delivery'
              ? 'Pay the driver in cash when your order arrives. Please have exact change ready.'
              : 'Pay the seller in cash when you pick up the item.'}
          </p>
        </div>
      )}
    </div>
  );
}
