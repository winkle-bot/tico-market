/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import { DRIVER_DOCUMENTS_BUCKET } from '@/lib/driver-documents';

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return ApiResponse.unauthorized('Must be logged in');
    }

    // Get driver profile
    const { data: driverProfile } = await (supabase
      .from('driver_profiles') as any)
      .select('id, verification_status')
      .eq('user_id', user.id)
      .single();

    if (!driverProfile) {
      return ApiResponse.badRequest('You must become a driver first');
    }

    if (driverProfile.verification_status === 'approved') {
      return ApiResponse.badRequest('You are already verified');
    }

    if (driverProfile.verification_status === 'pending') {
      return ApiResponse.badRequest('Your verification is already pending review');
    }

    // Parse FormData for license image upload
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return ApiResponse.badRequest('Expected form data with license image');
    }

    const licenseFile = formData.get('licenseImage') as File | null;
    if (!licenseFile || licenseFile.size === 0) {
      return ApiResponse.badRequest('License image is required');
    }

    if (licenseFile.size > 5 * 1024 * 1024) {
      return ApiResponse.badRequest('License image must be less than 5MB');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(licenseFile.type)) {
      return ApiResponse.badRequest('License image must be JPEG, PNG, or WebP');
    }

    // Upload to private storage path (not publicly accessible)
    const storageKey = `drivers/${user.id}/license-${Date.now()}.${licenseFile.type.split('/')[1]}`;
    const fileBuffer = new Uint8Array(await licenseFile.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(DRIVER_DOCUMENTS_BUCKET)
      .upload(storageKey, fileBuffer, {
        contentType: licenseFile.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return ApiResponse.error('Failed to upload license image: ' + uploadError.message, 500);
    }

    // Create driver_documents record
    await (supabase.from('driver_documents') as any)
      .insert({
        driver_profile_id: driverProfile.id,
        document_type: 'license',
        storage_key: storageKey,
      });

    // Update driver profile to pending verification
    const { error: updateError } = await (supabase
      .from('driver_profiles') as any)
      .update({
        verification_status: 'pending',
        license_image_key: storageKey,
      })
      .eq('id', driverProfile.id);

    if (updateError) {
      return ApiResponse.error(updateError.message, 500);
    }

    return ApiResponse.success({
      message: 'License submitted for verification. An admin will review your documents.',
      verificationStatus: 'pending',
    });
  } catch (error) {
    return ApiResponse.serverError(error, { route: '/api/drivers/verify', method: 'POST' });
  }
}
