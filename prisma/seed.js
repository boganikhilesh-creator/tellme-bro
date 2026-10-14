if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function hashPassword(password) {
  // Uses Node's built-in crypto.scryptSync - zero C++ binary/glibc dependencies!
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `$scrypt$${salt}$${derivedKey.toString('hex')}`;
}

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

  const devPasswordHash = hashPassword('TellmeBro@2026!');
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'swanikhyd@gmail.com').toLowerCase().trim();

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

  // Official Super Admin: swanikhyd@gmail.com / Swanik@654774
  const adminPasswordHash = hashPassword('Swanik@654774');
  const adminUser = await prisma.user.upsert({
    where: { email: 'swanikhyd@gmail.com' },
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
      name: 'Swanik Super Admin',
      email: 'swanikhyd@gmail.com',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN',
      emailVerified: true,
      isActive: true,
      preferences: {
        create: { personalization: true, emailNotifs: true },
      },
    },
  });
  console.log(`✅ Admin ready: ${adminUser.email} (PW: Swanik@654774)`);

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
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
