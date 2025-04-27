
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';



@Component({
  selector: 'app-welcome',
  imports: [
    CommonModule,
    RouterModule,
  ],
  templateUrl: './welcome.component.html',
  styleUrls: [
    './welcome.component.scss'
    ]
})
export class WelcomeComponent {
  title = 'Trizbot';

  bannerImage=[
{
  id:1,
  img:'../ssets/images/uk.png',
  description:'Uk logon is good',
  title:'logo'
}
,
{
  id:1,
  img:'../assets/images/niger.png',
    description:'nigeria logon is good but tinibu',
  title:'logo'
}

]


}
