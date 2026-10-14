import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function seedSriAdmin() {
  const email = 'sri654774@gmail.com';
  const password = 'Hello1029';
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
      emailVerified: true,
      isActive: true,
      failedLogins: 0,
      lockedUntil: null,
      totpEnabled: false, // Uses Email OTP!
    },
    create: {
      name: 'Sri Admin',
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      emailVerified: true,
      isActive: true,
      preferences: {
        create: { personalization: true, emailNotifs: true },
      },
    },
  });

  console.log(`✅ Admin user seeded successfully:`, {
    id: user.id,
    email: user.email,
    role: user.role,
    password: 'Hello1029',
  });
}

seedSriAdmin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
