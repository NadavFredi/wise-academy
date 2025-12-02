import { configureStore } from '@reduxjs/toolkit';
import { attendanceApi } from './api/attendanceApi';
import { cohortsApi } from './api/cohortsApi';
import authSlice from './slices/authSlice';
import attendanceSlice from './slices/attendanceSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    attendance: attendanceSlice,
    [attendanceApi.reducerPath]: attendanceApi.reducer,
    [cohortsApi.reducerPath]: cohortsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(attendanceApi.middleware, cohortsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

