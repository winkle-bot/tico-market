const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

async function migrateData() {
  console.log('🚀 Starting migration...\n');
  
  // Read db.json
  const dbPath = path.join(__dirname, '../src/lib/db.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  
  // Migrate users first (create profiles)
  console.log('👤 Migrating users...');
  const userMap = new Map(); // old ID -> new UUID
  
  if (db.users) {
    for (const user of db.users) {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'temp-password-' + Date.now(), // They'll need to reset
        email_confirm: true,
        user_metadata: { name: user.name }
      });
      
      if (authError) {
        console.log(`  ⚠️  ${user.email}: ${authError.message}`);
        continue;
      }
      
      userMap.set(user.id, authUser.user.id);
      console.log(`  ✅ ${user.name} (${user.email})`);
    }
  }
  
  // Migrate listings
  console.log('\n📦 Migrating listings...');
  let listingCount = 0;
  
  if (db.listings) {
    for (const listing of db.listings) {
      // Map old seller ID to new UUID, or generate anonymous UUID
      let sellerId = userMap.get(listing.sellerId);
      if (!sellerId) {
        // Create anonymous user for guest listings
        const { data: anonUser } = await supabase.auth.admin.createUser({
          email: `anon-${listing.id}@ticomarket.cr`,
          password: 'anon-password',
          email_confirm: true,
          user_metadata: { name: listing.owner || 'Guest' }
        });
        sellerId = anonUser?.user?.id;
        if (sellerId) userMap.set(listing.sellerId, sellerId);
      }
      
      if (!sellerId) {
        console.log(`  ⚠️  Skipping "${listing.title}" - no seller`);
        continue;
      }
      
      const { error } = await supabase.from('listings').insert({
        id: listing.id,
        seller_id: sellerId,
        title: listing.title,
        description: listing.description || '',
        price: listing.price,
        category: listing.category,
        location_lat: listing.location?.[0] || 9.9281,
        location_lng: listing.location?.[1] || -84.0907,
        rating: listing.rating || 5.0,
        type: listing.type || 'seller',
        owner: listing.owner,
        image_url: listing.imageUrl,
        verified: listing.verified || false,
        private_key: listing.privateKey,
        pickup_config: listing.pickupConfig || {},
        created_at: new Date(listing.id).toISOString(), // Use ID as timestamp approximation
      });
      
      if (error) {
        console.log(`  ⚠️  "${listing.title}": ${error.message}`);
      } else {
        listingCount++;
      }
    }
  }
  console.log(`  ✅ Migrated ${listingCount} listings`);
  
  // Migrate messages
  console.log('\n💬 Migrating messages...');
  let messageCount = 0;
  
  if (db.messages) {
    for (const msg of db.messages) {
      const { error } = await supabase.from('messages').insert({
        id: msg.id,
        listing_id: msg.listingId,
        sender_id: userMap.get(msg.senderId) || msg.senderId,
        text: msg.text,
        created_at: msg.createdAt || new Date(msg.timestamp || msg.id).toISOString(),
        read: msg.read || false,
        buyer_id: userMap.get(msg.buyerId) || msg.buyerId,
        buyer_name: msg.buyerName,
        seller_id: userMap.get(msg.sellerId) || msg.sellerId,
        seller_name: msg.sellerName,
      });
      
      if (error) {
        console.log(`  ⚠️  Message ${msg.id}: ${error.message}`);
      } else {
        messageCount++;
      }
    }
  }
  console.log(`  ✅ Migrated ${messageCount} messages`);
  
  // Migrate orders
  console.log('\n📋 Migrating orders...');
  let orderCount = 0;
  
  if (db.orders) {
    for (const order of db.orders) {
      const { error } = await supabase.from('orders').insert({
        id: order.id,
        listing_id: order.listingId,
        listing_snapshot: order.listingSnapshot,
        buyer_id: userMap.get(order.buyerId) || order.buyerId,
        buyer_name: order.buyerName,
        seller_id: userMap.get(order.sellerId) || order.sellerId,
        seller_name: order.sellerName,
        type: order.type,
        status: order.status,
        driver_id: order.driverId ? userMap.get(order.driverId) : null,
        driver_name: order.driverName,
        delivery_address: order.deliveryAddress,
        delivery_fee: order.deliveryFee,
        pickup_location_id: order.pickupLocationId,
        pickup_location: order.pickupLocation,
        scheduled_window: order.scheduledWindow,
        notes: order.notes,
        created_at: order.createdAt,
        updated_at: order.updatedAt,
      });
      
      if (error) {
        console.log(`  ⚠️  Order ${order.id}: ${error.message}`);
      } else {
        orderCount++;
      }
    }
  }
  console.log(`  ✅ Migrated ${orderCount} orders`);
  
  console.log('\n✨ Migration complete!');
  console.log(`   Users: ${userMap.size}`);
  console.log(`   Listings: ${listingCount}`);
  console.log(`   Messages: ${messageCount}`);
  console.log(`   Orders: ${orderCount}`);
}

migrateData().catch(console.error);
