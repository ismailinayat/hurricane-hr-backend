import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserStatus } from '../../common/enums/user-status.enum';

export class UpdateEmployeeStatusDto {
  @ApiProperty({ enum: UserStatus, example: UserStatus.INACTIVE })
  @IsEnum(UserStatus)
  status: UserStatus;
}
