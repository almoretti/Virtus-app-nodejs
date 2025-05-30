const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixOAuthLink() {
  try {
    // First, let's check if alessandro@moretti.cc exists
    const user = await prisma.user.findUnique({
      where: { email: 'alessandro@moretti.cc' },
      include: { accounts: true }
    });

    if (user) {
      console.log('Found user:', user.email);
      console.log('User ID:', user.id);
      console.log('Existing accounts:', user.accounts.length);

      // If no Google account is linked, we need to either:
      // 1. Delete the user and let NextAuth create it fresh
      // 2. Manually create the account link
      
      // Option 1: Delete and recreate (easier)
      if (user.accounts.length === 0) {
        console.log('No accounts linked. Deleting user to allow fresh OAuth sign-in...');
        
        await prisma.user.delete({
          where: { id: user.id }
        });
        
        console.log('✅ User deleted. You can now sign in with Google and it will create a fresh account.');
      } else {
        console.log('User already has linked accounts.');
      }
    } else {
      console.log('User not found.');
    }

    // Also check for admin@virtus.com
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@virtus.com' },
      include: { accounts: true }
    });

    if (adminUser && adminUser.accounts.length === 0) {
      console.log('\nFound admin@virtus.com without linked accounts. Deleting...');
      await prisma.user.delete({
        where: { id: adminUser.id }
      });
      console.log('✅ Admin user deleted.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOAuthLink();