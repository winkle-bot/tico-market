import { NextResponse } from 'next/server';
import { logger } from './logger';

export type ApiError = {
  error: string;
  code?: string;
  details?: any;
};

export class ApiResponse {
  static success<T>(data: T, status = 200) {
    return NextResponse.json(data, { status });
  }

  static cached<T>(data: T, maxAge = 60) {
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 2}`,
      },
    });
  }

  static error(message: string, status = 400, code?: string, details?: any) {
    const body: ApiError = { error: message };
    if (code) body.code = code;
    if (details) body.details = details;
    return NextResponse.json(body, { status });
  }

  static badRequest(message = 'Bad Request', details?: any) {
    return this.error(message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Unauthorized') {
    return this.error(message, 401, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden') {
    return this.error(message, 403, 'FORBIDDEN');
  }

  static notFound(message = 'Not Found') {
    return this.error(message, 404, 'NOT_FOUND');
  }

  static serverError(error: unknown, context?: { route?: string; method?: string }) {
    logger.error('API server error', context, error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return this.error(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}
