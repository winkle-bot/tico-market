'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Truck, MapPin } from 'lucide-react';
import { MODAL_BACKDROP_VARIANTS, MODAL_CONTENT_VARIANTS, DELIVERY_FEE_DISPLAY } from '@/config/constants';
import { useToast } from '@/context/ToastContext';
import type { Listing, BookingStep } from '@/types';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: Listing[];
}

export function BookingModal({ isOpen, onClose, drivers }: BookingModalProps) {
  const toast = useToast();
  const [bookingStep, setBookingStep] = useState<BookingStep>(1);
  const [selectedDriver, setSelectedDriver] = useState<Listing | null>(null);

  const handleClose = () => {
    onClose();
    // Reset state after modal closes
    setTimeout(() => {
      setBookingStep(1);
      setSelectedDriver(null);
    }, 200);
  };

  const handleBooking = () => {
    toast.success(`Booking requested! ${selectedDriver?.owner || 'Your driver'} is on their way.`);
    handleClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            {...MODAL_BACKDROP_VARIANTS}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            {...MODAL_CONTENT_VARIANTS}
            className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-[#dce5f7]"
          >
            <div className="p-5 sm:p-6 border-b border-[#dce5f7] flex justify-between items-center">
              <h2 className="text-xl font-black text-[#18284a] uppercase tracking-tight">
                {bookingStep === 1 ? 'Choose Your Driver' : 'Confirm Delivery'}
              </h2>
              <button
                onClick={handleClose}
                className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X className="w-6 h-6 text-[#6f83ad]" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              {bookingStep === 1 ? (
                <div className="space-y-4">
                  <p className="text-sm text-[#6f83ad] font-medium">
                    Available drivers near your area in San José:
                  </p>
                  {drivers.length > 0 ? (
                    drivers.map((driver) => (
                      <div
                        key={driver.id}
                        onClick={() => {
                          setSelectedDriver(driver);
                          setBookingStep(2);
                        }}
                        className="flex items-center justify-between p-4 rounded-2xl border-2 border-[#e2eafe] hover:border-blue-500 cursor-pointer transition-all group min-h-16"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-lg">
                            {driver.owner[0]}
                          </div>
                          <div>
                            <h3 className="font-bold text-[#18284a]">
                              {driver.owner}
                            </h3>
                            <div className="flex items-center gap-1 text-orange-500 text-xs font-black">
                              <Star className="w-3 h-3 fill-current" />{' '}
                              {driver.rating}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-[#7d91b8] uppercase tracking-widest block mb-1">
                            Fee
                          </span>
                          <span className="text-blue-600 font-black">
                            {DELIVERY_FEE_DISPLAY}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-[#dce5f7] bg-[#f5f8ff] p-4 text-sm text-[#465f91]">
                      No drivers are available right now. Please try again in a few minutes.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <Truck className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-black text-blue-900 uppercase text-xs tracking-widest mb-1">
                        Delivery Summary
                      </h4>
                      <p className="text-blue-800 text-sm font-medium">
                        Express delivery with {selectedDriver?.owner}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
                        Pick-up Location
                      </label>
                      <div className="flex items-center gap-2 p-3 bg-[#f7faff] rounded-xl border border-[#dce5f7]">
                        <MapPin className="w-4 h-4 text-[#7d91b8]" />
                        <span className="text-sm font-bold text-[#334d80]">
                          Central Market, San José
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
                        Drop-off Location
                      </label>
                      <div className="flex items-center gap-2 p-3 bg-[#f7faff] rounded-xl border border-[#dce5f7]">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        <input
                          type="text"
                          placeholder="Enter your address..."
                          className="tm-input bg-transparent border-none shadow-none focus:shadow-none p-0 min-h-0 rounded-none text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleBooking}
                    className="w-full tm-btn tm-btn-primary"
                  >
                    Book Now • {DELIVERY_FEE_DISPLAY}
                  </button>
                  <button
                    onClick={() => setBookingStep(1)}
                    className="w-full text-[#7d91b8] font-bold text-xs uppercase tracking-widest hover:text-[#465f91] transition-colors min-h-10"
                  >
                    Change Driver
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
