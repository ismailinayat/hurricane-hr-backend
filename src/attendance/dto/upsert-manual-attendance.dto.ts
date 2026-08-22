import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class UpsertManualAttendanceDto {
  @ApiProperty({ description: 'The employee this attendance record belongs to.' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ example: '2026-08-15', description: 'The calendar day being recorded.' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '2026-08-15T09:00:00.000Z' })
  @IsDateString()
  clockIn: string;

  @ApiPropertyOptional({
    example: '2026-08-15T17:00:00.000Z',
    description: 'Omit or pass null to leave the employee clocked in (INCOMPLETE) for that day.',
  })
  @IsOptional()
  @IsDateString()
  clockOut?: string | null;
}
