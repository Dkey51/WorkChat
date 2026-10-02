import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Message } from '@isq/shared';

export interface ChatState {
  messagesByContact: Record<number, Message[]>;
  typingByContact: Record<number, boolean>;
  unreadByContact: Record<number, number>;
}

const initialState: ChatState = {
  messagesByContact: {},
  typingByContact: {},
  unreadByContact: {},
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    messageReceived(state, action: PayloadAction<{ message: Message; peer: number }>) {
      const { message, peer } = action.payload;
      if (!state.messagesByContact[peer]) state.messagesByContact[peer] = [];
      state.messagesByContact[peer].push(message);
    },
    historyLoaded(state, action: PayloadAction<{ with: number; messages: Message[] }>) {
      state.messagesByContact[action.payload.with] = action.payload.messages;
    },
    typingChanged(state, action: PayloadAction<{ from: number; typing: boolean }>) {
      state.typingByContact[action.payload.from] = action.payload.typing;
    },
    messageEdited(state, action: PayloadAction<{ peer: number; message: Message }>) {
      const { peer, message } = action.payload;
      const arr = state.messagesByContact[peer];
      if (arr) {
        const i = arr.findIndex((m) => m.id === message.id);
        if (i >= 0) arr[i] = message;
      }
    },
    messageDeleted(state, action: PayloadAction<{ peer: number; id: string }>) {
      const { peer, id } = action.payload;
      const arr = state.messagesByContact[peer];
      if (arr) state.messagesByContact[peer] = arr.filter((m) => m.id !== id);
    },
    incrementUnread(state, action: PayloadAction<{ peer: number }>) {
      state.unreadByContact[action.payload.peer] =
        (state.unreadByContact[action.payload.peer] ?? 0) + 1;
    },
    markRead(state, action: PayloadAction<{ peer: number }>) {
      state.unreadByContact[action.payload.peer] = 0;
    },
    chatReset(state) {
      state.messagesByContact = {};
      state.typingByContact = {};
      state.unreadByContact = {};
    },
  },
});

export const {
  messageReceived,
  historyLoaded,
  typingChanged,
  messageEdited,
  messageDeleted,
  incrementUnread,
  markRead,
  chatReset,
} = chatSlice.actions;
export default chatSlice.reducer;
