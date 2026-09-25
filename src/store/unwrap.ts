import type { ApiSuccessResponse } from '@devhub/shared-types';

/** Every API response is wrapped in `{ success, data, meta }` — RTK Query endpoints unwrap it here, once. */
export function unwrap<T>(response: ApiSuccessResponse<T>): T {
  return response.data;
}
