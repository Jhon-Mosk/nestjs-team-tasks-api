export class OrganizationResponseDto {
  id!: string;
  name!: string;
  ownerId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
