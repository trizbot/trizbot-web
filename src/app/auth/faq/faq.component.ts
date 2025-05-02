import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MaterialModule } from '../../../app/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatExpansionModule,
    MatIconModule,
 MaterialModule, FormsModule, ReactiveFormsModule,],
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent implements OnInit {
  currentYear: number;
  title = 'Trizbot';
  faqs: { question: string; answer: string }[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    this.currentYear = new Date().getFullYear(); 



    this.faqs = [
      {
        question: 'What is crypto arbitrage? ',
        answer: 'Crypto arbitrage is a trading strategy that leverages price differences across exchanges to generate profit with minimal risk..'
      },
      {
        question: 'How do you find opportunities?',
        answer: 'Trizbot scans multiple exchanges and surfaces only the most profitable opportunities.'
      },
      {
        question: 'How do trades run on Trizbot?',
        answer: 'All trades can be automated after choosing an opportunity, making earning easy and passive.'
      }
    ];
  }
}
