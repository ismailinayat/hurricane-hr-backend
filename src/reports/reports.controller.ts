import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { SummaryQueryDto } from '../attendance/dto/summary-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('attendance-summary')
  @ApiOperation({
    summary:
      'Attendance statistics for a date range. Employees are scoped to themselves; ' +
      'admins may target one employee or omit employeeId for a summary of every employee.',
  })
  attendanceSummary(@Query() query: SummaryQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.getAttendanceSummary(query, user);
  }
}
