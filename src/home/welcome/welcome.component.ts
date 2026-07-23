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

export interface PlatformFeature {
  title: string;
  desc: string;
  icon: string;
  badge?: string;
  pricing?: { label: string; value: string }[];
  pricingNote?: string;
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

  features: PlatformFeature[] = [
    {
      title: 'In-App Transfer',
      desc: 'Send funds instantly to any user on the platform using just their username or email address — no wallet address needed.',
      badge: 'Free',
      icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M4 8h13M17 8l-3.5-3.5M17 8l-3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
               <path d="M20 16H7M7 16l3.5-3.5M7 16l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
             </svg>`,
    },
    {
      title: 'Live Arbitrage Scanner',
      desc: 'Real-time opportunities across platforms — token names, price differences, exchange pairs, and spread percentages, updated continuously.',
      icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/>
               <path d="M12 12l5-3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
               <circle cx="12" cy="12" r="1.6" fill="currentColor"/>
             </svg>`,
      pricing: [
        { label: 'Spreads ≤ 1%', value: 'Free' },
        { label: 'Weekly (2%+ spreads)', value: '50 USDT' },
        { label: 'Monthly (2%+ spreads)', value: '120 USDT' },
      ],
      pricingNote: 'Spreads of 2% and above require an active subscription.',
    },
    {
      title: 'P2P Transaction',
      desc: 'Buy and sell USDT directly with other users on the platform at competitive, transparent rates.',
      badge: 'Free',
      icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.6"/>
               <circle cx="16" cy="16" r="3" stroke="currentColor" stroke-width="1.6"/>
               <path d="M10.5 9.5L19 15M13.5 14.5L5 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
             </svg>`,
    },
    {
      title: 'Feed — Crypto Updates',
      desc: 'Stay ahead with a continuous feed of market trends, breaking news, and curated crypto updates in one place.',
      badge: 'Free',
      icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M5 4v16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
               <path d="M5 4c6 0 8 2 8 8M5 9c4 0 5.5 1.5 5.5 5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
               <circle cx="5.5" cy="18.5" r="1.6" fill="currentColor"/>
             </svg>`,
    },
    {
      title: 'Crypto Academy',
      desc: 'Buy and sell crypto trading courses created by the community. TrizBot takes a 10% platform fee on every course sold.',
      badge: '10% platform fee',
      icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M12 4L2 8.5l10 4.5 10-4.5L12 4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
               <path d="M6 11v4.5c0 1.5 2.7 3 6 3s6-1.5 6-3V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
             </svg>`,
    },
    {
      title: 'Signals',
      desc: 'Subscribe for access to real-time trading signals curated and shared across the platform.',
      icon: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M12 19v-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
               <path d="M8.5 14.5a5 5 0 010-7M15.5 14.5a5 5 0 000-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
               <path d="M5.5 17.5a9 9 0 010-13M18.5 17.5a9 9 0 000-13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
             </svg>`,
      pricing: [
        { label: 'Daily', value: '10 USDT' },
        { label: 'Weekly', value: '55 USDT' },
        { label: 'Monthly', value: '200 USDT' },
      ],
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