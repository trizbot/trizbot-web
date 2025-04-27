import { createAction, props } from '@ngrx/store';
import { Trader } from './appstate-model';

export const loadTrader = createAction('[Trader] Load Trader');

export const loadTraderSuccess = createAction(
  '[Trader] Load Trader Success',
  props<{ trader: Trader }>()
);

export const loadTraderFailure = createAction(
  '[Trader] Load Trader Failure',
  props<{ error: any }>()
);
