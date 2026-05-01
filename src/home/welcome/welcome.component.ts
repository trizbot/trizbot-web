import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Component, OnInit, HostListener } from '@angular/core';

export interface ArbOpportunity {
  pair: string;
  buyOn: string;
  sellOn: string;
  profit: string;
}

export interface HowItWorksStep {
  title: string;
  desc: string;
  icon: string;
}

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
  ],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss'],
})
export class WelcomeComponent implements OnInit {

  currentYear!: number;
  menuOpen = false;

  opportunities: ArbOpportunity[] = [
    { pair: 'BTC/USDT',       buyOn: 'Binance', sellOn: 'Bitmart', profit: '4.00%' },
    { pair: 'ANIME/BNB/USDT', buyOn: 'Binance', sellOn: 'Binance', profit: '2.00%' },
    { pair: 'COMP/BTC',       buyOn: 'Binance', sellOn: 'Bybit',   profit: '2.50%' },
    { pair: 'ETH/USDT',       buyOn: 'Bybit',   sellOn: 'Bitmart', profit: '2.00%' },
  ];

  steps: HowItWorksStep[] = [
    {
      title: 'Scan',
      desc: 'TrizBot continuously scans 47+ exchanges every 0.3 seconds to surface profitable arbitrage windows.',
      icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.6"/>
               <path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
               <path d="M8 11h6M11 8v6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
             </svg>`,
    },
    {
      title: 'Analyze',
      desc: 'Real-time visual insights on spread percentages, volume depth, fees, and net profit estimates.',
      icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M4 20V14M8 20V10M12 20V6M16 20V12M20 20V8"
                     stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
             </svg>`,
    },
    {
      title: 'Automate',
      desc: 'Configure execution parameters and let TrizBot handle order placement and monitoring automatically.',
      icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/>
               <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"
                     stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
             </svg>`,
    },
    {
      title: 'Earn',
      desc: 'Watch profits accumulate across completed arbitrage cycles. Withdraw or compound at any time.',
      icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/>
               <path d="M12 7v2.5M12 14.5V17M9.5 9.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5c0 2.5-5 2.5-5 5h5"
                     stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
             </svg>`,
    },
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.currentYear = new Date().getFullYear();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.menuOpen && !target.closest('.tz-nav-inner')) {
      this.menuOpen = false;
    }
  }
}