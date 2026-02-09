'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PlusCircle, Truck, MapPin, Trash2, Check } from 'lucide-react';
import { categoryEmojis, categories } from '@/lib/data';
import { useAuth } from '@/context/AuthContext';
import {
  API_ROUTES,
  DEFAULT_LISTING_COORDS,
  MODAL_BACKDROP_VARIANTS,
  MODAL_CONTENT_VARIANTS,
} from '@/config/constants';
import { withCsrfHeaders } from '@/lib/csrf';
import { useToast } from '@/context/ToastContext';
import { useListings } from '@/context/ListingsContext';
import type { Listing, NewListingForm, Category, MarketEvent } from '@/types';

interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onListingCreated: (listing: Listing) => void;
  onOpenAuth: () => void;
}

interface SubmitError {
  message: string;
  details?: string;
}

const INITIAL_FORM_STATE: NewListingForm = {
  title: '',
  price: '',
  category: 'Electronics',
  description: '',
  image: null,
  pickupAvailable: true,
  deliveryAvailable: true,
  pickupLocationIds: [],
  leadTime: '',
  marketEvents: [],
};

// Add coords state
interface Coords {
  lat: number;
  lng: number;
}

export function SellModal({
  isOpen,
  onClose,
  onListingCreated,
  onOpenAuth,
}: SellModalProps) {
  const toast = useToast();
  const { user } = useAuth();
  const { addListing } = useListings();
  const [newItem, setNewItem] = useState<NewListingForm>(INITIAL_FORM_STATE);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locationName, setLocationName] = useState<string>(''); // Display name for location
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (newItem.title.trim().length < 3) {
      newErrors['title'] = 'Title must be at least 3 characters';
    }

    const priceValue = newItem.price.replace(/[^0-9]/g, '');
    if (!priceValue || parseInt(priceValue) <= 0) {
      newErrors['price'] = 'Enter a valid price';
    }

    if (!newItem.description.trim()) {
      newErrors['description'] = 'Description is required';
    }

    if (!newItem.pickupAvailable && !newItem.deliveryAvailable) {
      newErrors['fulfillment'] = 'Select at least one option';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Temp state for new market event
  const [newEvent, setNewEvent] = useState<Partial<MarketEvent>>({
    name: '',
    date: '',
    timeWindow: '',
    wazeLink: ''
  });
  const [showEventForm, setShowEventForm] = useState(false);

  const handleClose = () => {
    onClose();
    setNewItem(INITIAL_FORM_STATE);
    setCoords(null);
    setLocationName('');
    setSubmitError(null);
    setErrors({});
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationName('Current GPS Location');
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location", error);
        let msg = "Unable to retrieve location.";
        if (error.code === 1) msg = "Location permission denied. Please enable it in your browser settings.";
        else if (error.code === 2) msg = "Location unavailable. Ensure GPS is on.";
        else if (error.code === 3) msg = "Location request timed out.";
        
        // Check for insecure origin (common in local dev on mobile)
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
           msg += " (Note: GPS requires HTTPS on mobile devices)";
        }
        
        toast.error(msg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleAddEvent = () => {
    if (newEvent.name && newEvent.date) {
      setNewItem({
        ...newItem,
        marketEvents: [
          ...newItem.marketEvents,
          {
            id: Date.now().toString(),
            name: newEvent.name!,
            date: newEvent.date!,
            timeWindow: newEvent.timeWindow || '',
            locationName: newEvent.name!, // defaulting
            wazeLink: newEvent.wazeLink
          } as MarketEvent
        ]
      });
      setNewEvent({ name: '', date: '', timeWindow: '', wazeLink: '' });
      setShowEventForm(false);
    }
  };

  const removeEvent = (id: string) => {
    setNewItem({
      ...newItem,
      marketEvents: newItem.marketEvents.filter(e => e.id !== id)
    });
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    // Require login to post
    if (!user) {
      handleClose();
      onOpenAuth();
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    
    const formData = new FormData();
    formData.append('title', newItem.title);
    formData.append('price', `₡${newItem.price}`);
    formData.append('category', newItem.category);
    formData.append('description', newItem.description);
    
    // Construct pickup config
    const pickupConfig = {
      deliveryAvailable: newItem.deliveryAvailable,
      pickupAvailable: newItem.pickupAvailable,
      leadTime: newItem.leadTime,
      marketEvents: newItem.marketEvents,
      availableLocationIds: newItem.pickupLocationIds
    };
    formData.append('pickupConfig', JSON.stringify(pickupConfig));

    formData.append('sellerId', user.id);
    formData.append('owner', user.name || 'User');
    formData.append('rating', '5.0');
    formData.append('type', 'seller');
    
    // Use detected coords, or saved location coords, or default
    const finalLat = coords?.lat || DEFAULT_LISTING_COORDS.lat;
    const finalLng = coords?.lng || DEFAULT_LISTING_COORDS.lng;

    formData.append('lat', String(finalLat));
    formData.append('lng', String(finalLng));
    if (newItem.image) {
      formData.append('image', newItem.image);
    }

    try {
      const res = await fetch(API_ROUTES.LISTINGS, {
        method: 'POST',
        headers: withCsrfHeaders(),
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        const createdListing = data as Listing;
        addListing(createdListing);
        onListingCreated(createdListing);
        toast.success(`Listing created: ${newItem.title}!`);
        handleClose();
      } else {
        setSubmitError({
          message: data.error || 'Failed to create listing',
          details: data.details,
        });
      }
    } catch {
      setSubmitError({
        message: 'Network error',
        details: 'Could not connect to server. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Create listing">
          <motion.div
            {...MODAL_BACKDROP_VARIANTS}
            onClick={handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            {...MODAL_CONTENT_VARIANTS}
            className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-[#dce5f7]"
          >
            <div className="p-5 sm:p-6 border-b border-[#dce5f7] flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-xl font-black text-[#18284a] uppercase tracking-tight">
                List Your Item
              </h2>
              <button
                onClick={handleClose}
                className="p-2.5 hover:bg-[#edf2ff] rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X className="w-6 h-6 text-[#6f83ad]" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-6 bg-[#fbfcff]">
              {/* Error display */}
              {submitError && (
                <div className="bg-red-50 p-4 rounded-2xl border border-red-200">
                  <p className="text-sm font-bold text-red-800">{submitError.message}</p>
                  {submitError.details && (
                    <p className="text-xs text-red-600 mt-1">{submitError.details}</p>
                  )}
                </div>
              )}
              
              {/* Basic Info */}
                  <div>
                    <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
                      Item Title
                    </label>
                    <input
                      type="text"
                      placeholder="What are you selling?"
                      className="tm-input"
                      value={newItem.title}
                      onChange={(e) =>
                        setNewItem({ ...newItem, title: e.target.value })
                      }
                    />
                    {errors.title && <p className="text-xs text-red-500 font-bold mt-1">{errors.title}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
                        Price (₡)
                      </label>
                      <input
                        type="text"
                        placeholder="15,000"
                        className="tm-input"
                        value={newItem.price}
                        onChange={(e) =>
                          setNewItem({ ...newItem, price: e.target.value })
                        }
                      />
                      {errors.price && <p className="text-xs text-red-500 font-bold mt-1">{errors.price}</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
                        Category
                      </label>
                      <select
                        className="tm-input appearance-none"
                        value={newItem.category}
                        onChange={(e) =>
                          setNewItem({
                            ...newItem,
                            category: e.target.value as Category,
                          })
                        }
                      >
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {categoryEmojis[cat]} {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
                      Description
                    </label>
                    <textarea
                      placeholder="Describe your item... (Condition, details, etc.)"
                      className="tm-input min-h-[100px]"
                      value={newItem.description}
                      onChange={(e) =>
                        setNewItem({ ...newItem, description: e.target.value })
                      }
                    />
                    {errors.description && <p className="text-xs text-red-500 font-bold mt-1">{errors.description}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
                      Item Location
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={handleGetLocation}
                        disabled={isLocating}
                        className={`flex-1 p-3 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 text-sm font-bold ${
                          coords && locationName === 'Current GPS Location'
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'bg-[#f5f8ff] border-[#dce5f7] text-[#465f91] hover:border-[#a7bae0]'
                        }`}
                      >
                        {isLocating ? (
                          <span className="animate-pulse">Locating...</span>
                        ) : (
                          <>
                            <MapPin className="w-4 h-4" />
                            {coords && locationName === 'Current GPS Location' 
                              ? 'Using GPS Location' 
                              : 'Use Current Location'}
                          </>
                        )}
                      </button>
                      
                      {/* Only show "Saved Locations" if user has them */}
                      {user?.pickupLocations && user.pickupLocations.length > 0 && (
                        <select
                           className={`tm-input flex-1 min-h-[48px]`}
                           onChange={(e) => {
                             const locId = e.target.value;
                             if (!locId) return;
                             const loc = user.pickupLocations?.find(l => l.id === locId);
                             if (loc) {
                               setCoords({ lat: loc.coords[0], lng: loc.coords[1] });
                               setLocationName(loc.name);
                             }
                           }}
                           value={locationName !== 'Current GPS Location' ? user.pickupLocations.find(l => l.name === locationName)?.id || '' : ''}
                        >
                          <option value="">Select Saved Location...</option>
                          {user.pickupLocations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    {coords && (
                       <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1">
                         <Check className="w-3 h-3" /> Location set: {locationName}
                       </p>
                    )}
                  </div>

                  {/* Logistics Section */}
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-black text-[#18284a] uppercase">Fulfillment Options</h3>
                    
                    <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f5f8ff] cursor-pointer transition-colors border border-transparent hover:border-[#dce5f7]">
                      <input 
                        type="checkbox"
                        className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={newItem.deliveryAvailable}
                        onChange={(e) => setNewItem({...newItem, deliveryAvailable: e.target.checked})}
                      />
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          <Truck className="w-4 h-4 text-gray-500" />
                          Express Delivery Available
                        </div>
                        <p className="text-xs text-gray-400">Buyers can book a driver to pick this up.</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#f5f8ff] cursor-pointer transition-colors border border-transparent hover:border-[#dce5f7]">
                      <input 
                        type="checkbox"
                        className="w-5 h-5 rounded-md border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={newItem.pickupAvailable} 
                        onChange={(e) => setNewItem({...newItem, pickupAvailable: e.target.checked})} 
                      />
                       <div className="flex-1">
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          Pickup Available
                        </div>
                        <p className="text-xs text-gray-400">Buyers can collect in person.</p>
                      </div>
                    </label>

                    {errors.fulfillment && <p className="text-xs text-red-500 font-bold px-3">{errors.fulfillment}</p>}

                    {newItem.pickupAvailable && (
                    <div className="pl-8 space-y-4">
                       <div>
                        <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
                          Lead Time / Availability
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Ready in 2 days, Available Wednesdays..."
                          className="tm-input min-h-[44px]"
                          value={newItem.leadTime}
                          onChange={(e) => setNewItem({...newItem, leadTime: e.target.value})}
                        />
                      </div>

                      {/* Market Events */}
                      <div>
                        <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
                          Market Days / Events
                        </label>
                        
                        <div className="space-y-2 mb-3">
                          {newItem.marketEvents.map(event => (
                            <div key={event.id} className="bg-blue-50 p-3 rounded-xl flex justify-between items-center group">
                              <div>
                                <div className="font-bold text-sm text-blue-900">{event.name}</div>
                                <div className="text-xs text-blue-600">{event.date} • {event.timeWindow}</div>
                              </div>
                              <button onClick={() => removeEvent(event.id)} className="p-1 hover:bg-blue-100 rounded-lg text-blue-400 hover:text-red-500">
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
                              onChange={e => setNewEvent({...newEvent, name: e.target.value})}
                            />
                            <div className="grid grid-cols-2 gap-2">
                               <input 
                                placeholder="When? (e.g. Sat 7-12)"
                                className="tm-input min-h-[40px] text-sm font-semibold"
                                value={newEvent.date}
                                onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                              />
                               <input 
                                placeholder="Waze Link (Optional)"
                                className="tm-input min-h-[40px] text-sm font-semibold"
                                value={newEvent.wazeLink}
                                onChange={e => setNewEvent({...newEvent, wazeLink: e.target.value})}
                              />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={handleAddEvent} className="flex-1 tm-btn bg-black text-white hover:bg-[#101010] text-xs">Add Event</button>
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

                  <div>
                    <label className="block text-[10px] font-black text-[#7d91b8] uppercase tracking-widest mb-2">
                      Item Image
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full p-4 bg-[#f5f8ff] rounded-2xl border-2 border-dashed border-[#dce5f7] focus:border-blue-500 focus:outline-none font-bold text-[#7d91b8] transition-all cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && file.size > 2 * 1024 * 1024) {
                          toast.error('Image must be smaller than 2MB');
                          e.target.value = '';
                          return;
                        }
                        setNewItem({
                          ...newItem,
                          image: file || null,
                        });
                      }}
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Max file size: 2MB</p>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full tm-btn tm-btn-primary disabled:opacity-70"
                  >
                    <PlusCircle className="w-5 h-5" />{' '}
                    {isSubmitting ? 'Posting...' : 'Post Listing'}
                  </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
