import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';

  @ApiProperty({
    example: '2026-04-22T12:00:00.000Z',
    description: 'ISO timestamp',
  })
  timestamp!: string;
}
