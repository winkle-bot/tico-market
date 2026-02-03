import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src/lib/db.json');

async function readDB() {
  const data = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

async function writeDB(data: any) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

export async function GET() {
  const db = await readDB();
  return NextResponse.json(db.listings);
}

export async function POST(request: Request) {
  const newItem = await request.json();
  const db = await readDB();
  
  const listing = {
    ...newItem,
    id: db.listings.length + 1,
  };
  
  db.listings.unshift(listing);
  await writeDB(db);
  
  return NextResponse.json(listing);
}
