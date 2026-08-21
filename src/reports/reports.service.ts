import { Injectable } from '@nestjs/common';
import { Role } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { AttendanceService, AttendanceSummaryView } from '../attendance/attendance.service';
import { SummaryQueryDto } from '../attendance/dto/summary-query.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly attendanceService: AttendanceService) {}

  async getAttendanceSummary(
    query: SummaryQueryDto,
    requester: AuthenticatedUser,
  ): Promise<AttendanceSummaryView | AttendanceSummaryView[]> {
    if (requester.role === Role.EMPLOYEE) {
      return this.attendanceService.buildSummary(query.startDate, query.endDate, requester.id);
    }

    if (query.employeeId) {
      return this.attendanceService.buildSummary(query.startDate, query.endDate, query.employeeId);
    }

    return this.attendanceService.buildSummaryForAllEmployees(query.startDate, query.endDate);
  }
}
