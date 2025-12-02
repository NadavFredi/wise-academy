import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isAuthenticated: boolean;
  sessionToken: string | null;
}

const initialState: AuthState = {
  isAuthenticated: !!localStorage.getItem('admin_session'),
  sessionToken: localStorage.getItem('admin_session'),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthenticated: (state, action: PayloadAction<string>) => {
      state.isAuthenticated = true;
      state.sessionToken = action.payload;
      localStorage.setItem('admin_session', action.payload);
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.sessionToken = null;
      localStorage.removeItem('admin_session');
    },
  },
});

export const { setAuthenticated, logout } = authSlice.actions;
export default authSlice.reducer;

