const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Bus = require('../models/Bus');
const Trip = require('../models/Trip');
const Registration = require('../models/Registration');

/**
 * 9 Standard University Buses totaling 152 seats:
 * 3 x 12-seater (36 seats)
 * 2 x 14-seater (28 seats)
 * 2 x 18-seater (36 seats)
 * 1 x 20-seater (20 seats)
 * 1 x 30-seater (30 seats)
 */
const initialBuses = [
  { busNumber: 'BUS-12-01', busType: '12-Seater', capacity: 12 },
  { busNumber: 'BUS-12-02', busType: '12-Seater', capacity: 12 },
  { busNumber: 'BUS-12-03', busType: '12-Seater', capacity: 12 },
  { busNumber: 'BUS-14-01', busType: '14-Seater', capacity: 14 },
  { busNumber: 'BUS-14-02', busType: '14-Seater', capacity: 14 },
  { busNumber: 'BUS-18-01', busType: '18-Seater', capacity: 18 },
  { busNumber: 'BUS-18-02', busType: '18-Seater', capacity: 18 },
  { busNumber: 'BUS-20-01', busType: '20-Seater', capacity: 20 },
  { busNumber: 'BUS-30-01', busType: '30-Seater', capacity: 30 }
];

const sampleStudents = [
  { name: 'John Doe', gender: 'Male', university: 'Cosmopolitan University Abuja', studentId: 'STU/2026/001', email: 'john.doe@university.edu', phone: '+1 555-0101', password: 'StudentPass123!' },
  { name: 'Mary Jane', gender: 'Female', university: 'University of Abuja', studentId: 'STU/2026/002', email: 'mary.jane@university.edu', phone: '+1 555-0102', password: 'StudentPass123!' },
  { name: 'David Smith', gender: 'Male', university: 'Philomath University', studentId: 'STU/2026/003', email: 'david.smith@university.edu', phone: '+1 555-0103', password: 'StudentPass123!' },
  { name: 'Sarah Connor', gender: 'Female', university: 'Nasarawa State University', studentId: 'STU/2026/004', email: 'sarah.c@university.edu', phone: '+1 555-0104', password: 'StudentPass123!' },
  { name: 'Michael Brown', gender: 'Male', university: 'Bingham University', studentId: 'STU/2026/005', email: 'michael.b@university.edu', phone: '+1 555-0105', password: 'StudentPass123!' },
  { name: 'Grace Hopper', gender: 'Female', university: 'Cosmopolitan University Abuja', studentId: 'STU/2026/006', email: 'grace.h@university.edu', phone: '+1 555-0106', password: 'StudentPass123!' },
  { name: 'Peter Parker', gender: 'Male', university: 'University of Abuja', studentId: 'STU/2026/007', email: 'peter.p@university.edu', phone: '+1 555-0107', password: 'StudentPass123!' },
  { name: 'Rachel Green', gender: 'Female', university: 'Philomath University', studentId: 'STU/2026/008', email: 'rachel.g@university.edu', phone: '+1 555-0108', password: 'StudentPass123!' },
  { name: 'Lucas Scott', gender: 'Male', university: 'Nasarawa State University', studentId: 'STU/2026/009', email: 'lucas.s@university.edu', phone: '+1 555-0109', password: 'StudentPass123!' },
  { name: 'Hannah Abbott', gender: 'Female', university: 'Bingham University', studentId: 'STU/2026/010', email: 'hannah.a@university.edu', phone: '+1 555-0110', password: 'StudentPass123!' },
  { name: 'Daniel Craig', gender: 'Male', university: 'Cosmopolitan University Abuja', studentId: 'STU/2026/011', email: 'daniel.c@university.edu', phone: '+1 555-0111', password: 'StudentPass123!' },
  { name: 'Emma Watson', gender: 'Female', university: 'University of Abuja', studentId: 'STU/2026/012', email: 'emma.w@university.edu', phone: '+1 555-0112', password: 'StudentPass123!' },
  { name: 'Liam Neeson', gender: 'Male', university: 'Philomath University', studentId: 'STU/2026/013', email: 'liam.n@university.edu', phone: '+1 555-0113', password: 'StudentPass123!' },
  { name: 'Olivia Rodrigo', gender: 'Female', university: 'Nasarawa State University', studentId: 'STU/2026/014', email: 'olivia.r@university.edu', phone: '+1 555-0114', password: 'StudentPass123!' },
  { name: 'Noah Centineo', gender: 'Male', university: 'Bingham University', studentId: 'STU/2026/015', email: 'noah.c@university.edu', phone: '+1 555-0115', password: 'StudentPass123!' }
];

