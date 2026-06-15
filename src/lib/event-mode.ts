import type { StorageProvider } from './storage/types';

/**
 * Event Mode and the kill switches. The webhook receiver and message persistence
 * are always on; these flags gate the autonomous bot and outbound automation so
 * the system can sit idle between fairs and flip on in one tap.
 */
export const EVENT_MODE_KEY = 'event_mode';
export const AUTOMATION_HALT_KEY = 'automation_halt';

export interface EventState {
  /** Master switch: when on, the bot/automation are active. */
  eventMode: boolean;
  /** Panic button: hard-stops all outbound/bot even if Event Mode is on. */
  automationHalt: boolean;
  updatedAt?: string;
}

export async function getEventState(storage: StorageProvider): Promise<EventState> {
  const [mode, halt] = await Promise.all([
    storage.getSetting(EVENT_MODE_KEY),
    storage.getSetting(AUTOMATION_HALT_KEY),
  ]);
  return {
    eventMode: mode?.value === true,
    automationHalt: halt?.value === true,
    updatedAt: mode?.updatedAt,
  };
}

export async function setEventMode(storage: StorageProvider, on: boolean): Promise<EventState> {
  await storage.putSetting(EVENT_MODE_KEY, on, 'global');
  return getEventState(storage);
}

export async function setAutomationHalt(
  storage: StorageProvider,
  on: boolean,
): Promise<EventState> {
  await storage.putSetting(AUTOMATION_HALT_KEY, on, 'global');
  return getEventState(storage);
}

/**
 * The single predicate the bot must consult before auto-replying:
 * Event Mode on, no global halt, and this conversation not handed to a human.
 */
export function isBotAllowed(state: EventState, conversationPaused = false): boolean {
  return state.eventMode && !state.automationHalt && !conversationPaused;
}
