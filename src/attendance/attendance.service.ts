import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/enums/error-code.enum';
import { AttendanceStatus } from '../common/enums/attendance-status.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { PaginatedResult } from '../common/dto/paginated-result.dto';
import { paginate } from '../common/utils/pagination.util';
import { inclusiveDayCount, toDateOnlyString } from '../common/utils/date.util';
import { UsersService } from '../users/users.service';
import { Attendance } from './entities/attendance.entity';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { AttendanceHistoryQueryDto } from './dto/attendance-history-query.dto';
import { UpsertManualAttendanceDto } from './dto/upsert-manual-attendance.dto';

const POSTGRES_UNIQUE_VIOLATION = '23505';

export interface TodayStatusView {
  date: string;
  status: 'NOT_CLOCKED_IN' | 'CLOCKED_IN' | 'CLOCKED_OUT';
  clockIn: Date | null;
  clockOut: Date | null;
  totalWorkingSeconds: number;
}

export interface AttendanceRecordView {
  id: string;
  date: string;
  clockIn: Date | null;
  clockOut: Date | null;
  totalWorkingHours: number;
  status: AttendanceStatus;
}

export interface AdminAttendanceRecordView extends AttendanceRecordView {
  employee: { id: string; employeeCode: string; firstName: string; lastName: string };
}

