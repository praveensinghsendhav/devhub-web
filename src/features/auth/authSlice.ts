import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthTokens, AuthUser, PresenceUpdatePayload } from '@devhub/shared-types';

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  status: AuthStatus;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  accessTokenExpiresAt: null,
  status: 'idle',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: AuthUser; tokens: AuthTokens }>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.tokens.accessToken;
      state.accessTokenExpiresAt = action.payload.tokens.accessTokenExpiresAt;
      state.status = 'authenticated';
    },
    setAuthLoading(state) {
      state.status = 'loading';
    },
    setUnauthenticated(state) {
      state.user = null;
      state.accessToken = null;
      state.accessTokenExpiresAt = null;
      state.status = 'unauthenticated';
    },
    /** Merges a live presence broadcast into the current user, so "my own" status dot stays in sync too. */
    applyOwnPresenceUpdate(state, action: PayloadAction<PresenceUpdatePayload>) {
      if (state.user && state.user.id === action.payload.userId) {
        state.user.status = action.payload.status;
        state.user.customStatus = action.payload.customStatus;
      }
    },
  },
});

export const { setCredentials, setAuthLoading, setUnauthenticated, applyOwnPresenceUpdate } =
  authSlice.actions;
export default authSlice.reducer;
