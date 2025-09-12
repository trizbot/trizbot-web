
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {Component, OnInit, ViewEncapsulation} from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';

@Component({
 
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatExpansionModule,
    MatIconModule,  
  ],
  selector: 'app-not-found',

  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss'
})

export class NotFoundComponent implements OnInit{
currentYear: any;
  constructor(private router: Router) {}

  title = 'Trizbot';


  ngOnInit() {  
    this.currentYear= new Date().getFullYear();

  }

  
 }