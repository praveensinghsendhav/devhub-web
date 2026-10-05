import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { ApiErrorResponse, AuthTokens, AuthUser } from '@devhub/shared-types';
import { getDeviceId } from '../common/lib/deviceId';
import { setCredentials, setUnauthenticated } from '../features/auth/authSlice';
import type { RootState } from './store';

const prepareHeaders = (headers: Headers, { getState }: { getState: () => unknown }) => {
  const token = (getState() as RootState).auth.accessToken;
  if (token) headers.set('authorization', `Bearer ${token}`);
  headers.set('x-device-id', getDeviceId());
  return headers;
};

/** Everything except auth calls the API directly (NEXT_PUBLIC_API_URL, defaulted in next.config.mjs). */
const directQuery = fetchBaseQuery({
  baseUrl: `${process.env.NEXT_PUBLIC_API_URL}/api`,
  prepareHeaders,
});

/**
 * Auth goes through this app's origin (rewritten to the API in next.config.mjs), so the refresh
 * cookie is first-party and survives a page reload.
 */
const authQuery = fetchBaseQuery({ baseUrl: '/api', credentials: 'include', prepareHeaders });

const rawBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = (
  args,
  api,
  extraOptions,
) => {
  const url = typeof args === 'string' ? args : args.url;
  return (url.startsWith('/auth/') ? authQuery : directQuery)(args, api, extraOptions);
};

let refreshPromise: Promise<{ user: AuthUser; tokens: AuthTokens } | null> | null = null;

async function refreshSession(
  api: Parameters<BaseQueryFn>[1],
): Promise<{ user: AuthUser; tokens: AuthTokens } | null> {
  const result = await rawBaseQuery({ url: '/auth/refresh', method: 'POST' }, api, {});
  if (result.error) return null;
  const body = result.data as { success: true; data: { user: AuthUser; tokens: AuthTokens } };
  return body.data;
}

/** Public auth endpoints: a 401 from these means "bad credentials / no session", not "access token expired". */
const NO_REAUTH_URLS = new Set([
  '/auth/refresh',
  '/auth/login',
  '/auth/register',
  '/auth/invites/preview',
  '/auth/invites/accept',
]);

/** Wraps the base query: on a 401, refresh the session once (cookie-based) and replay the original request. */
export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  const url = typeof args === 'string' ? args : args.url;

  if (result.error?.status === 401 && !NO_REAUTH_URLS.has(url)) {
    refreshPromise ??= refreshSession(api);
    const refreshed = await refreshPromise;
    refreshPromise = null;

    if (refreshed) {
      api.dispatch(setCredentials(refreshed));
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(setUnauthenticated());
    }
  }

  return result;
};

export function extractErrorMessage(error: unknown): string {
  const fetchError = error as { data?: ApiErrorResponse } | undefined;
  const apiError = fetchError?.data?.error;
  // Validation errors carry Zod issues; the first one is more useful than the generic summary.
  const firstIssue = Array.isArray(apiError?.details)
    ? (apiError.details[0] as { message?: unknown } | undefined)?.message
    : undefined;
  if (typeof firstIssue === 'string') return firstIssue;
  return apiError?.message ?? 'Something went wrong — please try again';
}

/**
 * Pass to every `injectEndpoints`: hot reload re-runs feature modules, which re-injects the same
 * endpoints. Allow that in development; in production a duplicate name is still flagged.
 */
export const OVERRIDE_ON_HMR = process.env.NODE_ENV === 'development';

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Conversations',
    'Messages',
    'Users',
    'Presence',
    'Organization',
    'Invites',
    'Meetings',
  ],
  endpoints: () => ({}),
});
