const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listTechnicians() {
  try {
    console.log('Fetching all technicians from database...\n');
    
    const technicians = await prisma.technician.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (technicians.length === 0) {
      console.log('No technicians found in the database.');
      return;
    }

    console.log(`Found ${technicians.length} technician(s):\n`);
    console.log('='.repeat(80));
    
    technicians.forEach((tech, index) => {
      console.log(`Technician #${index + 1}`);
      console.log('-'.repeat(40));
      console.log(`ID:         ${tech.id}`);
      console.log(`User ID:    ${tech.userId}`);
      console.log(`Name:       ${tech.user.name || 'N/A'}`);
      console.log(`Email:      ${tech.user.email}`);
      console.log(`Role:       ${tech.user.role}`);
      console.log(`Color:      ${tech.color}`);
      console.log(`Created:    ${tech.createdAt.toLocaleString()}`);
      console.log(`Updated:    ${tech.updatedAt.toLocaleString()}`);
      console.log('='.repeat(80));
    });

  } catch (error) {
    console.error('Error fetching technicians:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listTechnicians();