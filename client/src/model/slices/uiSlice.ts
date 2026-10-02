import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UiState {
  connected: boolean;
}

const initialState: UiState = { connected: false };

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    connectionChanged(state, action: PayloadAction<boolean>) {
      state.connected = action.payload;
    },
  },
});

export const { connectionChanged } = uiSlice.actions;
export default uiSlice.reducer;
