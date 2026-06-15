import { ulid } from 'ulid';
import type { EntityId } from './types';

/**
 * App-generated, lexicographically-sortable id. Generating ids in the app (not
 * the store) is what lets us swap Google Sheets ↔ Supabase without remapping keys.
 */
export function newId(): EntityId {
  return ulid();
}
