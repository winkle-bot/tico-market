import { buildFeriaBatchKey, normalizeFeriaBatchContext } from '@/lib/delivery-batching';

describe('delivery batching', () => {
  test('builds a stable feria batch key', () => {
    expect(
      buildFeriaBatchKey({
        feriaName: 'Feria del Agricultor Escazu',
        marketDate: 'Saturday, Mar 7',
        pickupHubLabel: 'North Gate',
        batchWindowLabel: '08:00 - 09:30 pickup wave',
      })
    ).toBe('feria-del-agricultor-escazu:saturday-mar-7:north-gate:08-00-09-30-pickup-wave');
  });

  test('normalizes feria batch context and adds the derived key', () => {
    expect(
      normalizeFeriaBatchContext({
        feriaName: '  Feria del Agricultor Escazu  ',
        marketDate: 'Saturday, Mar 7',
        pickupHubLabel: 'North Gate',
        batchWindowLabel: '08:00 - 09:30 pickup wave',
      })
    ).toMatchObject({
      kind: 'feria_pickup',
      feriaName: 'Feria del Agricultor Escazu',
      pickupHubLabel: 'North Gate',
      batchKey: 'feria-del-agricultor-escazu:saturday-mar-7:north-gate:08-00-09-30-pickup-wave',
    });
  });
});
