import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsStrongPassword } from '../../common/decorators/is-strong-password.decorator';

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

  @ApiProperty({ example: 'EMP-004' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  employeeCode: string;

  @ApiProperty({ example: '2026-01-15' })
  @IsDateString()
  joiningDate: string;

  @ApiPropertyOptional({
    description:
      'Initial password. If omitted, a secure temporary password is generated and returned once.',
  })
  @IsOptional()
  @IsStrongPassword()
  initialPassword?: string;
}
