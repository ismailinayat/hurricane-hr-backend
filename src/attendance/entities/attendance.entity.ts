import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum';
import { User } from '../../users/entities/user.entity';

@Entity('attendance')
@Unique('UQ_attendance_employee_date', ['employeeId', 'attendanceDate'])
export class Attendance extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => User, (user) => user.attendanceRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: User;

  @Index()
  @Column({ type: 'date' })
  attendanceDate: string;

  @Column({ type: 'timestamptz', nullable: true })
  clockIn: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  clockOut: Date | null;

  @Column({ type: 'int', default: 0 })
  totalWorkingSeconds: number;

  @Column({ type: 'enum', enum: AttendanceStatus, default: AttendanceStatus.INCOMPLETE })
  status: AttendanceStatus;
}
