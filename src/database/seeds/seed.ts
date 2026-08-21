import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../data-source';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';

/**
 * Development-only seed data. These credentials are for local/dev use and
 * must never be reused in a staging or production environment.
 */
const SEED_PASSWORD_ROUNDS = 10;

const ADMIN_SEED = {
  employeeCode: 'ADM-001',
  firstName: 'System',
  lastName: 'Admin',
  email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
  phone: '+10000000000',
  password: process.env.SEED_ADMIN_PASSWORD || 'Admin@123',
  role: Role.ADMIN,
  status: UserStatus.ACTIVE,
  joiningDate: '2024-01-01',
};

const EMPLOYEE_SEEDS = [
  {
    employeeCode: 'EMP-001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+10000000001',
    password: 'Employee@123',
    joiningDate: '2024-02-15',
  },
  {
    employeeCode: 'EMP-002',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+10000000002',
    password: 'Employee@123',
    joiningDate: '2024-03-01',
  },
  {
    employeeCode: 'EMP-003',
    firstName: 'Alex',
    lastName: 'Johnson',
    email: 'alex.johnson@example.com',
    phone: '+10000000003',
    password: 'Employee@123',
    joiningDate: '2024-05-10',
  },
];

async function seed(): Promise<void> {
  await AppDataSource.initialize();
  const userRepository = AppDataSource.getRepository(User);

  const existingAdmin = await userRepository.findOne({ where: { email: ADMIN_SEED.email } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(ADMIN_SEED.password, SEED_PASSWORD_ROUNDS);
    await userRepository.save(
      userRepository.create({
        employeeCode: ADMIN_SEED.employeeCode,
        firstName: ADMIN_SEED.firstName,
        lastName: ADMIN_SEED.lastName,
        email: ADMIN_SEED.email,
        phone: ADMIN_SEED.phone,
        passwordHash,
        role: ADMIN_SEED.role,
        status: ADMIN_SEED.status,
        joiningDate: ADMIN_SEED.joiningDate,
      }),
    );
    console.log(
      `[seed] Created admin user: ${ADMIN_SEED.email} (dev-only password: ${ADMIN_SEED.password})`,
    );
  } else {
    console.log(`[seed] Admin user already exists: ${ADMIN_SEED.email}`);
  }

  for (const employee of EMPLOYEE_SEEDS) {
    const existing = await userRepository.findOne({ where: { email: employee.email } });
    if (existing) {
      console.log(`[seed] Employee already exists: ${employee.email}`);
      continue;
    }
    const passwordHash = await bcrypt.hash(employee.password, SEED_PASSWORD_ROUNDS);
    await userRepository.save(
      userRepository.create({
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        passwordHash,
        role: Role.EMPLOYEE,
        status: UserStatus.ACTIVE,
        joiningDate: employee.joiningDate,
      }),
    );
    console.log(
      `[seed] Created employee: ${employee.email} (dev-only password: ${employee.password})`,
    );
  }

  await AppDataSource.destroy();
  console.log('[seed] Done.');
}

seed().catch((error) => {
  console.error('[seed] Failed:', error);
  process.exit(1);
});
