import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { TOKEN_KEY } from '../api/client';
import { apiErrorMessage } from '../api/client';
import { authApi } from '../api';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  status: 'idle' | 'loading' | 'error';
  error: string | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
  error: null,
  initialized: false,
};

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (payload: { email: string; password: string }, { rejectWithValue }) => {
    try {
      return await authApi.login(payload);
    } catch (err) {
      return rejectWithValue(apiErrorMessage(err));
    }
  },
);

export const registerThunk = createAsyncThunk(
  'auth/register',
  async (payload: { email: string; name: string; password: string }, { rejectWithValue }) => {
    try {
      return await authApi.register(payload);
    } catch (err) {
      return rejectWithValue(apiErrorMessage(err));
    }
  },
);

export const fetchMeThunk = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    return await authApi.me();
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
    }
    return rejectWithValue(apiErrorMessage(err));
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      localStorage.removeItem(TOKEN_KEY);
      state.user = null;
      state.status = 'idle';
      state.error = null;
    },
    clearError(state) {
      state.error = null;
    },
    markInitialized(state) {
      state.initialized = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.status = 'idle';
        state.user = action.payload.user;
        state.initialized = true;
        localStorage.setItem(TOKEN_KEY, action.payload.accessToken);
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? 'Login failed';
      })
      .addCase(registerThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.status = 'idle';
        state.user = action.payload.user;
        state.initialized = true;
        localStorage.setItem(TOKEN_KEY, action.payload.accessToken);
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? 'Registration failed';
      })
      .addCase(fetchMeThunk.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
        state.initialized = true;
      })
      .addCase(fetchMeThunk.rejected, (state) => {
        state.user = null;
        state.initialized = true;
      });
  },
});

export const { logout, clearError, markInitialized } = authSlice.actions;
export default authSlice.reducer;
