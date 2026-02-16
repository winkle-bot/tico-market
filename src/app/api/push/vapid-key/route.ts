import { ApiResponse } from '@/lib/api-response';

// GET public VAPID key (no auth required)
export async function GET() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidPublicKey) {
    return ApiResponse.error('Push notifications not configured', 503);
  }

  return ApiResponse.success({ vapidPublicKey });
}
