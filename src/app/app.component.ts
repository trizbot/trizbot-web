import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { environment } from '../environments/environment';


@Component({
    selector: 'app-root',
    imports: [RouterOutlet],
    templateUrl: './app.component.html'
})
export class AppComponent {
logout() {
throw new Error('Method not implemented.');
}
  title = environment.companyName;
}
