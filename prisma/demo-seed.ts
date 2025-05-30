import { PrismaClient, Role, TimeSlot, BookingStatus } from '@prisma/client'

const prisma = new PrismaClient()

const customerNames = [
  'Mario Rossi', 'Giulia Bianchi', 'Luca Ferrari', 'Anna Russo', 'Marco Esposito',
  'Elena Romano', 'Francesco Ricci', 'Chiara Marino', 'Alessandro Costa', 'Sofia Greco',
  'Davide Bruno', 'Federica Gallo', 'Matteo Conti', 'Valentina De Luca', 'Simone Mancini',
  'Giorgia Santoro', 'Andrea Pellegrini', 'Martina Barbieri', 'Lorenzo Fontana', 'Camilla Serra',
  'Riccardo Lombardi', 'Beatrice Caruso', 'Fabio Testa', 'Ilaria Moretti', 'Stefano Villa'
]

const addresses = [
  'Via Roma 123, Milano', 'Corso Italia 45, Torino', 'Via Nazionale 67, Roma',
  'Via Garibaldi 89, Napoli', 'Corso Venezia 12, Milano', 'Via del Corso 34, Roma',
  'Via Dante 56, Firenze', 'Corso Francia 78, Torino', 'Via Veneto 90, Roma',
  'Via Manzoni 23, Milano', 'Corso Buenos Aires 45, Milano', 'Via del Tritone 67, Roma',
  'Via Tornabuoni 89, Firenze', 'Via Chiaia 12, Napoli', 'Corso Matteotti 34, Milano'
]

const phoneNumbers = [
  '+39 320 123 4567', '+39 331 234 5678', '+39 340 345 6789', '+39 347 456 7890',
  '+39 380 567 8901', '+39 333 678 9012', '+39 342 789 0123', '+39 349 890 1234',
  '+39 320 901 2345', '+39 331 012 3456', '+39 340 123 4567', '+39 347 234 5678',
  '+39 380 345 6789', '+39 333 456 7890', '+39 342 567 8901'
]

const emails = [
  'mario.rossi@email.com', 'giulia.bianchi@email.com', 'luca.ferrari@email.com',
  'anna.russo@email.com', 'marco.esposito@email.com', 'elena.romano@email.com',
  'francesco.ricci@email.com', 'chiara.marino@email.com', 'alessandro.costa@email.com',
  'sofia.greco@email.com', 'davide.bruno@email.com', 'federica.gallo@email.com',
  'matteo.conti@email.com', 'valentina.deluca@email.com', 'simone.mancini@email.com'
]

const installationTypeNames = [
  'Sotto Lavello',
  'Sopra Piano',
  'Casa Intera', 
  'Osmosi Inversa'
]

const timeSlots = [TimeSlot.MORNING, TimeSlot.AFTERNOON, TimeSlot.EVENING]
const statuses = [BookingStatus.SCHEDULED, BookingStatus.COMPLETED]

