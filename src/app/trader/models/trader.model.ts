import { Name } from '../../shared/components/shared.types';

export class Trader {
  constructor(
    public id: string,
    // public name: Name,
    public firstName: string,
    public lastName: string,
    public balance: string,
    public email: string,
    public userName: string,
    private authToken: string,
    private phoneNumber: string,
    private authTokenExpirationDate: Date
  ) {}

  static fromJson(data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    userName: string;
    authToken: string;
    balance: string;
    authTokenExpirationDate: string;
  }) {
    return new Trader(
      data.id,
      data.firstName,
      data.balance,
      data.userName,
      data.lastName,
      data.email,
      data.phoneNumber,

      data.authToken,
      new Date(data.authTokenExpirationDate)
    );
  }

  get token() {
    if (
      !this.authTokenExpirationDate ||
      new Date() > this.authTokenExpirationDate
    ) {
      return null;
    }
    return this.authToken;
  }
}
