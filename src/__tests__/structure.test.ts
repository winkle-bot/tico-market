import fs from 'fs';
import path from 'path';

describe('Tico Market Structure Tests', () => {
  test('project has required files', () => {
    // Check package.json
    expect(fs.existsSync('package.json')).toBe(true);
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(packageJson.name).toBe('tico-market');
    expect(packageJson.scripts.dev).toBe('next dev');
    expect(packageJson.scripts.build).toBe('next build');
  });

  test('has Next.js configuration', () => {
    expect(fs.existsSync('next.config.ts')).toBe(true);
    expect(fs.existsSync('tsconfig.json')).toBe(true);
    expect(fs.existsSync('tailwind.config.ts')).toBe(true);
  });

  test('has source directory structure', () => {
    expect(fs.existsSync('src')).toBe(true);
    expect(fs.existsSync('src/app')).toBe(true);
    expect(fs.existsSync('src/components')).toBe(true);
    expect(fs.existsSync('src/lib')).toBe(true);
    expect(fs.existsSync('src/context')).toBe(true);
  });

  test('has main application files', () => {
    expect(fs.existsSync('src/app/page.tsx')).toBe(true);
    expect(fs.existsSync('src/app/layout.tsx')).toBe(true);
    expect(fs.existsSync('src/app/account/page.tsx')).toBe(true);
  });

  test('has API routes', () => {
    const apiRoutes = [
      'src/app/api/auth/route.ts',
      'src/app/api/auth/me/route.ts',
      'src/app/api/listings/route.ts',
      'src/app/api/listings/[id]/route.ts',
      'src/app/api/users/[id]/route.ts',
      'src/app/api/messages/route.ts',
      'src/app/api/orders/route.ts',
    ];

    apiRoutes.forEach(route => {
      expect(fs.existsSync(route)).toBe(true);
    });
  });

  test('has core components', () => {
    const components = [
      'src/components/AuthModal.tsx',
      'src/components/ListingCard.tsx',
      'src/components/MapView.tsx',
      'src/components/Navbar.tsx',
      'src/components/SellModal.tsx',
    ];

    components.forEach(component => {
      expect(fs.existsSync(component)).toBe(true);
    });
  });

  test('has configuration files', () => {
    expect(fs.existsSync('src/types/index.ts')).toBe(true);
    expect(fs.existsSync('src/config/constants.ts')).toBe(true);
    expect(fs.existsSync('src/lib/supabase.ts')).toBe(true);
    expect(fs.existsSync('src/lib/database.types.ts')).toBe(true);
  });

  test('has environment configuration', () => {
    // Check if either .env.local or .env.example exists
    const hasEnv = fs.existsSync('.env.local') || fs.existsSync('.env.example');
    expect(hasEnv).toBe(true);
  });
});