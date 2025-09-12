import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Angular Material Modules
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

// App Services
import { MaterialModule } from '../../../material.module';
import { CoreService } from '../../../services/core.service';
import { CryptoService } from '../crypto/crypto.service';
import { SharedService } from '../../../shared/shared.service';
import { TraderService } from '../../../../app/appstate/trader.service';
import { MatDialog } from '@angular/material/dialog';
import { UserFeatureModalComponent } from '../user-disabled-popup-feature/user-feature-modal.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    MatFormFieldModule,
    MatSelectModule,
    MatRadioModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatCheckboxModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent implements OnInit {
  private sharedService = inject(SharedService);

  errorMessage: string = '';
  selectedCryptoId: string = '';
  loading: boolean = false;
  isUpdatingWallet: boolean = false;

displayedColumns: string[] = [
  'imageUrl', 'userName', 'country', 'phoneNumber', 'email',
  'walletBalance', 'profit', 'createdAt', 'actions'
];

  dataSource = new MatTableDataSource<any>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private settings: CoreService,
    private cryptoService: CryptoService,
    private traderService: TraderService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.getUsers();
  }

totalUsers = 0;

onPageChange(event: PageEvent) {
  this.getUsers(event.pageIndex, event.pageSize);
}

  getUsers(pageIndex = 0, pageSize = 10) {
  this.traderService.getAllTraders({ page: pageIndex + 1, limit: pageSize }).subscribe({
    next: (res: any) => {
      this.dataSource.data = res.data;
      this.totalUsers = res.total; // bind to MatPaginator via [length]
    },
    error: () => {
      this.errorMessage = 'Failed to load users.';
    }
  });
}

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  onSetupReview(id: string) {
    this.selectedCryptoId = id;
    const encodedId = btoa(id);
    this.router.navigate(['/myaccount/review', encodedId]);
  }


  exportToCSV() {
  const csvData = this.dataSource.data.map((user: any) => ({
    Username: user.userName,
    Email: user.email,
    Phone: user.phoneNumber,
    Country: user.country,
    Wallet: user.walletBalance,
    Profit: user.profit,
    referralCount: user.referralCount,
    CreatedAt: new Date(user.createdAt).toLocaleString()
  }));

  const csvContent = [
    Object.keys(csvData[0]).join(','), // headers
    ...csvData.map(row => Object.values(row).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'users.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
onViewProfile(id: string) {
  const encodedId = btoa(id);
  this.router.navigate(['/myaccount/profile', encodedId]);
}





  openFeatureModal(user: any) {
    const dialogRef = this.dialog.open(UserFeatureModalComponent, {
      width: '400px',
      data: { ...user }, // pass user data into modal
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
          this.traderService.disabledUserFeature({ traderId: user.id, result: result }).subscribe({
    next: (res: any) => {
      this.sharedService.showToast({
          title: `${user.lastName} ${user.firstName} Wallet has been successfully updated.`,
        });
        this.isUpdatingWallet = false;
      },
      error: (err) => {
         this.sharedService.showToast({
          title:  `${result} `,
        });
        this.isUpdatingWallet = false;

      },
  });

        // TODO: call API to save changes
        // console.log('Updated user features:', result);
      }
    });
  }


}
