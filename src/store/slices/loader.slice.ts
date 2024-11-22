import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

export interface LoaderState {
  loading: boolean;
  text?: string;
}

const initState: LoaderState = {
  loading: false
}

export const loaderSlice = createSlice({
  name: 'loader',
  initialState: initState,
  reducers: {
    setLoader: (state, action: PayloadAction<LoaderState>) => {
      state.loading = action.payload.loading;
      state.text = action.payload.text;
    },
  }
});

export const { setLoader } = loaderSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const loaderState = (state: RootState) => state.loader;

export default loaderSlice.reducer;