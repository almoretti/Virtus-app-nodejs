const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateUser() {
  try {
    const updated = await prisma.user.update({
      where: { email: 'alessandro@moretti.cc' },
      data: { role: 'ADMIN' }
    })
    
    console.log(`✅ Successfully updated ${updated.email} to ADMIN role`)
    console.log(`   Name: ${updated.name}`)
    console.log(`   Role: ${updated.role}`)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateUser()