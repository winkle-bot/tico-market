import { z } from 'zod';
import { ApiResponse } from '@/lib/api-response';

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new Error('Invalid JSON body');
  }
}

export function validationError(error: z.ZodError) {
  return ApiResponse.badRequest('Invalid input', error.flatten());
}
