import fs from 'fs/promises';
import path from 'path';
import { eventBus } from './events';
import type { Listing, User, Message, Order } from '@/types';

const DB_PATH = path.join(process.cwd(), 'src/lib/db.json');

export interface Session {
  id: string;
  userId: string;
  expiresAt: number; // Unix timestamp
}

export interface DBData {
  listings: Listing[];
  users: User[];
  messages: Message[];
  orders: Order[];
  sessions: Session[];
}

export async function readDB(): Promise<DBData> {
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    const parsed = JSON.parse(data);
    
    // Ensure all arrays exist
    return {
      listings: parsed.listings || [],
      users: parsed.users || [],
      messages: parsed.messages || [],
      orders: parsed.orders || [],
      sessions: parsed.sessions || [],
    };
  } catch {
    // Return empty DB on error
    return { listings: [], users: [], messages: [], orders: [], sessions: [] };
  }
}

export async function writeDB(data: Partial<DBData>) {
  // Read existing data first to merge if we're only writing partial?
  // Actually, writeDB usually expects full DB or the caller handles it.
  // But let's keep the signature simple as any, or strict DBData.
  // The original code accepted 'any'. Let's accept DBData.
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
  // Emit event to notify subscribers of changes
  eventBus.emit('db_update', { timestamp: Date.now() });
}
