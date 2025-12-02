import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AttendanceState {
  selectedCohortId: string | null;
  selectedDates: string[];
}

const initialState: AttendanceState = {
  selectedCohortId: '00000000-0000-0000-0000-000000000001',
  selectedDates: [],
};

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    setSelectedCohort: (state, action: PayloadAction<string>) => {
      state.selectedCohortId = action.payload;
      state.selectedDates = []; // Reset dates when cohort changes
    },
    setSelectedDates: (state, action: PayloadAction<string[]>) => {
      state.selectedDates = action.payload;
    },
    toggleDate: (state, action: PayloadAction<string>) => {
      const date = action.payload;
      if (state.selectedDates.includes(date)) {
        state.selectedDates = state.selectedDates.filter((d) => d !== date);
      } else {
        state.selectedDates.push(date);
      }
    },
    clearSelectedDates: (state) => {
      state.selectedDates = [];
    },
  },
});

export const { setSelectedCohort, setSelectedDates, toggleDate, clearSelectedDates } =
  attendanceSlice.actions;
export default attendanceSlice.reducer;