const seedData = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('[Seed] Connecting to database...');
      await connectDB();
    }

    console.log('[Seed] Clearing existing collections...');
    await User.deleteMany({});
    await Bus.deleteMany({});
    await Trip.deleteMany({});
    await Registration.deleteMany({});

    // 1. Create Default Admin User
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@campusbus.edu';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
    const adminName = process.env.ADMIN_NAME || 'Campus Administrator';

    console.log(`[Seed] Creating default Admin user: ${adminEmail}...`);
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      phone: '+1 800-555-BUS1',
      password: adminPassword,
      role: 'admin'
    });

    // 2. Create the 9 Buses (152 total capacity)
    console.log('[Seed] Inserting 9 university buses (152 seats total)...');
    const createdBuses = await Bus.insertMany(initialBuses);
    console.log(`[Seed] Inserted ${createdBuses.length} buses successfully.`);

    // 3. Create Default Upcoming Church Trip
    console.log('[Seed] Creating primary Sunday Church Trip...');
    const trip = await Trip.create({
      destination: 'Petra Prime Church',
      date: 'Next Sunday (Morning Service)',
      departureTime: '07:30 AM',
      registrationStatus: 'open',
      description: 'Weekly campus shuttle to Sunday church services. Buses depart from the Campus Student Center Pavilion at 7:30 AM sharp.'
    });

    // 4. Create Sample Students
    console.log('[Seed] Creating test students...');
    const createdStudents = [];
    for (const stu of sampleStudents) {
      const student = await User.create({
        name: stu.name,
        studentId: stu.studentId,
        gender: stu.gender,
        university: stu.university,
        email: stu.email,
        phone: stu.phone,
        password: stu.password,
        role: 'student'
      });
      createdStudents.push(student);
    }
    console.log(`[Seed] Created ${createdStudents.length} sample students.`);

    // 5. Pre-allocate some students to demonstrate occupied and available seats
    // Allocate 10 students to BUS-12-01 (leaves 2 seats available)
    const bus12_01 = createdBuses.find((b) => b.busNumber === 'BUS-12-01');
    const bus14_01 = createdBuses.find((b) => b.busNumber === 'BUS-14-01');

    console.log('[Seed] Registering and allocating sample students...');
    for (let i = 0; i < 10; i++) {
      await Registration.create({
        student: createdStudents[i]._id,
        trip: trip._id,
        bus: bus12_01._id,
        status: 'confirmed'
      });
    }

    // Register 2 students to BUS-14-01
    for (let i = 10; i < 12; i++) {
      await Registration.create({
        student: createdStudents[i]._id,
        trip: trip._id,
        bus: bus14_01._id,
        status: 'confirmed'
      });
    }

    // Register remaining 3 students as unassigned (to test allocation and auto-allocate button!)
    for (let i = 12; i < 15; i++) {
      await Registration.create({
        student: createdStudents[i]._id,
        trip: trip._id,
        bus: null,
        status: 'confirmed'
      });
    }

    console.log('\n=============================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('=============================================================');
    console.log('Admin Account:');
    console.log(`  Email:    ${adminEmail}`);
    console.log(`  Password: ${adminPassword}`);
    console.log('Sample Student (Pre-assigned to BUS-12-01):');
    console.log(`  Email:    john.doe@university.edu`);
    console.log(`  Password: StudentPass123!`);
    console.log('Sample Student (Unassigned - for testing allocation):');
    console.log(`  Email:    liam.n@university.edu`);
    console.log(`  Password: StudentPass123!`);
    console.log('Buses created: 9 buses with 152 total seats');
    console.log('Trip created: Petra Prime Church');
    console.log('Registrations: 15 total (12 assigned, 3 unassigned)');
    console.log('=============================================================\n');

    if (require.main === module) {
      await disconnectDB();
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Seeding error:', err);
    if (require.main === module) {
      process.exit(1);
    }
  }
};

if (require.main === module) {
  seedData();
}

module.exports = seedData;
