import { configureStore } from '@reduxjs/toolkit';
// import loadingReducer from './slices/loading';
import walletReducer from './slices/wallet';
// import tokensReducer from './slices/tokens';

export const store = configureStore({
    reducer: {
        // loading: loadingReducer,
        wallet: walletReducer,
        // tokens: tokensReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
