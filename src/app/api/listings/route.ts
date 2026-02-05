import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { readDB, writeDB } from '@/lib/db-provider';
import { ApiResponse } from '@/lib/api-response';
import type { Category, Listing, ListingPickupConfig } from '@/types';

const UPLOADS_DIR = path.join(process.cwd(), 'public/uploads');

export async function GET() {
  try {
    const db = await readDB();
    return ApiResponse.success(db.listings);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const price = formData.get('price') as string;
    const category = formData.get('category') as Category;
    const description = formData.get('description') as string || '';
    const sellerId = formData.get('sellerId') as string;
    const owner = formData.get('owner') as string;
    const rating = parseFloat(formData.get('rating') as string) || 5.0;
    const type = (formData.get('type') as 'seller' | 'driver') || 'seller';
    const lat = parseFloat(formData.get('lat') as string) || 9.9281;
    const lng = parseFloat(formData.get('lng') as string) || -84.0907;
    const image = formData.get('image') as File | null;
    
    if (!title || !price || !category) {
      return ApiResponse.badRequest('Missing required fields: title, price, or category');
    }

    // Parse pickup config
    const pickupConfigStr = formData.get('pickupConfig') as string;
    let pickupConfig: ListingPickupConfig | undefined;
    if (pickupConfigStr) {
      try {
        pickupConfig = JSON.parse(pickupConfigStr);
      } catch (e) {
        console.error("Failed to parse pickupConfig", e);
        return ApiResponse.badRequest('Invalid pickupConfig format');
      }
    }

    let imageUrl: string | undefined;
    if (image && image.size > 0) {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      const buffer = Buffer.from(await image.arrayBuffer());
      const filename = `${Date.now()}-${image.name.replace(/\s+/g, '-')}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      await fs.writeFile(filePath, buffer);
      imageUrl = `/uploads/${filename}`;
    }

    const db = await readDB();
    const privateKey = !sellerId ? Math.random().toString(36).substring(2, 10).toUpperCase() : undefined;
    
    // Find user to check verification
    const user = db.users.find((u: any) => u.id === sellerId);
    
    const listing: Listing = {
      id: Date.now(),
      title,
      description,
      price,
      category,
      sellerId: sellerId || `anon-${Date.now()}`,
      owner,
      rating,
      type,
      location: [lat, lng],
      imageUrl,
      privateKey,
      verified: user?.verified || false,
      pickupConfig
    };

    db.listings.unshift(listing);
    await writeDB(db);

    return ApiResponse.success(listing, 201);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

