import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgxImageCompressService } from 'ngx-image-compress';

@Component({
  selector: 'app-file-picker',
  standalone: true,
  imports: [CommonModule],
  providers: [NgxImageCompressService],
  templateUrl: './file-picker.component.html',
  styleUrl: './file-picker.component.scss',
})
export class FilePickerComponent {
  @Input() label = '';
  @Input() classes = '';

  @Output() filesSelected = new EventEmitter<File[]>();
  @Output() previewUrls = new EventEmitter<string[]>();

  images: File[] = [];
  urls: string[] = [];

  constructor(private imageCompress: NgxImageCompressService) {}

  async compressImages() {
    const files: { image: string; fileName: string; orientation: number }[] =
      await this.imageCompress.uploadMultipleFiles();

    files.forEach(async (file) => {
      const compressedImage = await this.imageCompress.compressFile(
        file.image,
        file.orientation,
        50,
        50
      );

      this.urls.push(compressedImage);
      const f = this.dataURLtoFile(compressedImage, file.fileName);
      this.images.push(f);

      if (this.images.length === files.length) {
        this.filesSelected.emit([...this.images]);
        this.previewUrls.emit([...this.urls]);
        this.images = [];
        this.urls = [];
      }
    });
  }

  dataURLtoFile(dataUrl: string, filename: string) {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)!;
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime[1] });
  }
}
