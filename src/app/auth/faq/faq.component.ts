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
  },
  {
    question: 'How do I get started on Trizbot?',
    answer: 'Create an account on the platform with valid details and a verified email. Afterwards, fund your account with the minimum deposit, then go through the available trades for profitable arbitrage opportunities that best suit you and simply set up the trades you desire.'
  },
  {
    question: 'Are my trades secured?',
    answer: 'Yes, your trades are absolutely secured with little to no risks! Our system scans the market for numerous profitable crypto arbitrage opportunities and presents them to you, making your arbitrage trades easier and more profitable.'
  },
  {
    question: 'When can I trade on Trizbot?',
    answer: 'Trading opportunities are available from Monday to Friday. The market is closed on weekends (Saturday and Sunday).'
  },
  {
    question: 'How are trading profits determined and are profits static?',
    answer: 'No, profits are not static. Profits are determined by the available crypto arbitrage opportunities in the market and how many trades you execute.'
  },
  {
    question: 'How do I make deposits on the platform?',
    answer: 'Simply click on the deposit feature available on your dashboard, choose a suitable network, and input the amount you wish to deposit. An address will be generated with the exact amount to deposit. Send the exact figure displayed to the provided address to avoid loss of funds.'
  },
  {
    question: 'What is the minimum deposit?',
    answer: 'The minimum deposit is 150 USDT.'
  },
  {
    question: 'Can I make deposits via any USDT network?',
    answer: 'No, you can only deposit USDT using the BEP20 (BSC) or Polygon (Matic) networks.'
  },
  {
    question: 'I made deposits using the wrong network and wrong address. How do I fix this?',
    answer: 'Unfortunately, you can’t. The platform is not liable for any loss incurred via wrong network or address deposits.'
  },
  {
    question: 'Are there charges for deposit on the platform?',
    answer: 'Yes, the platform charges a fixed amount depending on the current deposit processing fee. This charge is added to your total deposit amount during the deposit process.'
  },
  {
    question: 'How do I make withdrawals?',
    answer: 'First, add a valid USDT address to your wallet on the platform using the available network. Then, set up a transaction PIN under your settings. Afterwards, go to your dashboard, click on the withdrawal feature, input the desired amount and your transaction PIN. Funds will be sent within a few minutes depending on network confirmation.'
  },
  {
    question: 'Is the login password the same as the transaction pin?',
    answer: 'No. Your login password is used to access your account, while the transaction pin is used for withdrawals.'
  },
  {
    question: 'When can I make withdrawals?',
    answer: 'Withdrawals are only available on weekends—Saturday and Sunday—after the market closes. Withdrawals are not available during the weekdays.'
  },
  {
    question: 'Are there charges on withdrawals?',
    answer: 'Yes, the platform charges a 5% service fee on any withdrawal made.'
  },
  {
    question: 'Are there other hidden fees on the platform?',
    answer: 'No, there are no hidden charges aside from the deposit processing fee and the 5% service fee deducted during withdrawals.'
  },
  {
    question: 'Aside from trading, is there any other way to earn on Trizbot?',
    answer: 'Yes, you can earn through the referral program.'
  },
  {
    question: 'What is the referral commission?',
    answer: 'You earn 3% of the first deposit made by your referral.'
  },
  {
    question: 'Can I withdraw my referral bonus without having to trade?',
    answer: 'Absolutely! You can withdraw your earnings, including your referral bonus, during the withdrawal days.'
  },
  {
    question: 'I have an issue or further inquiries. How do I contact support?',
    answer: 'Log in to your dashboard and click on the “Contact Support” feature. You can either talk to a live agent or use any of the other available options.'
  }
];
  }

}
