import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
// import { TraderService } from '../../services/trader.service';
import { loadTrader, loadTraderSuccess, loadTraderFailure } from './trader.actions';
import { TraderService } from './trader.service';

@Injectable()
export class TraderEffects {
  loadTrader$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadTrader),
      mergeMap(() =>
        this.traderService.getTrader().pipe(
          map((res) => loadTraderSuccess({ trader: res.data })),
          catchError((error) => of(loadTraderFailure({ error })))
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private traderService: TraderService
  ) {}
}
