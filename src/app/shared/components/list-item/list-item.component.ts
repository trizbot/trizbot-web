import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { Helper } from '../../utils/helper.util';

@Component({
  selector: 'app-list-item',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './list-item.component.html',
  styleUrl: './list-item.component.scss',
})
export class ListItemComponent {
  title = input.required<string>();
  iconName = input<string>();
  subtitle = input.required<string | number | null | undefined>();
  dataType = input<'text' | 'number' | 'url' | 'amount'>('text');
  truncate = input(false);

  truncateString(text: string, length = 20) {
    return Helper.truncate(text, length);
  }
}