export interface AttendanceSummaryView {
  employeeId?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  daysWorked: number;
  daysAbsent: number;
  totalWorkingSeconds: number;
  totalWorkingHours: number;
  averageWorkingHours: number;
  attendancePercentage: number;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance) private readonly attendanceRepository: Repository<Attendance>,
    private readonly usersService: UsersService,
  ) {}

  async clockIn(employeeId: string): Promise<Attendance> {
    const employee = await this.usersService.findById(employeeId);
    if (!employee || employee.status !== UserStatus.ACTIVE) {
      throw new AppException(
        'Employee account is not active',
        ErrorCode.ACCOUNT_INACTIVE,
        HttpStatus.FORBIDDEN,
      );
    }

    const today = toDateOnlyString(new Date());
    const existing = await this.attendanceRepository.findOne({
      where: { employeeId, attendanceDate: today },
    });
    if (existing) {
      throw new AppException(
        'You have already clocked in today',
        ErrorCode.ATTENDANCE_ALREADY_CLOCKED_IN,
        HttpStatus.CONFLICT,
      );
    }

    const record = this.attendanceRepository.create({
      employeeId,
      attendanceDate: today,
      clockIn: new Date(),
      status: AttendanceStatus.INCOMPLETE,
    });

    try {
      return await this.attendanceRepository.save(record);
    } catch (error) {
      // A concurrent request may have inserted the same (employeeId, attendanceDate)
      // row between the findOne check and this insert; the unique constraint is the
      // authoritative guard against duplicate clock-ins.
      if (this.isUniqueViolation(error)) {
        throw new AppException(
          'You have already clocked in today',
          ErrorCode.ATTENDANCE_ALREADY_CLOCKED_IN,
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }

  async clockOut(employeeId: string): Promise<Attendance> {
    const today = toDateOnlyString(new Date());
    const record = await this.attendanceRepository.findOne({
      where: { employeeId, attendanceDate: today },
    });

    if (!record || !record.clockIn) {
      throw new AppException(
        'You must clock in before clocking out',
        ErrorCode.ATTENDANCE_NOT_CLOCKED_IN,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (record.clockOut) {
      throw new AppException(
        'You have already clocked out today',
        ErrorCode.ATTENDANCE_ALREADY_CLOCKED_OUT,
        HttpStatus.CONFLICT,
      );
    }

    const clockOutTime = new Date();
    if (clockOutTime.getTime() <= record.clockIn.getTime()) {
      throw new AppException(
        'Clock-out time must be after clock-in time',
        ErrorCode.ATTENDANCE_NOT_CLOCKED_IN,
        HttpStatus.BAD_REQUEST,
      );
    }

    record.clockOut = clockOutTime;
    record.totalWorkingSeconds = Math.floor(
      (clockOutTime.getTime() - record.clockIn.getTime()) / 1000,
    );
    record.status = AttendanceStatus.PRESENT;

    return this.attendanceRepository.save(record);
  }

  /** Admin-only: creates or overwrites an employee's clock-in/out for a past date. */
  async upsertManual(dto: UpsertManualAttendanceDto): Promise<Attendance> {
    const employee = await this.usersService.findById(dto.employeeId);
    if (!employee) {
      throw new AppException(
        'Employee not found',
        ErrorCode.EMPLOYEE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    this.assertWithinManualEditWindow(dto.date);

    const clockIn = new Date(dto.clockIn);
    const clockOut = dto.clockOut ? new Date(dto.clockOut) : null;

    if (clockOut && clockOut.getTime() <= clockIn.getTime()) {
      throw new AppException(
        'Clock-out time must be after clock-in time',
        ErrorCode.ATTENDANCE_INVALID_TIME_RANGE,
        HttpStatus.BAD_REQUEST,
      );
    }

    const record =
      (await this.attendanceRepository.findOne({
        where: { employeeId: dto.employeeId, attendanceDate: dto.date },
      })) ??
      this.attendanceRepository.create({
        employeeId: dto.employeeId,
        attendanceDate: dto.date,
      });

    record.clockIn = clockIn;
    record.clockOut = clockOut;
    record.totalWorkingSeconds = clockOut
      ? Math.floor((clockOut.getTime() - clockIn.getTime()) / 1000)
      : 0;
    record.status = clockOut ? AttendanceStatus.PRESENT : AttendanceStatus.INCOMPLETE;

    return this.attendanceRepository.save(record);
  }

  private assertWithinManualEditWindow(date: string): void {
    const today = toDateOnlyString(new Date());

    if (date > today) {
      throw new AppException(
        `Attendance cannot be recorded for a future date (today is ${today})`,
        ErrorCode.ATTENDANCE_DATE_OUT_OF_RANGE,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getToday(employeeId: string): Promise<TodayStatusView> {
    const today = toDateOnlyString(new Date());
    const record = await this.attendanceRepository.findOne({
      where: { employeeId, attendanceDate: today },
    });

    if (!record) {
      return {
        date: today,
        status: 'NOT_CLOCKED_IN',
        clockIn: null,
        clockOut: null,
        totalWorkingSeconds: 0,
      };
    }

    return {
      date: today,
      status: record.clockOut ? 'CLOCKED_OUT' : 'CLOCKED_IN',
      clockIn: record.clockIn,
      clockOut: record.clockOut,
      totalWorkingSeconds: record.totalWorkingSeconds,
    };
  }

  async getHistory(
    employeeId: string,
    query: AttendanceHistoryQueryDto,
  ): Promise<PaginatedResult<AttendanceRecordView>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.attendanceRepository
      .createQueryBuilder('a')
      .where('a.employeeId = :employeeId', { employeeId });

    this.applyDateRange(qb, query.startDate, query.endDate);

    const [records, total] = await qb
      .orderBy('a.attendanceDate', query.sortOrder ?? 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return paginate(
      records.map((r) => this.toRecordView(r)),
      total,
      page,
      limit,
    );
  }

  async adminList(query: QueryAttendanceDto): Promise<PaginatedResult<AdminAttendanceRecordView>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.attendanceRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.employee', 'employee');

    if (query.employeeId) {
      qb.andWhere('a.employeeId = :employeeId', { employeeId: query.employeeId });
    }
    this.applyDateRange(qb, query.startDate, query.endDate);

    const [records, total] = await qb
      .orderBy('a.attendanceDate', query.sortOrder ?? 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return paginate(
      records.map((r) => this.toAdminRecordView(r)),
      total,
      page,
      limit,
    );
  }

  async buildSummary(
    startDate: string,
    endDate: string,
    employeeId: string,
  ): Promise<AttendanceSummaryView> {
    const aggregate = await this.attendanceRepository
      .createQueryBuilder('a')
      .select('COUNT(*)', 'daysWorked')
      .addSelect('COALESCE(SUM(a.totalWorkingSeconds), 0)', 'totalWorkingSeconds')
      .where('a.employeeId = :employeeId', { employeeId })
      .andWhere('a.attendanceDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne<{ daysWorked: string; totalWorkingSeconds: string }>();

    return this.toSummaryView(startDate, endDate, aggregate, employeeId);
  }

  async buildSummaryForAllEmployees(
    startDate: string,
    endDate: string,
  ): Promise<AttendanceSummaryView[]> {
    const rows = await this.attendanceRepository
      .createQueryBuilder('a')
      .select('a.employeeId', 'employeeId')
      .addSelect('COUNT(*)', 'daysWorked')
      .addSelect('COALESCE(SUM(a.totalWorkingSeconds), 0)', 'totalWorkingSeconds')
      .where('a.attendanceDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('a.employeeId')
      .getRawMany<{ employeeId: string; daysWorked: string; totalWorkingSeconds: string }>();

    const byEmployeeId = new Map(rows.map((row) => [row.employeeId, row]));
    const employees = await this.usersService.findAllEmployees();

    return employees.map((employee) =>
      this.toSummaryView(startDate, endDate, byEmployeeId.get(employee.id), employee.id),
    );
  }

  async getEmployeeAttendanceOverview(employeeId: string): Promise<{
    totalRecords: number;
    daysPresent: number;
    daysAbsent: number;
    lastClockIn: Date | null;
  }> {
    const raw = await this.attendanceRepository
      .createQueryBuilder('a')
      .select('COUNT(*)', 'totalRecords')
      .addSelect(`COUNT(*) FILTER (WHERE a.status = 'PRESENT')`, 'daysPresent')
      .addSelect(`COUNT(*) FILTER (WHERE a.status = 'ABSENT')`, 'daysAbsent')
      .addSelect('MAX(a.clockIn)', 'lastClockIn')
      .where('a.employeeId = :employeeId', { employeeId })
      .getRawOne<{
        totalRecords: string;
        daysPresent: string;
        daysAbsent: string;
        lastClockIn: Date | null;
      }>();

    return {
      totalRecords: parseInt(raw?.totalRecords ?? '0', 10),
      daysPresent: parseInt(raw?.daysPresent ?? '0', 10),
      daysAbsent: parseInt(raw?.daysAbsent ?? '0', 10),
      lastClockIn: raw?.lastClockIn ?? null,
    };
  }

  private toSummaryView(
    startDate: string,
    endDate: string,
    aggregate: { daysWorked: string; totalWorkingSeconds: string } | undefined,
    employeeId: string,
  ): AttendanceSummaryView {
    const totalDays = inclusiveDayCount(startDate, endDate);
    const elapsedDays = Math.min(
      totalDays,
      inclusiveDayCount(startDate, toDateOnlyString(new Date())),
    );
    const daysWorked = parseInt(aggregate?.daysWorked ?? '0', 10);
    const totalWorkingSeconds = parseInt(aggregate?.totalWorkingSeconds ?? '0', 10);
    const daysAbsent = Math.max(0, elapsedDays - daysWorked);
    const totalWorkingHours = this.round(totalWorkingSeconds / 3600);

    return {
      employeeId,
      startDate,
      endDate,
      totalDays,
      daysWorked,
      daysAbsent,
      totalWorkingSeconds,
      totalWorkingHours,
      averageWorkingHours: this.round(totalWorkingHours / Math.max(daysWorked, 1)),
      attendancePercentage: this.round((daysWorked / Math.max(elapsedDays, 1)) * 100),
    };
  }

  private applyDateRange(
    qb: SelectQueryBuilder<Attendance>,
    startDate?: string,
    endDate?: string,
  ): void {
    if (startDate && endDate) {
      qb.andWhere('a.attendanceDate BETWEEN :startDate AND :endDate', { startDate, endDate });
    } else if (startDate) {
      qb.andWhere('a.attendanceDate >= :startDate', { startDate });
    } else if (endDate) {
      qb.andWhere('a.attendanceDate <= :endDate', { endDate });
    }
  }

  private toRecordView(record: Attendance): AttendanceRecordView {
    return {
      id: record.id,
      date: record.attendanceDate,
      clockIn: record.clockIn,
      clockOut: record.clockOut,
      totalWorkingHours: this.round(record.totalWorkingSeconds / 3600),
      status: record.status,
    };
  }

  private toAdminRecordView(record: Attendance): AdminAttendanceRecordView {
    return {
      ...this.toRecordView(record),
      employee: {
        id: record.employee.id,
        employeeCode: record.employee.employeeCode,
        firstName: record.employee.firstName,
        lastName: record.employee.lastName,
      },
    };
  }

  private round(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === POSTGRES_UNIQUE_VIOLATION
    );
  }
}
