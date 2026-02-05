const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

async function setupDatabase() {
  console.log('Setting up database...');
  
  // Read schema
  const fs = require('fs');
  const path = require('path');
  const schema = fs.readFileSync(path.join(__dirname, 'supabase/schema.sql'), 'utf8');
  
  // Split by semicolons and execute each statement
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      if (error) {
        console.log('Note:', error.message);
      }
    } catch (e) {
      // exec_sql might not exist, try raw query
    }
  }
  
  console.log('Setup attempt complete.');
}

setupDatabase().catch(console.error);
