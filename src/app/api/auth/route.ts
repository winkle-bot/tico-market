import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'src/lib/db.json');

let cachedDB: any = null;

async function readDB() {
  if (cachedDB) return cachedDB;
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    cachedDB = JSON.parse(data);
    return cachedDB;
  } catch (e) {
    return { listings: [], users: [] };
  }
}

async function writeDB(data: any) {
  cachedDB = data;
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

export async function POST(request: Request) {
  try {
    const { action, email, password, name } = await request.json();
    const db = await readDB();

    if (action === 'signup') {
      if (db.users.find((u: any) => u.email === email)) {
        return NextResponse.json({ error: "User already exists" }, { status: 400 });
      }
      const newUser = {
        id: `user-${Date.now()}`,
        email,
        password, // In a real app, hash this!
        name,
        joined: new Date().toISOString(),
        verified: false,
      };
      db.users.push(newUser);
      await writeDB(db);
      const { password: _, ...userWithoutPassword } = newUser;
      return NextResponse.json(userWithoutPassword);
    }

    if (action === 'login') {
      const user = db.users.find((u: any) => u.email === email && u.password === password);
      if (!user) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
      const { password: _, ...userWithoutPassword } = user;
      return NextResponse.json(userWithoutPassword);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
