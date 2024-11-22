import { configureStore } from '@reduxjs/toolkit';
import walletReducer from './slices/wallet.slice';
import loaderReducer from './slices/loader.slice'

export const store = configureStore({
    reducer: {
        wallet: walletReducer,
        loader: loaderReducer
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
