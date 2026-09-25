import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { baseApi } from './apiBase';
import authReducer from '../features/auth/authSlice';
import presenceReducer from '../features/presence/presenceSlice';
import chatReducer from '../features/chat/chatSlice';
import meetingsReducer from '../features/meetings/meetingsSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  presence: presenceReducer,
  chat: chatReducer,
  meetings: meetingsReducer,
  [baseApi.reducerPath]: baseApi.reducer,
});

export function makeStore() {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore['dispatch'];
