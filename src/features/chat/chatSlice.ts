import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { TypingUpdatePayload } from '@devhub/shared-types';

interface ChatUiState {
  /** conversationId → userId → display name of everyone currently typing there. */
  typing: Record<string, Record<string, string>>;
  /** The conversation open on screen, so realtime events know whether to count unread. */
  activeConversationId: string | null;
}

const initialState: ChatUiState = { typing: {}, activeConversationId: null };

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    typingChanged(state, action: PayloadAction<TypingUpdatePayload>) {
      const { conversationId, userId, name, isTyping } = action.payload;
      const room = (state.typing[conversationId] ??= {});
      if (isTyping) room[userId] = name;
      else delete room[userId];
    },
    activeConversationChanged(state, action: PayloadAction<string | null>) {
      state.activeConversationId = action.payload;
    },
  },
});

export const { typingChanged, activeConversationChanged } = chatSlice.actions;
export default chatSlice.reducer;
