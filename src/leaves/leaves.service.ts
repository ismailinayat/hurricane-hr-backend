import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/enums/error-code.enum';
import { LeaveStatus } from '../common/enums/leave-status.enum';
import { Role } from '../common/enums/role.enum';
import { PaginatedResult } from '../common/dto/paginated-result.dto';
import { paginate } from '../common/utils/pagination.util';
import { dateRangesOverlap, isDateRangeValid } from '../common/utils/date.util';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { Leave } from './entities/leave.entity';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { QueryLeavesDto } from './dto/query-leaves.dto';

@Injectable()
export class LeavesService {
  constructor(@InjectRepository(Leave) private readonly leaveRepository: Repository<Leave>) {}

  async create(employeeId: string, dto: CreateLeaveDto): Promise<Leave> {
    if (!isDateRangeValid(dto.startDate, dto.endDate)) {
      throw new AppException(
        'Start date cannot be after end date',
        ErrorCode.LEAVE_INVALID_DATE_RANGE,
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.assertNoOverlap(employeeId, dto.startDate, dto.endDate);

    const leave = this.leaveRepository.create({
      employeeId,
      leaveType: dto.leaveType,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason ?? null,
      status: LeaveStatus.PENDING,
    });
    return this.leaveRepository.save(leave);
  }

  async list(query: QueryLeavesDto, requester: AuthenticatedUser): Promise<PaginatedResult<Leave>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.leaveRepository
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.employee', 'employee')
      .leftJoinAndSelect('l.reviewer', 'reviewer');

    const effectiveEmployeeId = requester.role === Role.EMPLOYEE ? requester.id : query.employeeId;
    if (effectiveEmployeeId) {
      qb.andWhere('l.employeeId = :employeeId', { employeeId: effectiveEmployeeId });
    }
    if (query.status) {
      qb.andWhere('l.status = :status', { status: query.status });
    }
    if (query.startDate) {
      qb.andWhere('l.endDate >= :startDate', { startDate: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('l.startDate <= :endDate', { endDate: query.endDate });
    }

    const [items, total] = await qb
      .orderBy('l.createdAt', query.sortOrder ?? 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return paginate(items, total, page, limit);
  }

  async findOne(id: string, requester: AuthenticatedUser): Promise<Leave> {
    const leave = await this.leaveRepository.findOne({
      where: { id },
      relations: ['employee', 'reviewer'],
    });

    if (!leave || (requester.role === Role.EMPLOYEE && leave.employeeId !== requester.id)) {
      throw new AppException(
        'Leave request not found',
        ErrorCode.LEAVE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    return leave;
  }

  async approve(id: string, adminId: string): Promise<Leave> {
    const leave = await this.getPendingOrThrow(id);

    const conflict = await this.leaveRepository.findOne({
      where: {
        employeeId: leave.employeeId,
        status: LeaveStatus.APPROVED,
        id: Not(id),
      },
    });
    if (
      conflict &&
      dateRangesOverlap(leave.startDate, leave.endDate, conflict.startDate, conflict.endDate)
    ) {
      throw new AppException(
        'This leave overlaps with an already approved leave for this employee',
        ErrorCode.LEAVE_OVERLAP,
        HttpStatus.CONFLICT,
      );
    }

    leave.status = LeaveStatus.APPROVED;
    leave.reviewedBy = adminId;
    leave.reviewedAt = new Date();
    return this.leaveRepository.save(leave);
  }

  async reject(id: string, adminId: string, rejectionReason?: string): Promise<Leave> {
    const leave = await this.getPendingOrThrow(id);

    leave.status = LeaveStatus.REJECTED;
    leave.rejectionReason = rejectionReason ?? null;
    leave.reviewedBy = adminId;
    leave.reviewedAt = new Date();
    return this.leaveRepository.save(leave);
  }

  async getEmployeeLeaveOverview(employeeId: string): Promise<{
    totalRequests: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const raw = await this.leaveRepository
      .createQueryBuilder('l')
      .select('COUNT(*)', 'totalRequests')
      .addSelect(`COUNT(*) FILTER (WHERE l.status = 'PENDING')`, 'pending')
      .addSelect(`COUNT(*) FILTER (WHERE l.status = 'APPROVED')`, 'approved')
      .addSelect(`COUNT(*) FILTER (WHERE l.status = 'REJECTED')`, 'rejected')
      .where('l.employeeId = :employeeId', { employeeId })
      .getRawOne<{ totalRequests: string; pending: string; approved: string; rejected: string }>();

    return {
      totalRequests: parseInt(raw?.totalRequests ?? '0', 10),
      pending: parseInt(raw?.pending ?? '0', 10),
      approved: parseInt(raw?.approved ?? '0', 10),
      rejected: parseInt(raw?.rejected ?? '0', 10),
    };
  }

  private async getPendingOrThrow(id: string): Promise<Leave> {
    const leave = await this.leaveRepository.findOne({ where: { id } });
    if (!leave) {
      throw new AppException(
        'Leave request not found',
        ErrorCode.LEAVE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    if (leave.status !== LeaveStatus.PENDING) {
      throw new AppException(
        'Only pending leave requests can be approved or rejected',
        ErrorCode.LEAVE_ALREADY_PROCESSED,
        HttpStatus.CONFLICT,
      );
    }
    return leave;
  }

  private async assertNoOverlap(
    employeeId: string,
    startDate: string,
    endDate: string,
  ): Promise<void> {
    const candidates = await this.leaveRepository.find({
      where: [
        { employeeId, status: LeaveStatus.PENDING },
        { employeeId, status: LeaveStatus.APPROVED },
      ],
    });

    const overlapping = candidates.some((candidate) =>
      dateRangesOverlap(startDate, endDate, candidate.startDate, candidate.endDate),
    );

    if (overlapping) {
      throw new AppException(
        'This leave request overlaps with an existing pending or approved leave request',
        ErrorCode.LEAVE_OVERLAP,
        HttpStatus.CONFLICT,
      );
    }
  }
}
