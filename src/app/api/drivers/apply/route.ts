import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { sanitizeText } from '@/lib/security';
import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

const applySchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  vehicleType: z.enum(['motorcycle', 'car', 'pickup']),
  faceImageBase64: z.string().min(100), // base64-encoded JPEG from live capture
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return ApiResponse.badRequest('Invalid JSON body');
    }

    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid application data', parsed.error.flatten());
    }

    const { fullName, vehicleType, faceImageBase64 } = parsed.data;

    // Check if user already has a driver profile
    const { data: existing } = await (supabase as AnySupabase)
      .from('driver_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return ApiResponse.badRequest('You are already registered as a driver');
    }

    // Decode and upload face image to Supabase Storage
    const dataUrlMatch = faceImageBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    const mimeType = dataUrlMatch?.[1] || 'image/jpeg';
    const base64Data = dataUrlMatch?.[2] || faceImageBase64;

    if (!base64Data || base64Data.length < 100) {
      return ApiResponse.badRequest('Profile photo is required');
    }

    let imageBuffer: Uint8Array;
    try {
      imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    } catch {
      return ApiResponse.badRequest('Invalid profile photo format');
    }

    if (imageBuffer.byteLength < 512) {
      return ApiResponse.badRequest('Profile photo is too small. Please retake it.');
    }

    const imageExtension =
      mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const imagePath = `drivers/${user.id}/face-${Date.now()}.${imageExtension}`;
    const { error: uploadError } = await supabase.storage
      .from('listings')
      .upload(imagePath, imageBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return ApiResponse.error('Failed to upload face image: ' + uploadError.message, 500);
    }

    const { data: { publicUrl: faceImageUrl } } = supabase.storage
      .from('listings')
      .getPublicUrl(imagePath);

    // Update profile name
    await (supabase as AnySupabase).from('profiles')
      .update({ name: sanitizeText(fullName, 100) })
      .eq('id', user.id);

    // Create driver profile
    const { data: driverProfile, error: insertError } = await (supabase as AnySupabase)
      .from('driver_profiles')
      .insert({
        user_id: user.id,
        vehicle_type: vehicleType,
        face_image_url: faceImageUrl,
        is_verified: false,
        verification_status: 'none',
      })
      .select('*')
      .single();

    if (insertError) {
      return ApiResponse.error(insertError.message, 500);
    }

    return ApiResponse.success({
      message: 'You are now a driver with us!',
      driverProfile: {
        id: driverProfile.id,
        vehicleType: driverProfile.vehicle_type,
        faceImageUrl: driverProfile.face_image_url,
        verificationStatus: driverProfile.verification_status,
        createdAt: driverProfile.created_at,
      },
    }, 201);
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/drivers/apply', method: 'POST' });
  }
}
