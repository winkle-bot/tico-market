import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  doublePrecision,
  timestamp,
} from 'drizzle-orm/pg-core';

export const driverProfiles = pgTable('driver_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  vehicleType: text('vehicle_type', {
    enum: ['motorcycle', 'car', 'pickup', 'bike', 'walker'],
  }),
  faceImageUrl: text('face_image_url'),
  isVerified: boolean('is_verified').default(false),
  verificationStatus: text('verification_status', {
    enum: ['none', 'pending', 'approved', 'rejected'],
  })
    .notNull()
    .default('none'),
  licenseImageKey: text('license_image_key'),
  specialties: text('specialties').array().default([]),
  isOnline: boolean('is_online').default(false),
  liveNow: boolean('live_now').default(false),
  baseRate: integer('base_rate'),
  currentLat: doublePrecision('current_lat'),
  currentLng: doublePrecision('current_lng'),
  capacityDescription: text('capacity_description'),
  serviceRadiusKm: integer('service_radius_km').default(10),
  baseLocationLat: doublePrecision('base_location_lat'),
  baseLocationLng: doublePrecision('base_location_lng'),
  totalDeliveries: integer('total_deliveries').default(0),
  rating: doublePrecision('rating').default(5.0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
