const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // Create test users and technicians
  const tech1User = await prisma.user.upsert({
    where: { email: 'tech1@virtus.com' },
    update: {},
    create: {
      email: 'tech1@virtus.com',
      name: 'John Smith',
      role: 'TECHNICIAN',
    },
  })

  const tech2User = await prisma.user.upsert({
    where: { email: 'tech2@virtus.com' },
    update: {},
    create: {
      email: 'tech2@virtus.com',
      name: 'Sarah Johnson',
      role: 'TECHNICIAN',
    },
  })

  const tech3User = await prisma.user.upsert({
    where: { email: 'tech3@virtus.com' },
    update: {},
    create: {
      email: 'tech3@virtus.com',
      name: 'Mike Williams',
      role: 'TECHNICIAN',
    },
  })

  // Create technician profiles
  await prisma.technician.upsert({
    where: { userId: tech1User.id },
    update: {},
    create: {
      userId: tech1User.id,
      color: '#3B82F6', // Blue
    },
  })

  await prisma.technician.upsert({
    where: { userId: tech2User.id },
    update: {},
    create: {
      userId: tech2User.id,
      color: '#10B981', // Green
    },
  })

  await prisma.technician.upsert({
    where: { userId: tech3User.id },
    update: {},
    create: {
      userId: tech3User.id,
      color: '#F59E0B', // Amber
    },
  })

  // Create installation types
  await prisma.installationType.upsert({
    where: { name: 'standard' },
    update: {},
    create: {
      name: 'standard',
      description: 'Standard water filter installation',
      duration: 120,
    },
  })

  await prisma.installationType.upsert({
    where: { name: 'replacement' },
    update: {},
    create: {
      name: 'replacement',
      description: 'Filter replacement service',
      duration: 60,
    },
  })

  await prisma.installationType.upsert({
    where: { name: 'maintenance' },
    update: {},
    create: {
      name: 'maintenance',
      description: 'Regular maintenance check',
      duration: 90,
    },
  })

  // Create a customer service user
  await prisma.user.upsert({
    where: { email: 'cs@virtus.com' },
    update: {},
    create: {
      email: 'cs@virtus.com',
      name: 'Customer Service',
      role: 'CUSTOMER_SERVICE',
    },
  })

  // Create an admin user
  await prisma.user.upsert({
    where: { email: 'admin@virtus.com' },
    update: {},
    create: {
      email: 'admin@virtus.com',
      name: 'Admin User',
      role: 'ADMIN',
    },
  })

  console.log('Seed data created successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })