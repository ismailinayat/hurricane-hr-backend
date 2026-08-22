import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { LeaveStatus } from '../../common/enums/leave-status.enum';
import { LeaveType } from '../../common/enums/leave-type.enum';
import { User } from '../../users/entities/user.entity';

@Entity('leaves')
export class Leave extends BaseEntity {
  @Index()
  @Column({ type: 'uuid' })
  employeeId: string;

  @ManyToOne(() => User, (user) => user.leaveRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' })
  employee: User;

  @Column({ type: 'enum', enum: LeaveType })
  leaveType: LeaveType;

  @Index()
  @Column({ type: 'date' })
  startDate: string;

  @Index()
  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Index()
  @Column({ type: 'enum', enum: LeaveStatus, default: LeaveStatus.PENDING })
  status: LeaveStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer: User | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;
}
