import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RejectLeaveDto {
  @ApiProperty({ example: 'Project deadline requires employee availability.' })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  rejectionReason: string;
}
