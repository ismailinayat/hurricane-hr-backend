import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { AttendanceService } from './attendance.service';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { AttendanceHistoryQueryDto } from './dto/attendance-history-query.dto';
import { SummaryQueryDto } from './dto/summary-query.dto';
import { UpsertManualAttendanceDto } from './dto/upsert-manual-attendance.dto';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Roles(Role.EMPLOYEE)
  @Post('clock-in')
  @ApiOperation({ summary: 'Clock in for today (employee only, self)' })
  clockIn(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.clockIn(user.id);
  }

  @Roles(Role.EMPLOYEE)
  @Post('clock-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clock out for today (employee only, self)' })
  clockOut(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.clockOut(user.id);
  }

  @Roles(Role.EMPLOYEE)
  @Get('today')
  @ApiOperation({ summary: "Get today's clock-in/out status (employee only, self)" })
  today(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.getToday(user.id);
  }

  @Roles(Role.EMPLOYEE)
  @Get('status')
  @ApiOperation({ summary: 'Alias of /attendance/today (employee only, self)' })
  status(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.getToday(user.id);
  }

  @Roles(Role.EMPLOYEE)
  @Get('history')
  @ApiOperation({ summary: "Get the authenticated employee's attendance history (self only)" })
  history(@CurrentUser() user: AuthenticatedUser, @Query() query: AttendanceHistoryQueryDto) {
    return this.attendanceService.getHistory(user.id, query);
  }

  @Roles(Role.EMPLOYEE)
  @Get('summary')
  @ApiOperation({ summary: "Get the authenticated employee's working-hours summary (self only)" })
  summary(@CurrentUser() user: AuthenticatedUser, @Query() query: SummaryQueryDto) {
    return this.attendanceService.buildSummary(query.startDate, query.endDate, user.id);
  }

  @Roles(Role.ADMIN)
  @Get('reports')
  @ApiOperation({
    summary: 'Attendance report across employees, filterable by employee/date range (admin only)',
  })
  reports(@Query() query: QueryAttendanceDto) {
    return this.attendanceService.adminList(query);
  }

  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: 'List attendance records across all employees (admin only)' })
  list(@Query() query: QueryAttendanceDto) {
    return this.attendanceService.adminList(query);
  }

  @Roles(Role.ADMIN)
  @Get(':employeeId')
  @ApiOperation({ summary: "List a specific employee's attendance records (admin only)" })
  forEmployee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: QueryAttendanceDto,
  ) {
    return this.attendanceService.adminList({ ...query, employeeId });
  }

  @Roles(Role.ADMIN)
  @Put('manual')
  @ApiOperation({
    summary:
      "Manually create or overwrite an employee's clock-in/out for any past or current date (admin only)",
  })
  upsertManual(@Body() dto: UpsertManualAttendanceDto) {
    return this.attendanceService.upsertManual(dto);
  }
}
