
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {Component, OnInit, ViewEncapsulation} from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatExpansionModule,
    MatIconModule,  
  ],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit{
currentYear: any;
  constructor(private router: Router) {}

  title = 'Trizbot';


  ngOnInit() {  
    this.currentYear= new Date().getFullYear();

  }

  
 }


