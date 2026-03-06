#!/usr/bin/env node
/**
 * Setup Supabase Storage bucket for TicoMarket
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function setupStorage() {
  console.log('🔧 Setting up Supabase Storage...\n');

  // Create the listings bucket
  const { data: bucket, error: bucketError } = await supabase.storage.createBucket('listings', {
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  });

  if (bucketError) {
    if (bucketError.message.includes('already exists')) {
      console.log('✅ Bucket "listings" already exists');
    } else {
      console.error('❌ Error creating bucket:', bucketError);
      process.exit(1);
    }
  } else {
    console.log('✅ Created bucket "listings"');
  }

  // Set bucket to public
  const { error: updateError } = await supabase.storage.updateBucket('listings', {
    public: true,
    fileSizeLimit: 5242880,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  });

  if (updateError) {
    console.error('❌ Error updating bucket:', updateError);
  } else {
    console.log('✅ Updated bucket settings');
  }

  const { error: privateBucketError } = await supabase.storage.createBucket('driver-documents', {
    public: false,
    fileSizeLimit: 5242880,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  });

  if (privateBucketError) {
    if (privateBucketError.message.includes('already exists')) {
      console.log('✅ Bucket "driver-documents" already exists');
    } else {
      console.error('❌ Error creating private bucket:', privateBucketError);
      process.exit(1);
    }
  } else {
    console.log('✅ Created bucket "driver-documents"');
  }

  const { error: privateUpdateError } = await supabase.storage.updateBucket('driver-documents', {
    public: false,
    fileSizeLimit: 5242880,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  });

  if (privateUpdateError) {
    console.error('❌ Error updating private bucket:', privateUpdateError);
  } else {
    console.log('✅ Updated private bucket settings');
  }

  console.log('\n🎉 Storage setup complete!');
  console.log('   - Bucket: listings (public)');
  console.log('   - Bucket: driver-documents (private)');
  console.log('   - Max file size: 5MB');
  console.log('   - Allowed types: JPEG, PNG, WebP, GIF');
}

setupStorage().catch(console.error);
