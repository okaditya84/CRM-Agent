import { describe, it, expect, beforeEach } from 'vitest';
import {
  getEventState,
  setEventMode,
  setAutomationHalt,
  isBotAllowed,
} from './event-mode';
import { InMemoryStorageProvider } from './storage/in-memory-adapter';

describe('event mode', () => {
  let storage: InMemoryStorageProvider;
  beforeEach(() => {
    storage = new InMemoryStorageProvider();
  });

  it('defaults to off', async () => {
    const state = await getEventState(storage);
    expect(state).toMatchObject({ eventMode: false, automationHalt: false });
  });

  it('toggles event mode and halt independently', async () => {
    expect((await setEventMode(storage, true)).eventMode).toBe(true);
    expect((await setAutomationHalt(storage, true)).automationHalt).toBe(true);
    const state = await getEventState(storage);
    expect(state.eventMode).toBe(true);
    expect(state.automationHalt).toBe(true);
  });
});

describe('isBotAllowed', () => {
  it('only allows the bot when event mode is on, not halted, not paused', () => {
    expect(isBotAllowed({ eventMode: true, automationHalt: false }, false)).toBe(true);
    expect(isBotAllowed({ eventMode: false, automationHalt: false }, false)).toBe(false);
    expect(isBotAllowed({ eventMode: true, automationHalt: true }, false)).toBe(false);
    expect(isBotAllowed({ eventMode: true, automationHalt: false }, true)).toBe(false);
  });
});
