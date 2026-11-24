import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppError } from '@/types/api/errors';
import type { AppDispatch, RootState } from '@/types/store';

export const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: RootState;
  dispatch: AppDispatch;
  rejectValue: AppError;
}>();
