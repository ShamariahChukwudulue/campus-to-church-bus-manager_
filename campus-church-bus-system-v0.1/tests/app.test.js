const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_12345';

const { app } = require('../backend/server');
const User = require('../backend/models/User');
const Bus = require('../backend/models/Bus');
const Trip = require('../backend/models/Trip');
const Registration = require('../backend/models/Registration');

let mongoServer;
let adminToken = '';
let studentToken = '';
let student2Token = '';
let student3Token = '';
let adminUser;
let testStudent1;
let testStudent2;
let testStudent3;
let testTrip;
let bus12_01;
let bus14_01;
let smallBus2;

describe('TPCM Ride - Integration Tests', () => {
  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Create Admin User
    adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@test.edu',
      phone: '+1 555-0000',
      password: 'AdminPassword123!',
      role: 'admin'
    });

    // Create 3 Buses (including a small 2-seater bus to easily test full-bus capacity enforcement)
    bus12_01 = await Bus.create({
      busNumber: 'BUS-12-01',
      busType: '12-Seater',
      capacity: 12
    });

    bus14_01 = await Bus.create({
      busNumber: 'BUS-14-01',
      busType: '14-Seater',
      capacity: 14
    });

    smallBus2 = await Bus.create({
      busNumber: 'BUS-TEST-02',
      busType: '2-Seater Test Shuttle',
      capacity: 2
    });

    // Create Church Trip
    testTrip = await Trip.create({
      destination: 'Petra Prime Church',
      date: 'Sunday, 10:00 AM',
      departureTime: '08:30 AM',
      registrationStatus: 'open',
      description: 'Weekly campus shuttle service'
    });
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  // TEST 1: Student registration
  test('1. Student Registration: Creates account and returns JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Johnson',
        studentId: 'STU/2026/101',
        gender: 'Female',
        university: 'Cosmopolitan University Abuja',
        email: 'alice.j@university.edu',
        phone: '+1 555-0101',
        password: 'Password123!'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, 'alice.j@university.edu');
    assert.equal(res.body.data.user.role, 'student');
    assert.equal(res.body.data.user.gender, 'Female');
    assert.equal(res.body.data.user.university, 'Cosmopolitan University Abuja');

    studentToken = res.body.data.token;
    testStudent1 = res.body.data.user;
  });

  // TEST 1b: Gender and university are mandatory and restricted to the approved lists
  test('1b. Student Registration: Rejects missing or invalid gender/university', async () => {
    const base = {
      name: 'Validation Check',
      studentId: 'STU/2026/900',
      email: 'validation.check@university.edu',
      phone: '+1 555-0900',
      password: 'Password123!'
    };

    const missingBoth = await request(app).post('/api/auth/register').send(base);
    assert.equal(missingBoth.status, 400);

    const badGender = await request(app)
      .post('/api/auth/register')
      .send({ ...base, gender: 'Other', university: 'Bingham University' });
    assert.equal(badGender.status, 400);

    const badUniversity = await request(app)
      .post('/api/auth/register')
      .send({ ...base, gender: 'Male', university: 'Harvard University' });
    assert.equal(badUniversity.status, 400);

    // Every approved university is accepted
    const universities = [
      'University of Abuja',
      'Philomath University',
      'Nasarawa State University',
      'Bingham University'
    ];
    for (const [i, university] of universities.entries()) {
      const ok = await request(app)
        .post('/api/auth/register')
        .send({
          ...base,
          studentId: `STU/2026/91${i}`,
          email: `validation.ok${i}@university.edu`,
          gender: 'male',
          university
        });
      assert.equal(ok.status, 201);
      assert.equal(ok.body.data.user.gender, 'Male');
      assert.equal(ok.body.data.user.university, university);
    }
  });

  // TEST 2: Student login
  test('2. Student Login: Authenticates student and returns valid token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alice.j@university.edu',
        password: 'Password123!'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.role, 'student');
  });

  // TEST 4: Admin login
  test('4. Admin Login: Authenticates administrator account', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.edu',
        password: 'AdminPassword123!'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.role, 'admin');

    adminToken = res.body.data.token;
  });

  // TEST 5: Admin-only access control
  test('5. Admin-Only Access: Prevents students and unauthenticated users from accessing admin routes', async () => {
    // Unauthenticated
    const resUnauth = await request(app)
      .post('/api/allocation/assign')
      .send({ registrationId: 'dummy', busId: bus12_01._id });
    assert.equal(resUnauth.status, 401);

    // Student token on admin route
    const resStudent = await request(app)
      .post('/api/allocation/assign')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ registrationId: 'dummy', busId: bus12_01._id });
    assert.equal(resStudent.status, 403);
    assert.equal(resStudent.body.success, false);
  });

  // Student registers for trip
  test('Trip Registration: Student 1 registers for church trip', async () => {
    const res = await request(app)
      .post('/api/registrations')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ tripId: testTrip._id });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'confirmed');
    assert.equal(res.body.data.bus, null); // Unallocated initially
  });

  // TEST 3: Duplicate registration prevention
  test('3. Duplicate Registration Prevention: Student cannot register twice for same trip', async () => {
    const res = await request(app)
      .post('/api/registrations')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ tripId: testTrip._id });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /already registered/i);
  });

  // Register Student 2 and Student 3 for subsequent tests
  test('Setup additional students for allocation tests', async () => {
    const res2 = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Bob Smith',
        studentId: 'STU/2026/102',
        gender: 'Male',
        university: 'Cosmopolitan University Abuja',
        email: 'bob.s@university.edu',
        phone: '+1 555-0102',
        password: 'Password123!'
      });
    student2Token = res2.body.data.token;
    testStudent2 = res2.body.data.user;

    await request(app)
      .post('/api/registrations')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ tripId: testTrip._id });

    const res3 = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Charlie Brown',
        studentId: 'STU/2026/103',
        gender: 'Male',
        university: 'Cosmopolitan University Abuja',
        email: 'charlie.b@university.edu',
        phone: '+1 555-0103',
        password: 'Password123!'
      });
    student3Token = res3.body.data.token;
    testStudent3 = res3.body.data.user;

    await request(app)
      .post('/api/registrations')
      .set('Authorization', `Bearer ${student3Token}`)
      .send({ tripId: testTrip._id });
  });

  // TEST 6: Assigning a student to a bus
  test('6. Assign Student to Bus: Admin assigns student to available bus', async () => {
    const reg1 = await Registration.findOne({ student: testStudent1.id, trip: testTrip._id });

    const res = await request(app)
      .post('/api/allocation/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        registrationId: reg1._id,
        busId: bus12_01._id
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.bus._id.toString(), bus12_01._id.toString());
  });

  // TEST 7: Preventing assignment to a full bus
  test('7. Preventing Assignment to Full Bus: Backend rejects assignment when bus capacity reached', async () => {
    // smallBus2 has capacity = 2. Let us assign student 1 and student 2 to smallBus2 to fill it completely.
    const reg1 = await Registration.findOne({ student: testStudent1.id, trip: testTrip._id });
    const reg2 = await Registration.findOne({ student: testStudent2.id, trip: testTrip._id });
    const reg3 = await Registration.findOne({ student: testStudent3.id, trip: testTrip._id });

    // Fill seat 1
    await request(app)
      .post('/api/allocation/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ registrationId: reg1._id, busId: smallBus2._id });

    // Fill seat 2
    await request(app)
      .post('/api/allocation/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ registrationId: reg2._id, busId: smallBus2._id });

    // Now smallBus2 has 2 / 2 occupied seats. Attempting to assign student 3 must fail!
    const resOverfill = await request(app)
      .post('/api/allocation/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ registrationId: reg3._id, busId: smallBus2._id });

    assert.equal(resOverfill.status, 400);
    assert.equal(resOverfill.body.success, false);
    assert.match(resOverfill.body.message, /already full/i);
  });

  // TEST 8: Moving a student
  test('8. Moving a Student: Admin moves student to another bus, updates previousBus', async () => {
    const reg1 = await Registration.findOne({ student: testStudent1.id, trip: testTrip._id });

    // Move student 1 from smallBus2 to bus14_01
    const res = await request(app)
      .post('/api/allocation/move')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        registrationId: reg1._id,
        targetBusId: bus14_01._id
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.bus._id.toString(), bus14_01._id.toString());
    assert.equal(res.body.data.previousBus._id.toString(), smallBus2._id.toString());

    // Verify student view reflects the update and change notice
    const studentRes = await request(app)
      .get('/api/registrations/my')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(studentRes.status, 200);
    assert.ok(studentRes.body.data.busChangedNotice);
    assert.equal(studentRes.body.data.busChangedNotice.hasChanged, true);
    assert.equal(studentRes.body.data.busChangedNotice.newBusNumber, bus14_01.busNumber);
  });

  // TEST 9: Removing a student
  test('9. Removing a Student: Admin unassigns student from bus', async () => {
    const reg2 = await Registration.findOne({ student: testStudent2.id, trip: testTrip._id });

    const res = await request(app)
      .post('/api/allocation/remove')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ registrationId: reg2._id });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.bus, null);

    // Verify smallBus2 occupancy decreased to 0
    const busesRes = await request(app).get(`/api/buses?tripId=${testTrip._id}`);
    const smallBus = busesRes.body.data.find((b) => b._id.toString() === smallBus2._id.toString());
    assert.equal(smallBus.occupiedSeats, 0);
  });

  // TEST 10: Automatic allocation
  test('10. Automatic Allocation: Assigns unassigned students across available buses within capacity', async () => {
    // Currently student 2 and student 3 are unassigned
    const res = await request(app)
      .post('/api/allocation/auto')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ tripId: testTrip._id });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.allocatedCount >= 2);

    // Verify all registered students are now allocated to a bus
    const unallocated = await Registration.countDocuments({
      trip: testTrip._id,
      status: 'confirmed',
      bus: null
    });
    assert.equal(unallocated, 0);
  });

  // TEST 11: Correct occupancy calculations
  test('11. Correct Occupancy Calculations: Stats reflect dynamic counts accurately', async () => {
    const statsRes = await request(app)
      .get(`/api/allocation/stats?tripId=${testTrip._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(statsRes.status, 200);
    assert.equal(statsRes.body.success, true);
    const stats = statsRes.body.data;

    assert.equal(stats.totalStudents, 3);
    assert.equal(stats.occupiedSeats, 3);
    assert.equal(stats.unassignedStudents, 0);
    assert.equal(stats.totalCapacity, 12 + 14 + 2);
    assert.equal(stats.availableSeats, 28 - 3); // 25
  });

  // TEST 12: Registration closing
  test('12. Registration Closing: When admin closes registration, new bookings are rejected', async () => {
    // Admin closes registration
    const closeRes = await request(app)
      .put(`/api/trips/${testTrip._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ registrationStatus: 'closed' });

    assert.equal(closeRes.status, 200);
    assert.equal(closeRes.body.data.registrationStatus, 'closed');

    // Create a 4th student and attempt to register for closed trip
    const stu4Res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Diana Prince',
        studentId: 'STU/2026/104',
        gender: 'Female',
        university: 'Cosmopolitan University Abuja',
        email: 'diana.p@university.edu',
        phone: '+1 555-0104',
        password: 'Password123!'
      });

    const regAttempt = await request(app)
      .post('/api/registrations')
      .set('Authorization', `Bearer ${stu4Res.body.data.token}`)
      .send({ tripId: testTrip._id });

    assert.equal(regAttempt.status, 400);
    assert.equal(regAttempt.body.success, false);
    assert.match(regAttempt.body.message, /registration is currently closed/i);

    // Reopen registration to confirm toggle works both ways
    const openRes = await request(app)
      .put(`/api/trips/${testTrip._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ registrationStatus: 'open' });

    assert.equal(openRes.status, 200);
    assert.equal(openRes.body.data.registrationStatus, 'open');
  });
  // TEST 13: One booking per trip, but multiple different trips are allowed
  test('13. Multi-Trip Booking: student can book Sunday AND Wednesday once each, never the same trip twice', async () => {
    const wednesdayTrip = await Trip.create({
      destination: 'Petra Prime Church',
      date: 'Wednesday (Midweek Service)',
      departureTime: '05:30 PM',
      registrationStatus: 'open'
    });

    // Student 1 already holds a booking for testTrip (Sunday) - booking Wednesday must succeed
    const wedRes = await request(app)
      .post('/api/registrations')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ tripId: wednesdayTrip._id });

    assert.equal(wedRes.status, 201);
    assert.equal(wedRes.body.data.status, 'confirmed');

    // Booking Wednesday again is still rejected
    const dupRes = await request(app)
      .post('/api/registrations')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ tripId: wednesdayTrip._id });

    assert.equal(dupRes.status, 400);
    assert.match(dupRes.body.message, /already registered/i);

    // ?all=true returns both bookings, one per trip
    const allRes = await request(app)
      .get('/api/registrations/my?all=true')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(allRes.status, 200);
    assert.equal(allRes.body.count, 2);
    const tripIds = allRes.body.data.map((r) => String(r.trip._id));
    assert.ok(tripIds.includes(String(testTrip._id)));
    assert.ok(tripIds.includes(String(wednesdayTrip._id)));

    // Trips the student has NOT booked can be worked out from the two lists
    const tripsRes = await request(app).get('/api/trips');
    const unbooked = tripsRes.body.data.filter((t) => !tripIds.includes(String(t._id)));
    assert.equal(unbooked.length, 0);
  });
});
