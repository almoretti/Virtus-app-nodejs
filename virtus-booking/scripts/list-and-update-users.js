const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function manageUsers() {
  try {
    // List all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })
    
    console.log('\n📋 Current users in the system:')
    console.log('================================')
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - ${user.name || 'No name'} - Role: ${user.role}`)
    })
    
    if (users.length === 0) {
      console.log('No users found in the database.')
      return
    }
    
    // Update the first non-admin user to admin
    const nonAdminUser = users.find(u => u.role !== 'ADMIN')
    if (nonAdminUser) {
      console.log(`\n🔄 Updating ${nonAdminUser.email} to ADMIN role...`)
      
      const updated = await prisma.user.update({
        where: { id: nonAdminUser.id },
        data: { role: 'ADMIN' }
      })
      
      console.log(`✅ Successfully updated ${updated.email} to ADMIN role`)
    } else {
      console.log('\n✅ All users are already admins')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

manageUsers()