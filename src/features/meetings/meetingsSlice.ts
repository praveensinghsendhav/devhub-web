import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { MeetingRingPayload } from '@devhub/shared-types';

interface MeetingsUiState {
  /** Incoming calls ringing right now, newest last. */
  rings: MeetingRingPayload[];
}

const initialState: MeetingsUiState = { rings: [] };

const meetingsSlice = createSlice({
  name: 'meetings',
  initialState,
  reducers: {
    ringStarted(state, action: PayloadAction<MeetingRingPayload>) {
      state.rings = [
        ...state.rings.filter((r) => r.meetingId !== action.payload.meetingId),
        action.payload,
      ];
    },
    ringStopped(state, action: PayloadAction<string>) {
      state.rings = state.rings.filter((r) => r.meetingId !== action.payload);
    },
  },
});

export const { ringStarted, ringStopped } = meetingsSlice.actions;
export default meetingsSlice.reducer;
