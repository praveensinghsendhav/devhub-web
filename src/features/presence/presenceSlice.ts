import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PresenceUpdatePayload } from '@devhub/shared-types';

interface PresenceState {
  byUserId: Record<string, PresenceUpdatePayload>;
}

const initialState: PresenceState = { byUserId: {} };

const presenceSlice = createSlice({
  name: 'presence',
  initialState,
  reducers: {
    presenceUpdated(state, action: PayloadAction<PresenceUpdatePayload>) {
      state.byUserId[action.payload.userId] = action.payload;
    },
    presenceBulkLoaded(state, action: PayloadAction<PresenceUpdatePayload[]>) {
      for (const payload of action.payload) {
        state.byUserId[payload.userId] = payload;
      }
    },
  },
});

export const { presenceUpdated, presenceBulkLoaded } = presenceSlice.actions;
export default presenceSlice.reducer;
