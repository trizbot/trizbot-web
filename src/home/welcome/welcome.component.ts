
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
  constructor(private router: Router) {}

  title = 'Trizbot';

  tradeOpportunities = [
    {
      title: 'BTC/USDT',
      buyExchange: 'Binance',
      sellExchange: 'Bitmart',
      profit: '4%',
    },
    {
      title: 'ANIME/BNB/USDT',
      buyExchange: 'Binance',
      sellExchange: 'Binance',
      profit: '2%',
    },
    {
      title: 'COMP/BTC',
      buyExchange: 'Binance',
      sellExchange: 'Bybit',
      profit: '2.5%',
    },
  ];

  goToSignup() {
    this.router.navigate(['/signup']);
  }

  goToFaq() {
    this.router.navigate(['/faq']);
  }

  joinTelegram() {
    window.open('https://t.me/trizbotglobal', '_blank');
  }



  ngOnInit() {
  }
  list: { question: string; answer: string }[] = [
    {
      question: 'What is crypto arbitrage?',
      answer: 'Crypto arbitrage is a trading strategy that leverages price differences across exchanges to generate profit with minimal risk.'
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


