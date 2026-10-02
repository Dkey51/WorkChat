import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthResult, PublicUser, UserStatus } from '@isq/shared';
import type { ChatApi } from '../api';

export interface AuthState {
  user: PublicUser | null;
  status: 'idle' | 'loading';
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
};

export const login = createAsyncThunk<
  AuthResult,
  { login: string; password: string },
  { extra: ChatApi }
>('auth/login', async (payload, { extra }) => extra.login(payload.login, payload.password));

export const register = createAsyncThunk<
  AuthResult,
  { nickname: string; password: string },
  { extra: ChatApi }
>('auth/register', async (payload, { extra }) =>
  extra.register(payload.nickname, payload.password)
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logoutUser(state) {
      state.user = null;
      state.status = 'idle';
      state.error = null;
    },
    selfStatusChanged(state, action: PayloadAction<UserStatus>) {
      if (state.user) state.user.status = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'idle';
        if (action.payload.ok && action.payload.user) {
          state.user = action.payload.user;
          state.error = null;
        } else {
          state.error = action.payload.error ?? 'Не удалось войти';
        }
      })
      .addCase(login.rejected, (state) => {
        state.status = 'idle';
        state.error = 'Сервер недоступен';
      })
      .addCase(register.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.status = 'idle';
        if (action.payload.ok && action.payload.user) {
          state.user = action.payload.user;
          state.error = null;
        } else {
          state.error = action.payload.error ?? 'Не удалось зарегистрироваться';
        }
      })
      .addCase(register.rejected, (state) => {
        state.status = 'idle';
        state.error = 'Сервер недоступен';
      });
  },
});

export const { logoutUser, selfStatusChanged, clearError } = authSlice.actions;
export default authSlice.reducer;
