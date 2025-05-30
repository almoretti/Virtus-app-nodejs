const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addAdmin() {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'alessandro@moretti.cc' }
    });

    if (existingUser) {
      // Update existing user to admin
      const updatedUser = await prisma.user.update({
        where: { email: 'alessandro@moretti.cc' },
        data: { role: 'ADMIN' }
      });
      console.log('✅ User updated to ADMIN:', updatedUser.email);
    } else {
      // Create new admin user
      const newUser = await prisma.user.create({
        data: {
          email: 'alessandro@moretti.cc',
          name: 'Alessandro Moretti',
          role: 'ADMIN'
        }
      });
      console.log('✅ New ADMIN user created:', newUser.email);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addAdmin();