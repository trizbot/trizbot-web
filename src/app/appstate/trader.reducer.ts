import { createReducer, on } from '@ngrx/store';
import { Trader } from './appstate-model';
import { loadTrader, loadTraderSuccess, loadTraderFailure } from './trader.actions';

export interface TraderState {
  trader: Trader | null;
  loading: boolean;
  error: any;
}

export const initialState: TraderState = {
  trader: null,
  loading: false,
  error: null
};

export const traderReducer = createReducer(
  initialState,
  on(loadTrader, (state) => ({ ...state, loading: true })),
  on(loadTraderSuccess, (state, { trader }) => ({
    ...state,
    trader,
    loading: false
  })),
  on(loadTraderFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
