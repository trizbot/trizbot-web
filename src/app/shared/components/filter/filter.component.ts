import { Component, input, output } from '@angular/core';

import { Option } from '../../shared.types';

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [],
  templateUrl: './filter.component.html',
  styleUrl: './filter.component.scss',
})
export class FilterComponent {
  options = input.required<Option[]>();
  label = input('Filter: ');

  selected = output<string>();

  onSelect(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.selected.emit(value);
  }
}
