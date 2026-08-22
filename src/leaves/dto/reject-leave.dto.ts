import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RejectLeaveDto {
  @ApiPropertyOptional({ example: 'Project deadline requires employee availability.' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  rejectionReason?: string;
}
