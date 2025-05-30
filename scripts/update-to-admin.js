const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateToAdmin() {
  try {
    // Update alessandro@moretti.cc to ADMIN
    const user = await prisma.user.update({
      where: { email: 'alessandro@moretti.cc' },
      data: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    console.log('✅ User updated to ADMIN:');
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('   Role:', user.role);
    console.log('   ID:', user.id);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateToAdmin();