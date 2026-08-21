import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { UserStatus } from '../common/enums/user-status.enum';

export interface CreateUserData {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  passwordHash: string;
  role: User['role'];
  status?: UserStatus;
  joiningDate: string;
}

export interface ListUsersOptions {
  page: number;
  limit: number;
  search?: string;
  status?: UserStatus;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

const SORTABLE_FIELDS = new Set([
  'firstName',
  'lastName',
  'email',
  'employeeCode',
  'joiningDate',
  'createdAt',
]);

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly userRepository: Repository<User>) {}

  findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  findByEmployeeCode(employeeCode: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { employeeCode } });
  }

  async create(data: CreateUserData): Promise<User> {
    const user = this.userRepository.create({
      ...data,
      status: data.status ?? UserStatus.ACTIVE,
    });
    return this.userRepository.save(user);
  }

  async save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  async list(options: ListUsersOptions): Promise<{ items: User[]; total: number }> {
    const { page, limit, search, status, sortBy, sortOrder } = options;

    const where: FindOptionsWhere<User>[] | FindOptionsWhere<User> = [];
    const baseWhere: FindOptionsWhere<User> = {};
    if (status) {
      baseWhere.status = status;
    }

    if (search) {
      const term = ILike(`%${search}%`);
      (where as FindOptionsWhere<User>[]).push(
        { ...baseWhere, firstName: term },
        { ...baseWhere, lastName: term },
        { ...baseWhere, email: term },
        { ...baseWhere, employeeCode: term },
      );
    }

    const orderField = sortBy && SORTABLE_FIELDS.has(sortBy) ? sortBy : 'createdAt';

    const [items, total] = await this.userRepository.findAndCount({
      where: search ? where : baseWhere,
      order: { [orderField]: sortOrder ?? 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total };
  }

  findAllEmployees(): Promise<User[]> {
    return this.userRepository.find({
      where: { role: Role.EMPLOYEE },
      order: { firstName: 'ASC' },
    });
  }
}
