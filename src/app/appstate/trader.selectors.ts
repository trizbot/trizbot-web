import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TraderState } from './trader.reducer';

export const selectTraderState = createFeatureSelector<TraderState>('trader');

export const selectTrader = createSelector(
  selectTraderState,
  (state) => state.trader
);

export const selectTraderLoading = createSelector(
  selectTraderState,
  (state) => state.loading
);

export const selectTraderError = createSelector(
  selectTraderState,
  (state) => state.error
);
