import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-user-feature-modal',
  imports: [
    FormsModule,
    MatDialogModule,
    MatCheckboxModule,
  ],
  templateUrl: 'user-feature-modal.component.html',
})
export class UserFeatureModalComponent {
  constructor(
    public dialogRef: MatDialogRef<UserFeatureModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onSave() {
    this.dialogRef.close(this.data); // send updated data back
  }

  onCancel() {
    this.dialogRef.close();
  }
}
