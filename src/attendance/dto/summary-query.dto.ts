import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class SummaryQueryDto {
  @ApiProperty({ example: '2026-08-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-08-31' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Admin only — omit to get all employees, or scope to one' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
