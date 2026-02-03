import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src/lib/db.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public/uploads');

let cachedDB: any = null;

async function readDB() {
  if (cachedDB) return cachedDB;
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    cachedDB = JSON.parse(data);
    return cachedDB;
  } catch (e) {
    return { listings: [] };
  }
}

async function writeDB(data: any) {
  cachedDB = data;
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

export async function GET() {
  const db = await readDB();
  return NextResponse.json(db.listings);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const price = formData.get('price') as string;
    const category = formData.get('category') as string;
    const sellerId = formData.get('sellerId') as string;
    const owner = formData.get('owner') as string;
    const rating = parseFloat(formData.get('rating') as string) || 5.0;
    const type = formData.get('type') as string || 'seller';
    const lat = parseFloat(formData.get('lat') as string) || 9.9281;
    const lng = parseFloat(formData.get('lng') as string) || -84.0907;
    const image = formData.get('image') as File | null;

    let imageUrl = null;
    if (image && image.size > 0) {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      const buffer = Buffer.from(await image.arrayBuffer());
      const filename = `${Date.now()}-${image.name.replace(/\s+/g, '-')}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      await fs.writeFile(filePath, buffer);
      imageUrl = `/uploads/${filename}`;
    }

    const db = await readDB();
    const privateKey = !sellerId ? Math.random().toString(36).substring(2, 10).toUpperCase() : null;
    
    // Find user to check verification
    const user = db.users.find((u: any) => u.id === sellerId);
    
    const listing = {
      id: Date.now(), // More robust than length + 1
      title,
      price,
      category,
      sellerId: sellerId || `anon-${Date.now()}`,
      owner,
      rating,
      type,
      location: [lat, lng],
      imageUrl,
      privateKey, // Returned only on creation for anonymous users
      verified: user?.verified || false
    };

    db.listings.unshift(listing);
    await writeDB(db);

    return NextResponse.json(listing);
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
