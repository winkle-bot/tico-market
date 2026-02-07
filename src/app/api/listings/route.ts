import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ApiResponse } from '@/lib/api-response';
import type { Listing, FrontendListing } from '@/lib/supabase-types';

// GET all listings
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: listings, error } = await supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    // Transform to match frontend format
    const typedListings = listings as unknown as Listing[];
    const transformed: FrontendListing[] = typedListings.map(l => ({
      id: l.id,
      sellerId: l.seller_id,
      title: l.title,
      description: l.description,
      price: l.price,
      category: l.category,
      location: [l.location_lat, l.location_lng],
      rating: l.rating,
      type: l.type,
      owner: l.owner,
      imageUrl: l.image_url,
      verified: l.verified,
      privateKey: l.private_key,
      pickupConfig: l.pickup_config,
      createdAt: l.created_at,
    }));

    return ApiResponse.success(transformed);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

// POST new listing
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return ApiResponse.unauthorized('Must be logged in to create listings');
    }

    const formData = await request.formData();
    
    // Handle file upload if present
    const image = formData.get('image') as File | null;
    let imageUrl = formData.get('imageUrl') as string | null;
    
    if (image && image.size > 0) {
      // Check file size (2MB limit)
      if (image.size > 2 * 1024 * 1024) {
        return ApiResponse.error('Image must be smaller than 2MB', 400);
      }
      
      const fileExt = image.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('listings')
        .upload(fileName, image);
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
      } else {
        const { data: { publicUrl } } = supabase
          .storage
          .from('listings')
          .getPublicUrl(fileName);
        imageUrl = publicUrl;
      }
    }

    // Get user profile for owner name
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, verified')
      .eq('id', session.user.id)
      .single() as { data: { name: string; verified: boolean } | null };

    const title = formData.get('title') as string;
    const price = formData.get('price') as string;
    const category = formData.get('category') as string;
    const description = formData.get('description') as string || '';
    const lat = parseFloat(formData.get('lat') as string) || 9.9281;
    const lng = parseFloat(formData.get('lng') as string) || -84.0907;
    const type = (formData.get('type') as 'seller' | 'driver') || 'seller';
    const pickupConfigStr = formData.get('pickupConfig') as string;
    
    let pickupConfig = {};
    if (pickupConfigStr) {
      try {
        pickupConfig = JSON.parse(pickupConfigStr);
      } catch (e) {
        console.error('Failed to parse pickupConfig', e);
      }
    }

    const { data: listing, error } = await (supabase
      .from('listings') as any)
      .insert({
        seller_id: session.user.id,
        title,
        description,
        price,
        category,
        location_lat: lat,
        location_lng: lng,
        type,
        owner: profile?.name || session.user.email?.split('@')[0] || 'Unknown',
        image_url: imageUrl,
        verified: profile?.verified || false,
        pickup_config: pickupConfig,
      })
      .select()
      .single();

    if (error) {
      return ApiResponse.error(error.message, 500);
    }

    return ApiResponse.success({
      id: listing.id,
      sellerId: listing.seller_id,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      category: listing.category,
      location: [listing.location_lat, listing.location_lng],
      rating: listing.rating,
      type: listing.type,
      owner: listing.owner,
      imageUrl: listing.image_url,
      verified: listing.verified,
      privateKey: listing.private_key,
      pickupConfig: listing.pickup_config,
    }, 201);
  } catch (error) {
    console.error('Listings POST error:', error);
    return ApiResponse.serverError(error);
  }
}
