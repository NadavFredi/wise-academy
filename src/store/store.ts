import { configureStore } from '@reduxjs/toolkit';
import { attendanceApi } from './api/attendanceApi';
import authSlice from './slices/authSlice';
import attendanceSlice from './slices/attendanceSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    attendance: attendanceSlice,
    [attendanceApi.reducerPath]: attendanceApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(attendanceApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

