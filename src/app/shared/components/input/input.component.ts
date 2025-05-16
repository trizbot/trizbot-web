import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
})
export class InputComponent {
  @Input({ required: true }) control: any;
  @Input() placeholder = '';
  @Input() fullWidth = true;
  @Input() type: 'text' | 'password' | 'email' | 'number' | 'textarea' = 'text';
  @Input() containerClasses = 'mb-5';
  @Input() textareaRows = 5;
  @Input() inputClasses = '';
  @Input() label?: string;
  @Input() id?: string;
}
