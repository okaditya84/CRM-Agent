import { describe, it, expect } from 'vitest';
import { parseWebhook } from './parse-webhook';
import type { InboundMessageReceived, MessageStatusChanged } from '../types';

function messagesBody(value: unknown) {
  return {
    object: 'whatsapp_business_account',
    entry: [{ id: 'WABA', changes: [{ field: 'messages', value }] }],
  };
}

describe('parseWebhook — inbound messages', () => {
  it('parses a text message with contact name', () => {
    const events = parseWebhook(
      messagesBody({
        metadata: { phone_number_id: 'PNID' },
        contacts: [{ wa_id: '919812345678', profile: { name: 'Ramesh' } }],
        messages: [
          { from: '919812345678', id: 'wamid.A', timestamp: '1718000000', type: 'text', text: { body: 'Hi' } },
        ],
      }),
    );
    expect(events).toHaveLength(1);
    const e = events[0] as InboundMessageReceived;
    expect(e.type).toBe('InboundMessageReceived');
    expect(e.text).toBe('Hi');
    expect(e.contactName).toBe('Ramesh');
    expect(e.conversationId).toBe('919812345678');
    expect(e.phoneNumberId).toBe('PNID');
    expect(e.isFreeEntryPoint).toBe(false);
    expect(e.occurredAt).toBe(new Date(1718000000 * 1000).toISOString());
  });

  it('parses an image message and flags a free-entry (CTWA) referral', () => {
    const events = parseWebhook(
      messagesBody({
        metadata: { phone_number_id: 'PNID' },
        messages: [
          {
            from: '919812345678',
            id: 'wamid.B',
            timestamp: '1718000100',
            type: 'image',
            image: { id: 'media-1', mime_type: 'image/jpeg', caption: 'nice' },
            referral: { source_type: 'ad' },
          },
        ],
      }),
    );
    const e = events[0] as InboundMessageReceived;
    expect(e.kind).toBe('image');
    expect(e.media?.id).toBe('media-1');
    expect(e.media?.caption).toBe('nice');
    expect(e.isFreeEntryPoint).toBe(true);
  });
});

describe('parseWebhook — statuses', () => {
  it('parses delivery status', () => {
    const events = parseWebhook(
      messagesBody({
        metadata: { phone_number_id: 'PNID' },
        statuses: [
          { id: 'wamid.A', status: 'delivered', timestamp: '1718000200', recipient_id: '919812345678' },
        ],
      }),
    );
    const e = events[0] as MessageStatusChanged;
    expect(e.type).toBe('MessageStatusChanged');
    expect(e.status).toBe('delivered');
    expect(e.providerMessageId).toBe('wamid.A');
  });

  it('captures error code/title on failed status', () => {
    const events = parseWebhook(
      messagesBody({
        statuses: [
          {
            id: 'wamid.C',
            status: 'failed',
            timestamp: '1718000300',
            recipient_id: '919812345678',
            errors: [{ code: 131047, title: 'Re-engagement message' }],
          },
        ],
      }),
    );
    const e = events[0] as MessageStatusChanged;
    expect(e.status).toBe('failed');
    expect(e.errorCode).toBe(131047);
    expect(e.errorTitle).toBe('Re-engagement message');
  });
});

describe('parseWebhook — templates and robustness', () => {
  it('parses a template status update', () => {
    const events = parseWebhook({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'message_template_status_update',
              value: {
                message_template_name: 'first_contact',
                message_template_language: 'en',
                event: 'APPROVED',
              },
            },
          ],
        },
      ],
    });
    expect(events[0]).toMatchObject({
      type: 'TemplateStatusChanged',
      templateName: 'first_contact',
      status: 'APPROVED',
    });
  });

  it('returns [] for empty or malformed payloads without throwing', () => {
    expect(parseWebhook({})).toEqual([]);
    expect(parseWebhook(null)).toEqual([]);
    expect(parseWebhook({ entry: 'nope' })).toEqual([]);
  });
});
