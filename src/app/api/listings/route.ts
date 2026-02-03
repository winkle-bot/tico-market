import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src/lib/db.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public/uploads');

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
  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const price = formData.get('price') as string;
    const category = formData.get('category') as string;
    const sellerId = formData.get('sellerId') as string;
    const owner = formData.get('owner') as string;
    const rating = parseFloat(formData.get('rating') as string);
    const type = formData.get('type') as string;
    const lat = parseFloat(formData.get('lat') as string);
    const lng = parseFloat(formData.get('lng') as string);
    const image = formData.get('image') as File | null;

    let imageUrl = null;
    if (image) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const filename = `${Date.now()}-${image.name.replace(/\s+/g, '-')}`;
      const filePath = path.join(UPLOADS_DIR, filename);
      await fs.writeFile(filePath, buffer);
      imageUrl = `/uploads/${filename}`;
    }

    const db = await readDB();
    const listing = {
      id: db.listings.length + 1,
      title,
      price,
      category,
      sellerId,
      owner,
      rating,
      type,
      location: [lat, lng],
      imageUrl
    };

    db.listings.unshift(listing);
    await writeDB(db);

    return NextResponse.json(listing);
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
