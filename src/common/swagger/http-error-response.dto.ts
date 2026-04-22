import { ApiProperty } from '@nestjs/swagger';

export class HttpErrorResponseDto {
  @ApiProperty({ example: 401 })
  statusCode!: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Unauthorized',
  })
  message!: string | string[];

  @ApiProperty({ example: 'Unauthorized' })
  error!: string;

  @ApiProperty({ example: '2026-04-22T12:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/projects' })
  path!: string;
}