async function main() {
  console.log('🌱 Creating demo technicians and appointments for June 2025...')

  // First, create installation types
  const installationTypes = []
  for (const typeName of installationTypeNames) {
    const installationType = await prisma.installationType.upsert({
      where: { name: typeName },
      update: {},
      create: {
        name: typeName,
        description: `Tipo di installazione: ${typeName}`,
        duration: Math.floor(Math.random() * 60) + 90 // 90-150 minutes
      }
    })
    installationTypes.push(installationType)
  }

  console.log('✅ Created installation types')

  // Then, ensure we have 3 technicians
  const tech1User = await prisma.user.upsert({
    where: { email: 'tech1@virtus.com' },
    update: {},
    create: {
      email: 'tech1@virtus.com',
      name: 'Marco Bianchi',
      role: Role.TECHNICIAN,
    },
  })

  const tech2User = await prisma.user.upsert({
    where: { email: 'tech2@virtus.com' },
    update: {},
    create: {
      email: 'tech2@virtus.com',
      name: 'Elena Rossi',
      role: Role.TECHNICIAN,
    },
  })

  const tech3User = await prisma.user.upsert({
    where: { email: 'tech3@virtus.com' },
    update: {},
    create: {
      email: 'tech3@virtus.com',
      name: 'Luca Verde',
      role: Role.TECHNICIAN,
    },
  })

  // Create technician profiles
  const technician1 = await prisma.technician.upsert({
    where: { userId: tech1User.id },
    update: {},
    create: {
      userId: tech1User.id,
      color: '#3B82F6', // Blue
      active: true,
    },
  })

  const technician2 = await prisma.technician.upsert({
    where: { userId: tech2User.id },
    update: {},
    create: {
      userId: tech2User.id,
      color: '#EF4444', // Red
      active: true,
    },
  })

  const technician3 = await prisma.technician.upsert({
    where: { userId: tech3User.id },
    update: {},
    create: {
      userId: tech3User.id,
      color: '#10B981', // Green
      active: true,
    },
  })

  const technicians = [technician1, technician2, technician3]

  console.log('✅ Created 3 technicians')

  // Generate appointments for June 2025 (working days only)
  const appointments = []
  const year = 2025
  const month = 6 // June

  // Get all working days in June 2025 (Monday to Friday)
  const daysInMonth = new Date(year, month, 0).getDate()
  const workingDays = []

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    const dayOfWeek = date.getDay()
    // 1 = Monday, 2 = Tuesday, ..., 5 = Friday
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDays.push(date)
    }
  }

  console.log(`📅 Found ${workingDays.length} working days in June 2025`)

  // Create demo appointments
  let createdCount = 0
  const adminUser = await prisma.user.findFirst({
    where: { role: Role.ADMIN }
  })

  if (!adminUser) {
    console.error('❌ No admin user found! Please login first with alessandro@moretti.cc')
    return
  }

  // Create 2-4 random appointments per working day
  for (const date of workingDays) {
    const appointmentsPerDay = Math.floor(Math.random() * 3) + 2 // 2-4 appointments
    
    for (let i = 0; i < appointmentsPerDay; i++) {
      try {
        const randomCustomerIndex = Math.floor(Math.random() * customerNames.length)
        const randomTechnician = technicians[Math.floor(Math.random() * technicians.length)]
        const randomTimeSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)]
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]
        const randomInstallationType = installationTypes[Math.floor(Math.random() * installationTypes.length)]

        // Create customer first
        const customer = await prisma.customer.create({
          data: {
            name: customerNames[randomCustomerIndex],
            address: addresses[randomCustomerIndex % addresses.length],
            phone: phoneNumbers[randomCustomerIndex % phoneNumbers.length],
            email: emails[randomCustomerIndex % emails.length],
          }
        })

        // Create booking
        await prisma.booking.create({
          data: {
            date: new Date(date.toISOString().split('T')[0]),
            slot: randomTimeSlot,
            status: randomStatus,
            notes: `Installazione ${randomInstallationType.name} - Appuntamento demo`,
            customerId: customer.id,
            technicianId: randomTechnician.id,
            installationTypeId: randomInstallationType.id,
            createdById: adminUser.id
          }
        })
        
        createdCount++
      } catch (error) {
        console.warn(`⚠️ Skipped appointment for ${date.toISOString().split('T')[0]} - might be duplicate`)
      }
    }
  }

  console.log(`✅ Successfully created ${createdCount} demo appointments for June 2025`)
  
  // Show distribution
  const tech1Count = await prisma.booking.count({ where: { technicianId: technician1.id } })
  const tech2Count = await prisma.booking.count({ where: { technicianId: technician2.id } })
  const tech3Count = await prisma.booking.count({ where: { technicianId: technician3.id } })
  
  console.log(`📊 Distribution:`)
  console.log(`   - Marco Bianchi (Blue): ${tech1Count} appointments`)
  console.log(`   - Elena Rossi (Red): ${tech2Count} appointments`)
  console.log(`   - Luca Verde (Green): ${tech3Count} appointments`)
  console.log(`\n🎉 Demo data is ready! The calendar should now show appointments for June 2025.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })