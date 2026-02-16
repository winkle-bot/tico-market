// Server-side push notification helper
// Uses Web Crypto API for VAPID signing (Cloudflare Workers compatible)

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Build a VAPID JWT using Web Crypto API (no Node.js crypto needed).
 */
async function buildVapidJwt(audience: string): Promise<string> {
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@ticomarket.com';

  if (!vapidPrivateKey) {
    throw new Error('VAPID_PRIVATE_KEY not configured');
  }

  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 60 * 60 * 12, // 12 hours
    sub: vapidSubject,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the VAPID private key (base64url-encoded raw 32-byte key)
  const keyData = base64urlDecode(vapidPrivateKey);
  const keyBuffer = keyData.buffer.slice(keyData.byteOffset, keyData.byteOffset + keyData.byteLength) as ArrayBuffer;
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  ).catch(() => {
    // Try as JWK if PKCS8 fails
    return crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );
  });

  const tokenBytes = encoder.encode(unsignedToken);
  const tokenBuffer = tokenBytes.buffer.slice(tokenBytes.byteOffset, tokenBytes.byteOffset + tokenBytes.byteLength) as ArrayBuffer;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    tokenBuffer
  );

  // Convert DER signature to raw r||s format if needed
  const sigBytes = new Uint8Array(signature);
  const rawSig = sigBytes.length === 64 ? sigBytes : derToRaw(sigBytes);

  return `${unsignedToken}.${base64urlEncode(rawSig)}`;
}

function derToRaw(der: Uint8Array): Uint8Array {
  // Simple DER to raw conversion for ECDSA P-256
  const raw = new Uint8Array(64);
  if (der[0] === 0x30) {
    let offset = 2;
    const rLen = der[offset + 1];
    const rStart = offset + 2 + (rLen === 33 ? 1 : 0);
    const rActualLen = rLen === 33 ? 32 : rLen;
    raw.set(der.slice(rStart, rStart + rActualLen), 32 - rActualLen);

    offset = offset + 2 + rLen;
    const sLen = der[offset + 1];
    const sStart = offset + 2 + (sLen === 33 ? 1 : 0);
    const sActualLen = sLen === 33 ? 32 : sLen;
    raw.set(der.slice(sStart, sStart + sActualLen), 64 - sActualLen);
  }
  return raw;
}

function base64urlEncode(data: Uint8Array): string {
  let binary = '';
  for (const byte of data) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Send a push notification to all subscriptions for a user.
 * Fire-and-forget — errors are logged, not thrown.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey || !process.env.VAPID_PRIVATE_KEY) {
      return; // Push not configured, silently skip
    }

    const supabase = await createSupabaseServerClient();

    const { data: subscriptions } = await (supabase
      .from('push_subscriptions') as any)
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userId);

    if (!subscriptions || subscriptions.length === 0) return;

    const body = JSON.stringify(payload);
    const expiredIds: string[] = [];

    for (const sub of subscriptions) {
      try {
        const audience = new URL(sub.endpoint).origin;
        const jwt = await buildVapidJwt(audience);

        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            TTL: '86400',
            Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
          },
          body,
        });

        if (response.status === 410 || response.status === 404) {
          expiredIds.push(sub.id);
        }
      } catch (err) {
        logger.warn('Push send failed for subscription', { subscriptionId: sub.id, error: String(err) });
      }
    }

    // Clean up expired subscriptions
    if (expiredIds.length > 0) {
      await (supabase
        .from('push_subscriptions') as any)
        .delete()
        .in('id', expiredIds);
    }
  } catch (err) {
    logger.warn('sendPushToUser failed', { userId, error: String(err) });
  }
}

/**
 * Send a WhatsApp message to a user via Twilio.
 * Only sends if user has opted in and has a phone number.
 * Fire-and-forget — errors are logged, not thrown.
 */
export async function sendWhatsAppToUser(userId: string, message: string): Promise<void> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM;

    if (!accountSid || !authToken || !fromNumber) {
      return; // WhatsApp not configured, silently skip
    }

    const supabase = await createSupabaseServerClient();

    const { data: profile } = await (supabase
      .from('profiles') as any)
      .select('phone_number, whatsapp_opted_in, notification_prefs')
      .eq('id', userId)
      .single();

    if (!profile?.whatsapp_opted_in || !profile?.phone_number) return;

    // Check notification prefs (default to enabled if not set)
    const prefs = profile.notification_prefs || {};
    if (prefs.whatsapp_messages === false && prefs.whatsapp_orders === false) return;

    const toNumber = `whatsapp:${profile.phone_number}`;
    const params = new URLSearchParams({
      From: fromNumber,
      To: toNumber,
      Body: message,
    });

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = btoa(`${accountSid}:${authToken}`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.warn('WhatsApp send failed', { userId, status: response.status, error: errorBody });
    }
  } catch (err) {
    logger.warn('sendWhatsAppToUser failed', { userId, error: String(err) });
  }
}
