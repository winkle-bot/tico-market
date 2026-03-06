import { buildFeriaPreorderMeta, getFeriaPreorderMeta } from '@/lib/feria-preorders';

describe('feria preorders', () => {
  test('builds feria preorder metadata from a market event', () => {
    const reservedAt = '2026-03-06T21:00:00.000Z';
    const meta = buildFeriaPreorderMeta(
      {
        id: 'feria-escazu-sat',
        name: 'Feria del Agricultor Escazu',
        date: 'Every Saturday',
        timeWindow: '07:00 - 13:00',
        locationName: 'Escazu Centro',
      },
      reservedAt
    );

    expect(meta).toEqual({
      kind: 'feria_preorder',
      eventId: 'feria-escazu-sat',
      eventName: 'Feria del Agricultor Escazu',
      eventDate: 'Every Saturday',
      timeWindow: '07:00 - 13:00',
      locationName: 'Escazu Centro',
      reservationStatus: 'pending_confirmation',
      reservedAt,
    });
  });

  test('returns null when feria preorder metadata is not present', () => {
    expect(getFeriaPreorderMeta({ title: 'Plantains' })).toBeNull();
  });

  test('returns feria preorder metadata when the snapshot contains a valid reservation payload', () => {
    expect(
      getFeriaPreorderMeta({
        title: 'Plantains',
        feriaPreorder: {
          kind: 'feria_preorder',
          eventId: 'feria-escazu-sat',
          eventName: 'Feria del Agricultor Escazu',
          eventDate: 'Every Saturday',
          timeWindow: '07:00 - 13:00',
          locationName: 'Escazu Centro',
          reservationStatus: 'pending_confirmation',
          reservedAt: '2026-03-06T21:00:00.000Z',
        },
      })
    ).toMatchObject({
      eventId: 'feria-escazu-sat',
      reservationStatus: 'pending_confirmation',
    });
  });
});
