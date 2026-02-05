import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-provider';
import { ApiResponse } from '@/lib/api-response';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await readDB();
    // Support both numeric and string IDs
    const listing = db.listings.find((l: any) => l.id.toString() === id);
    
    if (!listing) {
      return ApiResponse.notFound("Listing not found");
    }
    
    return ApiResponse.success(listing);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { sellerId, privateKey, ...updates } = body;
    
    const db = await readDB();
    const listingIndex = db.listings.findIndex((l: any) => l.id.toString() === id);
    
    if (listingIndex === -1) {
      return ApiResponse.notFound("Listing not found");
    }
    
    const listing = db.listings[listingIndex];
    
    // Verify ownership (either by sellerId or privateKey for anonymous listings)
    if (listing.sellerId !== sellerId && listing.privateKey !== privateKey) {
      return ApiResponse.forbidden("Not authorized to edit this listing");
    }
    
    // Update fields
    Object.assign(listing, updates);
    db.listings[listingIndex] = listing;
    await writeDB(db);
    
    return ApiResponse.success(listing);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { sellerId, privateKey } = body;
    
    const db = await readDB();
    const listingIndex = db.listings.findIndex((l: any) => l.id.toString() === id);
    
    if (listingIndex === -1) {
      return ApiResponse.notFound("Listing not found");
    }
    
    const listing = db.listings[listingIndex];
    
    // Verify ownership
    if (listing.sellerId !== sellerId && listing.privateKey !== privateKey) {
      return ApiResponse.forbidden("Not authorized to delete this listing");
    }
    
    // Delete the image file if exists
    if (listing.imageUrl && listing.imageUrl.startsWith('/uploads/')) {
      try {
        const imagePath = path.join(process.cwd(), 'public', listing.imageUrl);
        await fs.unlink(imagePath);
      } catch (err) {
        // Image might not exist, continue anyway
      }
    }
    
    // Remove listing
    db.listings.splice(listingIndex, 1);
    await writeDB(db);
    
    return ApiResponse.success({ success: true });
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

