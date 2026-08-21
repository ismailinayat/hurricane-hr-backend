import { Exclude } from 'class-transformer';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';
import { Attendance } from '../../attendance/entities/attendance.entity';
import { Leave } from '../../leaves/entities/leave.entity';

/**
 * Represents both the login account and the employee profile: the system
 * has no separate "employee" table, the /employees API is an admin-facing
 * view over this same entity.
 */
@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ unique: true })
  employeeCode: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Index({ unique: true })
  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Exclude({ toPlainOnly: true })
  @Column({ select: true })
  passwordHash: string;

  @Column({ type: 'enum', enum: Role, default: Role.EMPLOYEE })
  role: Role;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'date' })
  joiningDate: string;

  @OneToMany(() => Attendance, (attendance) => attendance.employee)
  attendanceRecords: Attendance[];

  @OneToMany(() => Leave, (leave) => leave.employee)
  leaveRequests: Leave[];

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
