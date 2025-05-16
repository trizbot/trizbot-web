import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { LoaderComponent } from '../loader/loader.component';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, LoaderComponent],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  @Output() btnClick = new EventEmitter<void>();

  @Input({ required: true }) text!: string;
  @Input() type = 'button';
  @Input() color: 'primary' | 'success' | 'warning' | 'danger' = 'primary';
  @Input() fullWidth = false;
  @Input() disabled = false;
  @Input() loading = false;
  @Input() loadingText = 'Loading...';
}
