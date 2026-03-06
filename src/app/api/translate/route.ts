import { ApiResponse } from '@/lib/api-response';
import { readJsonBody } from '@/lib/validation';
import { z } from 'zod';

const translateSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  targetLanguage: z.enum(['en', 'es']),
  sourceLanguage: z.enum(['en', 'es']).optional().nullable(),
  context: z.enum(['listing', 'message', 'generic']).optional().default('generic'),
});

function getTranslationPrompt(context: 'listing' | 'message' | 'generic') {
  if (context === 'listing') {
    return 'Translate marketplace listing content accurately. Preserve item names, prices, measurements, place names, and seller tone. Return only the translated text.';
  }

  if (context === 'message') {
    return 'Translate marketplace chat messages accurately. Preserve negotiation tone, prices, emojis, names, and quick replies. Return only the translated text.';
  }

  return 'Translate the provided text accurately between English and Costa Rican Spanish. Preserve meaning, names, numbers, prices, and formatting. Return only the translated text.';
}

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    const parsed = translateSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponse.badRequest('Invalid translation payload', parsed.error.flatten());
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return ApiResponse.error('Translation service is not configured', 503, 'TRANSLATION_NOT_CONFIGURED');
    }

    const model = process.env.OPENAI_TRANSLATION_MODEL || 'gpt-4.1-mini';
    const sourceLanguage = parsed.data.sourceLanguage || 'auto-detect';
    const targetLanguageLabel = parsed.data.targetLanguage === 'es' ? 'Spanish (Costa Rica)' : 'English';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: getTranslationPrompt(parsed.data.context),
          },
          {
            role: 'user',
            content: `Translate from ${sourceLanguage} to ${targetLanguageLabel}.\n\nText:\n${parsed.data.text}`,
          },
        ],
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const errorMessage =
        typeof payload?.error?.message === 'string'
          ? payload.error.message
          : 'Translation request failed';
      return ApiResponse.error(errorMessage, response.status);
    }

    const translatedText = payload?.choices?.[0]?.message?.content;
    if (typeof translatedText !== 'string' || translatedText.trim().length === 0) {
      return ApiResponse.error('Translation response was empty', 502);
    }

    return ApiResponse.success({
      translatedText: translatedText.trim(),
      targetLanguage: parsed.data.targetLanguage,
      provider: 'openai',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid JSON body') {
      return ApiResponse.badRequest('Invalid JSON body');
    }
    return ApiResponse.serverError(error, { route: '/api/translate', method: 'POST' });
  }
}
