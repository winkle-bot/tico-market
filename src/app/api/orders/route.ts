import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-provider';
import { ApiResponse } from '@/lib/api-response';
import type { Order } from '@/types';

// GET /api/orders - Get orders for a user (as buyer or seller)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role'); // 'buyer' | 'seller' | 'all'
    const status = searchParams.get('status');

    if (!userId) {
      return ApiResponse.badRequest('userId is required');
    }

    const db = await readDB();
    let orders: Order[] = db.orders || [];

    // Filter by user role
    if (role === 'buyer') {
      orders = orders.filter((o: Order) => o.buyerId === userId);
    } else if (role === 'seller') {
      orders = orders.filter((o: Order) => o.sellerId === userId);
    } else {
      // All orders involving this user
      orders = orders.filter((o: Order) => o.buyerId === userId || o.sellerId === userId);
    }

    // Filter by status if provided
    if (status) {
      orders = orders.filter((o: Order) => o.status === status);
    }

    // Sort by newest first
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return ApiResponse.success(orders);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

// POST /api/orders - Create a new order
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      listingId,
      buyerId,
      buyerName,
      type, // 'delivery' | 'pickup'
      // Delivery fields
      deliveryAddress,
      driverId,
      driverName,
      // Pickup fields
      pickupLocationId,
      pickupLocation,
      scheduledWindow,
      // Optional
      notes,
    } = body;

    if (!listingId || !buyerId || !buyerName || !type) {
      return ApiResponse.badRequest('Missing required fields: listingId, buyerId, buyerName, type');
    }

    const db = await readDB();
    
    // Get the listing
    const listing = db.listings.find((l: any) => l.id === listingId);
    if (!listing) {
      return ApiResponse.notFound('Listing not found');
    }

    // Get seller info
    const seller = db.users.find((u: any) => u.id === listing.sellerId);

    // Create the order
    const order: Order = {
      id: `order-${Date.now()}`,
      listingId,
      listingSnapshot: {
        title: listing.title,
        price: listing.price,
        imageUrl: listing.imageUrl,
      },
      buyerId,
      buyerName,
      sellerId: listing.sellerId,
      sellerName: listing.owner || seller?.name || 'Unknown Seller',
      type,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add type-specific fields
    if (type === 'delivery') {
      if (!deliveryAddress) {
        return ApiResponse.badRequest('Delivery address is required for delivery orders');
      }
      order.deliveryAddress = deliveryAddress;
      order.deliveryFee = 2500; // Fixed fee for now
      if (driverId) {
        order.driverId = driverId;
        order.driverName = driverName;
      }
    } else if (type === 'pickup') {
      if (!pickupLocationId || !pickupLocation) {
        return ApiResponse.badRequest('Pickup location is required for pickup orders');
      }
      order.pickupLocationId = pickupLocationId;
      order.pickupLocation = pickupLocation;
      order.scheduledWindow = scheduledWindow;
    }

    if (notes) {
      order.notes = notes;
    }

    // Initialize orders array if needed
    if (!db.orders) {
      db.orders = [];
    }

    db.orders.push(order);
    await writeDB(db);

    return ApiResponse.success(order, 201);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

