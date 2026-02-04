import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db-provider';
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
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
      return NextResponse.json(
        { error: 'status and userId are required' },
        { status: 400 }
      );
    }

    const validStatuses: OrderStatus[] = ['pending', 'confirmed', 'in_transit', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const db = await readDB();
    const orderIndex = (db.orders || []).findIndex((o: Order) => o.id === id);
    
    if (orderIndex === -1) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = db.orders[orderIndex];

    // Permission check: only buyer or seller can update
    if (order.buyerId !== userId && order.sellerId !== userId) {
      return NextResponse.json(
        { error: 'Not authorized to update this order' },
        { status: 403 }
      );
    }

    // Status transition rules
    const currentStatus = order.status as OrderStatus;
    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['in_transit', 'completed', 'cancelled'],
      in_transit: ['completed', 'cancelled'],
      completed: [], // Final state
      cancelled: [], // Final state
    };

    if (!allowedTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from ${currentStatus} to ${status}` },
        { status: 400 }
      );
    }

    // Additional rules
    // Only seller can confirm
    if (status === 'confirmed' && order.sellerId !== userId) {
      return NextResponse.json(
        { error: 'Only the seller can confirm an order' },
        { status: 403 }
      );
    }

    // Only seller can mark in_transit (for delivery)
    if (status === 'in_transit' && order.sellerId !== userId) {
      return NextResponse.json(
        { error: 'Only the seller can mark order as in transit' },
        { status: 403 }
      );
    }

    // Update the order
    order.status = status;
    order.updatedAt = new Date().toISOString();

    db.orders[orderIndex] = order;
    await writeDB(db);

    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
