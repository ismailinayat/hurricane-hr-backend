import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { LeavesService } from '../leaves/leaves.service';
import { QueryLeavesDto } from '../leaves/dto/query-leaves.dto';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateEmployeeStatusDto } from './dto/update-employee-status.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';

@ApiTags('employees')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly leavesService: LeavesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new employee or admin account (admin only)' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List employees with pagination, search, filtering, and sorting (admin only)',
  })
  list(@Query() query: QueryEmployeesDto) {
    return this.employeesService.list(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get employee details including attendance and leave summaries (admin only)',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.getDetails(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update employee profile fields (admin only)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate an employee (admin only)' })
  updateStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEmployeeStatusDto) {
    return this.employeesService.updateStatus(id, dto.status);
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset an employee password to a new temporary password (admin only)' })
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.resetPassword(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Permanently delete an employee, including their attendance and leave records (admin only)',
  })
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.delete(id);
  }

  @Get(':employeeId/leaves')
  @ApiOperation({ summary: "List a specific employee's leave requests (admin only)" })
  leavesForEmployee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: QueryLeavesDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.leavesService.list({ ...query, employeeId }, admin);
  }
}
