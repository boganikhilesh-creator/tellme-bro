import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  {
    name: 'Education',
    slug: 'education',
    description: 'Academic insights, career guidance, tutorials, and educational reels',
    displayOrder: 1,
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    description: 'Trending styles, apparel, cosmetics, local boutiques, and lifestyle',
    displayOrder: 2,
  },
  {
    name: 'Medical',
    slug: 'medical',
    description: 'Health awareness, local healthcare, doctor advice, and wellness tips',
    displayOrder: 3,
  },
  {
    name: 'Business',
    slug: 'business',
    description: 'Local businesses, startups, entrepreneurship, and marketplace news',
    displayOrder: 4,
  },
  {
    name: 'Others',
    slug: 'others',
    description: 'Community events, general interest, announcements, and miscellaneous',
    displayOrder: 5,
  },
];

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Categories
  console.log('Creating default categories...');
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        description: cat.description,
        displayOrder: cat.displayOrder,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        displayOrder: cat.displayOrder,
        isActive: true,
      },
    });
  }
  console.log('✅ Categories seeded.');

  // 2. Hash default dev passwords with Argon2id
  const devPasswordHash = await argon2.hash('TellmeBro@2026!', {
    type: argon2.argon2id,
  });

  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@gmail.com').toLowerCase().trim();

  // 3. Seed Super Admin (bootstrapped from SUPER_ADMIN_EMAIL)
  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      role: 'SUPER_ADMIN',
      emailVerified: true,
      isActive: true,
    },
    create: {
      name: 'Super Administrator',
      email: superAdminEmail,
      passwordHash: devPasswordHash,
      role: 'SUPER_ADMIN',
      emailVerified: true,
      isActive: true,
      preferences: {
        create: { personalization: true, emailNotifs: true },
      },
    },
  });
  console.log(`✅ Super Admin ready: ${superAdmin.email}`);

  // 3b. Seed Requested Super Admin: boganikhilesh@gmail.com / Hello1029
  const adminPasswordHash = await argon2.hash('Hello1029', { type: argon2.argon2id });
  const adminUser = await prisma.user.upsert({
    where: { email: 'boganikhilesh@gmail.com' },
    update: {
      role: 'SUPER_ADMIN',
      passwordHash: adminPasswordHash,
      emailVerified: true,
      isActive: true,
      totpEnabled: false,
      failedLogins: 0,
      lockedUntil: null,
    },
    create: {
      name: 'Nikhilesh Admin',
      email: 'boganikhilesh@gmail.com',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      emailVerified: true,
      isActive: true,
      preferences: {
        create: { personalization: true, emailNotifs: true },
      },
    },
  });
  console.log(`✅ Admin ready: ${adminUser.email} (PW: Hello1029)`);

  // 4. Seed Development Admin
  const devAdmin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: { role: 'ADMIN', emailVerified: true },
    create: {
      name: 'Platform Admin',
      email: 'admin@gmail.com',
      passwordHash: devPasswordHash,
      role: 'ADMIN',
      emailVerified: true,
      isActive: true,
      preferences: {
        create: { personalization: true, emailNotifs: true },
      },
    },
  });
  console.log(`✅ Dev Admin ready: ${devAdmin.email}`);

  // 5. Seed Development Editor
  const devEditor = await prisma.user.upsert({
    where: { email: 'editor@gmail.com' },
    update: { role: 'EDITOR', emailVerified: true },
    create: {
      name: 'Content Editor',
      email: 'editor@gmail.com',
      passwordHash: devPasswordHash,
      role: 'EDITOR',
      emailVerified: true,
      isActive: true,
      preferences: {
        create: { personalization: true, emailNotifs: true },
      },
    },
  });
  console.log(`✅ Dev Editor ready: ${devEditor.email}`);

  // 6. Seed Development Standard User
  const devUser = await prisma.user.upsert({
    where: { email: 'user@gmail.com' },
    update: { role: 'USER', emailVerified: true },
    create: {
      name: 'Community User',
      email: 'user@gmail.com',
      passwordHash: devPasswordHash,
      role: 'USER',
      emailVerified: true,
      isActive: true,
      preferences: {
        create: { personalization: true, emailNotifs: true },
      },
    },
  });
  console.log(`✅ Dev User ready: ${devUser.email}`);

  // 7. Seed initial Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: superAdmin.id,
      action: 'SYSTEM_BOOTSTRAPPED',
      details: JSON.stringify({
        seededCategories: DEFAULT_CATEGORIES.length,
        superAdminEmail,
      }),
    },
  });

  console.log('\n🎉 Seed completed successfully!');
  console.log('────────────────────────────────────────');
  console.log('Dev Accounts (Password: TellmeBro@2026!):');
  console.log('1. Super Admin: superadmin@gmail.com');
  console.log('2. Admin:       admin@gmail.com');
  console.log('3. Editor:      editor@gmail.com');
  console.log('4. User:        user@gmail.com');
  console.log('────────────────────────────────────────\n');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
