import type { DeliveryBatchContext } from '@/types';

type FeriaBatchInput = Omit<DeliveryBatchContext, 'batchKey' | 'kind'>;

function slugifyPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function buildFeriaBatchKey(input: FeriaBatchInput): string {
  return [
    slugifyPart(input.feriaName),
    slugifyPart(input.marketDate),
    slugifyPart(input.pickupHubLabel),
    slugifyPart(input.batchWindowLabel),
  ].join(':');
}

export function normalizeFeriaBatchContext(input: FeriaBatchInput): DeliveryBatchContext {
  return {
    kind: 'feria_pickup',
    feriaName: input.feriaName.trim(),
    marketDate: input.marketDate.trim(),
    pickupHubLabel: input.pickupHubLabel.trim(),
    batchWindowLabel: input.batchWindowLabel.trim(),
    batchKey: buildFeriaBatchKey(input),
  };
}
