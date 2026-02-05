import { supabase } from './supabase';

const BUCKET_NAME = 'listings';

/**
 * Upload an image to Supabase Storage
 */
export async function uploadImage(
  file: File,
  path: string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size must be less than 5MB');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
    }

    // Upload file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return { url: publicUrl, error: null };
  } catch (error) {
    return { url: null, error: error as Error };
  }
}

/**
 * Delete an image from Supabase Storage
 */
export async function deleteImage(path: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Get the public URL for an image path
 */
export function getImageUrl(path: string): string {
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path);
  
  return publicUrl;
}

/**
 * Generate a unique file path for upload
 */
export function generateFilePath(file: File, listingId: string | number): string {
  const ext = file.name.split('.').pop();
  const timestamp = Date.now();
  return `${listingId}/${timestamp}-${Math.random().toString(36).substring(2, 10)}.${ext}`;
}
