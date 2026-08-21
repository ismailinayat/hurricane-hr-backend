import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AppException } from '../common/exceptions/app.exception';
import { ErrorCode } from '../common/enums/error-code.enum';
import { PaginatedResult } from '../common/dto/paginated-result.dto';
import { paginate } from '../common/utils/pagination.util';
import { generateTempPassword } from '../common/utils/password.util';
import { Role } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { AttendanceService } from '../attendance/attendance.service';
import { LeavesService } from '../leaves/leaves.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';

const BCRYPT_ROUNDS = 10;

export interface EmployeeDetails {
  employee: User;
  attendanceSummary: {
    totalRecords: number;
    daysPresent: number;
    daysAbsent: number;
    lastClockIn: Date | null;
  };
  leaveSummary: {
    totalRequests: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly usersService: UsersService,
    private readonly attendanceService: AttendanceService,
    private readonly leavesService: LeavesService,
  ) {}

  async create(dto: CreateEmployeeDto): Promise<{ employee: User; temporaryPassword?: string }> {
    const [existingEmail, existingCode] = await Promise.all([
      this.usersService.findByEmail(dto.email),
      this.usersService.findByEmployeeCode(dto.employeeCode),
    ]);

    if (existingEmail) {
      throw new AppException(
        'Email is already in use',
        ErrorCode.EMAIL_ALREADY_EXISTS,
        HttpStatus.CONFLICT,
      );
    }
    if (existingCode) {
      throw new AppException(
        'Employee code is already in use',
        ErrorCode.EMPLOYEE_CODE_ALREADY_EXISTS,
        HttpStatus.CONFLICT,
      );
    }

    const generatedPassword = dto.initialPassword ? undefined : generateTempPassword();
    const passwordHash = await bcrypt.hash(
      dto.initialPassword ?? generatedPassword!,
      BCRYPT_ROUNDS,
    );

    const employee = await this.usersService.create({
      employeeCode: dto.employeeCode,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone ?? null,
      passwordHash,
      role: Role.EMPLOYEE,
      status: UserStatus.ACTIVE,
      joiningDate: dto.joiningDate,
    });

    return { employee, temporaryPassword: generatedPassword };
  }

  async list(query: QueryEmployeesDto): Promise<PaginatedResult<User>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await this.usersService.list({
      page,
      limit,
      search: query.search,
      status: query.status,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
    return paginate(items, total, page, limit);
  }

  async findById(id: string): Promise<User> {
    const employee = await this.usersService.findById(id);
    if (!employee) {
      throw new AppException(
        'Employee not found',
        ErrorCode.EMPLOYEE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    return employee;
  }

  async getDetails(id: string): Promise<EmployeeDetails> {
    const employee = await this.findById(id);
    const [attendanceSummary, leaveSummary] = await Promise.all([
      this.attendanceService.getEmployeeAttendanceOverview(id),
      this.leavesService.getEmployeeLeaveOverview(id),
    ]);
    return { employee, attendanceSummary, leaveSummary };
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<User> {
    const employee = await this.findById(id);

    if (dto.email && dto.email !== employee.email) {
      const existing = await this.usersService.findByEmail(dto.email);
      if (existing) {
        throw new AppException(
          'Email is already in use',
          ErrorCode.EMAIL_ALREADY_EXISTS,
          HttpStatus.CONFLICT,
        );
      }
      employee.email = dto.email;
    }

    if (dto.firstName !== undefined) employee.firstName = dto.firstName;
    if (dto.lastName !== undefined) employee.lastName = dto.lastName;
    if (dto.phone !== undefined) employee.phone = dto.phone;
    if (dto.joiningDate !== undefined) employee.joiningDate = dto.joiningDate;

    return this.usersService.save(employee);
  }

  async updateStatus(id: string, status: UserStatus): Promise<User> {
    const employee = await this.findById(id);
    employee.status = status;
    return this.usersService.save(employee);
  }

  async resetPassword(id: string): Promise<{ temporaryPassword: string }> {
    const employee = await this.findById(id);
    const temporaryPassword = generateTempPassword();
    employee.passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);
    await this.usersService.save(employee);
    return { temporaryPassword };
  }

  async assertExists(id: string): Promise<void> {
    const employee = await this.usersService.findById(id);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
  }
}
