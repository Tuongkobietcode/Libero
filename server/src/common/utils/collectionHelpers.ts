import type { Types } from 'mongoose';

import { NotFoundError } from '../errors/AppError';
import { ERR } from '../errors/errorCodes';

export function uniqueObjectIds(ids: Types.ObjectId[]): Types.ObjectId[] {
  const seen = new Set<string>();

  return ids.filter((id) => {
    const key = id.toString();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function getRequiredMapValue<T>(map: Map<string, T>, key: string, message: string): T {
  const value = map.get(key);

  if (!value) {
    throw new NotFoundError(ERR.COMMON_NOT_FOUND, 404, message);
  }

  return value;
}
