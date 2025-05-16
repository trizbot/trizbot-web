import { Component } from '@angular/core';
import { CoreService } from 'src/app/services/core.service';

@Component({
  selector: 'app-branding',
  imports: [],
  template: `
    <a href="/" class="logodark">
      <img 
        src="./assets/images/logos/dark-logo.jpg"
        class="align-middle m-2"
        alt="logo" 
        style="width: 100px; height: auto;" 
      />
    </a>
  `,
})
export class BrandingComponent {
  options = this.settings.getOptions();
  constructor(private settings: CoreService) {}
}
