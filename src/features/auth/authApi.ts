import type { AuthUser, LoginRequest, LoginResponse } from '@devhub/shared-types';
import { baseApi, OVERRIDE_ON_HMR } from '../../store/apiBase';
import { unwrap } from '../../store/unwrap';

export const authApi = baseApi.injectEndpoints({
  overrideExisting: OVERRIDE_ON_HMR,
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({ url: '/auth/login', method: 'POST', body: credentials }),
      transformResponse: unwrap<LoginResponse>,
    }),
    logout: builder.mutation<null, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      transformResponse: unwrap<null>,
    }),
    /** Resumes a session from the httpOnly refresh cookie on app load — no access token required yet. */
    bootstrapSession: builder.mutation<LoginResponse, void>({
      query: () => ({ url: '/auth/refresh', method: 'POST' }),
      transformResponse: unwrap<LoginResponse>,
    }),
    getMe: builder.query<AuthUser, void>({
      query: () => ({ url: '/auth/me' }),
      transformResponse: unwrap<AuthUser>,
      providesTags: ['Users'],
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useBootstrapSessionMutation,
  useLazyGetMeQuery,
} = authApi;
