import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UserStatus } from '../../common/enums/user-status.enum';

export class QueryEmployeesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Matches against name, email, or employee code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
