export class CreateEmployeeDto {
  /** ADMIN | CLERK | CASHIER (may login) o BARISTA | KITCHEN (walang login) */
  job!: string;
  /** Para sa may login lang */
  username?: string;
  /** Pansamantalang password; papalitan sa unang login */
  password?: string;
  /** Para sa cashier, barista at kitchen; Kitchen sa Alley lang */
  storeId?: number | null;
  /** AM | PM */
  shift?: string | null;
  firstName!: string;
  middleName?: string;
  lastName!: string;
  contactNo?: string;
  email?: string;
}

export class UpdateEmployeeDto {
  job?: string;
  /** Kailangan lang kapag ginawang may login ang dating walang login */
  username?: string;
  password?: string;
  storeId?: number | null;
  shift?: string | null;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  contactNo?: string | null;
  email?: string | null;
  isActive?: boolean;
}

export class ResetPasswordDto {
  password!: string;
}

export class BulkStatusDto {
  ids!: number[];
  isActive!: boolean;
}
