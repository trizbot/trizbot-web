import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class SharedService {
  private toast = Swal.mixin({
    toast: true,
    position: 'top',
    showConfirmButton: false,
    showCloseButton: true,
  });

  showToast(data: {
    title: any;
    text?: string;
    background?: string;
    timer?: number;
    showCloseBtn?: boolean;
    timerProgressBar?: boolean;
  }) {
    this.toast.fire({
      title: data.title,
      text: data.text,
      background: data.background || '#90ee90',
      timer: data.timer || 5000,
      showCloseButton: data.showCloseBtn || false,
      timerProgressBar: data.timerProgressBar || false,
    });
  }
}
