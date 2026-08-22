import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsStrongPassword } from '../../common/decorators/is-strong-password.decorator';
import { Role } from '../../common/enums/role.enum';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+15551234567' })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({
    example: 'EMP-004',
    description: 'If omitted, a code is generated automatically.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  employeeCode?: string;

  @ApiPropertyOptional({
    example: '2026-01-15',
    description: "If omitted, defaults to today's date.",
  })
  @IsOptional()
  @IsDateString()
  joiningDate?: string;

  @ApiPropertyOptional({
    enum: Role,
    default: Role.EMPLOYEE,
    description: 'Defaults to EMPLOYEE. Admins may create other ADMIN accounts here too.',
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({
    description:
      'Initial password. If omitted, a secure temporary password is generated and returned once.',
  })
  @IsOptional()
  @IsStrongPassword()
  initialPassword?: string;
}
