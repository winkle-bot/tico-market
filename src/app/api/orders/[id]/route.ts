import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-provider';
import { ApiResponse } from '@/lib/api-response';
import type { Order, OrderStatus } from '@/types';

// GET /api/orders/[id] - Get a single order
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await readDB();
    
    const order = (db.orders || []).find((o: Order) => o.id === id);
    if (!order) {
      return ApiResponse.notFound('Order not found');
    }

    return ApiResponse.success(order);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

// PATCH /api/orders/[id] - Update order status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, userId } = body;

    if (!status || !userId) {
      return ApiResponse.badRequest('status and userId are required');
    }

    const validStatuses: OrderStatus[] = ['pending', 'confirmed', 'in_transit', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return ApiResponse.badRequest(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const db = await readDB();
    const orderIndex = (db.orders || []).findIndex((o: Order) => o.id === id);
    
    if (orderIndex === -1) {
      return ApiResponse.notFound('Order not found');
    }

    const order = db.orders[orderIndex];

    // Permission check: only buyer or seller can update
    if (order.buyerId !== userId && order.sellerId !== userId) {
      return ApiResponse.forbidden('Not authorized to update this order');
    }

    // Status transition rules
    const currentStatus = order.status as OrderStatus;
    // const allowedTransitions: Record<OrderStatus, OrderStatus[]> = { ... }; // Use existing logic but clean up if needed

    // Re-implementing logic with ApiResponse
    const allowedTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['in_transit', 'completed', 'cancelled'],
      in_transit: ['completed', 'cancelled'],
      completed: [], // Final state
      cancelled: [], // Final state
    };

    if (!allowedTransitions[currentStatus]?.includes(status)) {
      return ApiResponse.badRequest(`Cannot transition from ${currentStatus} to ${status}`);
    }

    // Additional rules
    // Only seller can confirm
    if (status === 'confirmed' && order.sellerId !== userId) {
      return ApiResponse.forbidden('Only the seller can confirm an order');
    }

    // Only seller can mark in_transit (for delivery)
    if (status === 'in_transit' && order.sellerId !== userId) {
      return ApiResponse.forbidden('Only the seller can mark order as in transit');
    }

    // Update the order
    order.status = status;
    order.updatedAt = new Date().toISOString();

    db.orders[orderIndex] = order;
    await writeDB(db);

    return ApiResponse.success(order);
  } catch (error) {
    return ApiResponse.serverError(error);
  }
}

