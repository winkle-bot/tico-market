import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src/lib/db.json');

let cachedDB: any = null;

export async function readDB() {
  // In development, we might want to skip caching to avoid issues between separate API route bundles
  // or use a truly global variable. But for simplicity, let's just read from disk every time 
  // if we want to be 100% safe across multiple route handlers in Next.js dev mode.
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return { listings: [], users: [] };
  }
}

export async function writeDB(data: any) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}
