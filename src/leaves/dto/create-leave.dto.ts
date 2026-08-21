import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { LeaveType } from '../../common/enums/leave-type.enum';

export class CreateLeaveDto {
  @ApiProperty({ enum: LeaveType, example: LeaveType.ANNUAL })
  @IsEnum(LeaveType)
  leaveType: LeaveType;

  @ApiProperty({ example: '2026-08-20' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-08-22' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 'Family vacation' })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason: string;
}
