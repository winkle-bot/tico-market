import {
  buildFeriaPreorderMeta,
  completeFeriaPreorderPickup,
  formatFeriaPickupCode,
  getFeriaPreorderMeta,
  updateFeriaPreorderForStatus,
} from '@/lib/feria-preorders';

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

  test('marks feria preorder metadata as confirmed when the order is confirmed', () => {
    expect(
      updateFeriaPreorderForStatus(
        {
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
        },
        'confirmed',
        'ord_feria_1'
      )
    ).toMatchObject({
      feriaPreorder: {
        reservationStatus: 'confirmed',
        pickupQrToken: expect.stringContaining('tico-market:feria-pickup:ord_feria_1:'),
      },
    });
  });

  test('formats a short pickup code from the QR token', () => {
    expect(
      formatFeriaPickupCode('tico-market:feria-pickup:ord_feria_1:7f4e8c9ab1234def')
    ).toBe('B1234DEF');
  });

  test('marks feria preorder metadata as completed after QR handoff', () => {
    expect(
      completeFeriaPreorderPickup(
        {
          title: 'Plantains',
          feriaPreorder: {
            kind: 'feria_preorder',
            eventId: 'feria-escazu-sat',
            eventName: 'Feria del Agricultor Escazu',
            eventDate: 'Every Saturday',
            timeWindow: '07:00 - 13:00',
            locationName: 'Escazu Centro',
            reservationStatus: 'confirmed',
            reservedAt: '2026-03-06T21:00:00.000Z',
            pickupQrToken: 'tico-market:feria-pickup:ord_feria_1:7f4e8c9ab1234def',
          },
        },
        'seller-1',
        '2026-03-06T22:00:00.000Z'
      )
    ).toMatchObject({
      feriaPreorder: {
        pickupCompletedAt: '2026-03-06T22:00:00.000Z',
        pickupCompletedByUserId: 'seller-1',
      },
    });
  });
});
