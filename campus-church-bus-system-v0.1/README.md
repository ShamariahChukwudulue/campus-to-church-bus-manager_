# 🚌 TPCM Ride — Petra Prime Church Bus Registration & Allocation System

A full-stack university transportation web application designed for students attending Sunday church services. Students can register for church trips, view real-time fleet capacity, and see their assigned bus. Administrators have a dedicated dashboard to manage trips, buses, registrations, seat allocations, move passengers, and run automated bus allocation algorithms.

Built strictly with **Node.js, Express.js, MongoDB, Mongoose, HTML5, CSS3, and Vanilla JavaScript** without bloated frontend frameworks.

---

## 📋 Table of Contents

- [Features](#-features)
- [Fleet Specification](#-fleet-specification)
- [Technology Stack](#-technology-stack)
- [Project Architecture & File Separation](#-project-architecture--file-separation)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [Database Seeding](#-database-seeding)
- [Running the Application](#-running-the-application)
- [Running Automated Tests](#-running-automated-tests)
- [REST API Documentation](#-rest-api-documentation)
- [Default Development Credentials](#-default-development-credentials)
- [Core Business Rules & Architectural Explanations](#-core-business-rules--architectural-explanations)

---

## ✨ Features

### Student Portal
* **Account Registration & Authentication:** Secure signup with student matriculation ID, university email, phone number, and bcrypt-hashed passwords.
* **Trip Booking:** View upcoming church trips, destinations, departure times, registration status, and remaining seats.
* **Overbooking & Duplicate Prevention:** Backend strictly rejects duplicate trip registrations or bookings when the total fleet capacity is exhausted.
* **Live Student Dashboard:**
  * Displays confirmed trip details and boarding instructions.
  * Shows assigned bus identifier (e.g. `BUS-14-02`), bus model/type (`14-Seater`), and dynamic bus occupancy (`11 / 14 seats`).
  * **Assignment Change Alerts:** If an administrator moves the student to another vehicle, the dashboard highlights the change:
    > *Previous Bus: BUS-14-02 ➔ New Bus: BUS-18-01*

### Administrator Dashboard
* **Dynamic Fleet Metrics:**
  * Total Registered Students
  * Total Bus Capacity (152 total seats)
  * Occupied Seats
  * Available Seats
  * Number of Full Buses
  * Number of Available Buses
  *(All metrics are dynamically aggregated from MongoDB; zero hard-coded statistics).*
* **Bus Fleet Management:** Real-time visibility into all 9 buses, their occupancy percentages, remaining seats, and live status badges (`AVAILABLE` vs `FULL`).
* **Passenger Manifests:** Inspect the full passenger roster for each bus with student names, IDs, emails, and phone numbers.
* **Manual Student Allocation & Moving:** Assign unallocated students to buses or move them between buses. Buses that have reached full capacity are automatically disabled and verified by the backend.
* **Student Removal:** Remove a student from a bus, instantly freeing up the seat and updating fleet occupancy.
* **⚡ Automatic Bus Allocation:** Single-click algorithm (`AUTO ALLOCATE STUDENTS`) that distributes unassigned registered students across available buses up to vehicle capacity.
* **Trip Scheduling & Registration Control:** Create new church trips, edit schedules, and open or close student registration at will.

---

## 🚍 Fleet Specification

The university operates **9 buses** with a total combined capacity of **152 seats**:

| Bus Identifier | Vehicle Type | Capacity | Available Units | Total Seats |
| :--- | :--- | :---: | :---: | :---: |
| `BUS-12-01` | 12-Seater Shuttle | 12 | 1 | 12 |
| `BUS-12-02` | 12-Seater Shuttle | 12 | 1 | 12 |
| `BUS-12-03` | 12-Seater Shuttle | 12 | 1 | 12 |
| `BUS-14-01` | 14-Seater HiAce | 14 | 1 | 14 |
| `BUS-14-02` | 14-Seater HiAce | 14 | 1 | 14 |
| `BUS-18-01` | 18-Seater Coaster | 18 | 1 | 18 |
| `BUS-18-02` | 18-Seater Coaster | 18 | 1 | 18 |
| `BUS-20-01` | 20-Seater Medium Bus | 20 | 1 | 20 |
| `BUS-30-01` | 30-Seater Large Coach | 30 | 1 | 30 |
| **TOTALS** | | | **9 Buses** | **152 Seats** |

> **Occupancy Calculation Rule:** Occupancy is **never** stored as a static or manually editable number in the database. It is always calculated dynamically by counting active confirmed registrations referencing that bus.

---

## 💻 Technology Stack

* **Frontend:**
  * HTML5 (semantic structure)
  * CSS3 (custom CSS variables, responsive grid, flexbox, zero external CSS bloat)
  * Vanilla JavaScript (ES6 modules, `fetch()` communicating with REST API, zero React/Vue/Angular)
* **Backend:**
  * Node.js runtime
  * Express.js framework
  * RESTful architecture with structured JSON responses
  * Middleware for JWT authentication, role authorization, and centralized error handling
* **Database & ORM:**
  * MongoDB
  * Mongoose ODM
  * Embedded in-memory database fallback (`mongodb-memory-server`) for zero-friction setup if a local standalone MongoDB daemon is not detected
* **Security & Auth:**
  * Passwords hashed using `bcryptjs` (salt rounds: 10)
  * Stateless session authorization using JSON Web Tokens (`jsonwebtoken`)
  * Protected administrative endpoints requiring `role: 'admin'`

---

## 📁 Project Architecture & File Separation

The application strictly separates HTML, CSS, client-side JavaScript, backend API routes, controllers, models, and services:

```text
campus-church-bus-system/
├── frontend/
│   ├── index.html                   # Public home / landing page
│   ├── login.html                   # Student & admin login page
│   ├── register.html                # Student account signup page
│   ├── student/
│   │   ├── dashboard.html           # Student personal dashboard
│   │   └── registration.html        # Trip booking page
│   ├── admin/
│   │   ├── dashboard.html           # Administrator overview & metrics
│   │   ├── students.html            # Student allocation table & modal
│   │   ├── buses.html               # Fleet management & manifests
│   │   └── trips.html               # Trip creation & registration control
│   ├── css/
│   │   ├── style.css                # Global tokens, buttons, navbar, cards
│   │   ├── auth.css                 # Login and signup form styles
│   │   ├── dashboard.css            # Student trip cards & occupancy bars
│   │   ├── admin.css                # Admin stats grid & allocation tables
│   │   └── responsive.css           # Mobile & tablet responsive queries
│   └── js/
│       ├── api.js                   # Universal fetch() client with JWT handling
│       ├── auth.js                  # Login/register form submission
│       ├── main.js                  # Navbar state, session guards & alerts
│       ├── student.js               # Student trip booking & bus view logic
│       ├── admin.js                 # Admin metrics, allocation, & move logic
│       ├── buses.js                 # Fleet overview & passenger lists
│       └── trips.js                 # Trip creation & open/close toggles
│
├── backend/
│   ├── config/
│   │   └── db.js                    # MongoDB / In-memory connection config
│   ├── models/
│   │   ├── User.js                  # User schema & password hashing
│   │   ├── Bus.js                   # Fleet bus schema
│   │   ├── Trip.js                  # Church trip schema
│   │   └── Registration.js          # Trip registration & bus assignment schema
│   ├── routes/
│   │   ├── authRoutes.js            # Auth endpoints
│   │   ├── busRoutes.js             # Fleet endpoints
│   │   ├── tripRoutes.js            # Trip endpoints
│   │   ├── registrationRoutes.js    # Registration endpoints
│   │   └── allocationRoutes.js      # Allocation endpoints
│   ├── controllers/
│   │   ├── authController.js        # Auth logic
│   │   ├── busController.js         # Fleet logic
│   │   ├── tripController.js        # Trip logic
│   │   ├── registrationController.js# Registration logic
│   │   └── allocationController.js  # Bus assignment & auto-allocation logic
│   ├── middleware/
│   │   ├── authMiddleware.js        # JWT verification middleware
│   │   ├── adminMiddleware.js       # Admin authorization middleware
│   │   └── errorMiddleware.js       # Centralized error formatter
│   ├── services/
│   │   └── allocationService.js     # Bus capacity & allocation algorithms
│   ├── utils/
│   │   └── seedData.js              # Database seed script
│   └── server.js                    # Server startup & static hosting
│
├── tests/
│   └── app.test.js                  # Automated test suite (12 core business tests)
├── .env.example
├── .env
├── .gitignore
├── package.json
└── README.md
```

---

## 🛠 Prerequisites

* **Node.js** v18+ (tested on Node v24)
* **npm** v9+
* *(Optional)* Local or cloud MongoDB instance (MongoDB Atlas or `mongod`). If MongoDB is not running locally, the application automatically launches an embedded in-memory MongoDB instance!

---

## 🚀 Installation & Setup

1. **Clone or navigate to the project directory:**
   ```bash
   cd campus-church-bus-system
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   A pre-configured `.env` file is included. You can verify or edit variables in `.env`:
   ```ini
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://127.0.0.1:27017/campus_church_bus
   JWT_SECRET=supersecret_campus_church_bus_jwt_key_2026_dev_only
   JWT_EXPIRES_IN=7d
   ADMIN_EMAIL=admin@campusbus.edu
   ADMIN_PASSWORD=AdminPass123!
   ```

---

## 🌱 Database Seeding

Populate the database with the default administrator, all 9 university buses, sample church trips, and sample registered students:

```bash
npm run seed
```

This creates:
- The default **Administrator** account
- The **9 University Buses** (152 total capacity)
- The primary **Sunday Church Shuttle Trip**
- **15 Sample Students** (12 pre-assigned to demonstrate bus occupancies, and 3 unassigned to demonstrate the manual and automated allocation features).

---

## 🏃 Running the Application

Start the full-stack server:

```bash
npm start
```

Open your browser to:
👉 **`http://localhost:5000`**

* The Express server serves both the **REST API** (`/api/*`) and the static **Frontend** pages.
* No additional frontend build tools or bundlers are required!

---

## 🧪 Running Automated Tests

The application includes an end-to-end integration test suite covering the 12 core business rules:

```bash
npm test
```

### Verified Test Cases:
1. **Student Registration:** Account creation and JWT generation.
2. **Student Login:** Email & password authentication.
3. **Duplicate Registration Prevention:** Rejection of duplicate trip bookings.
4. **Admin Login:** Admin authentication and role verification.
5. **Admin-Only Access Control:** Rejection of unauthorized non-admin requests with 401/403.
6. **Assigning Student to Bus:** Manual assignment to an available bus.
7. **Preventing Assignment to Full Bus:** Backend rejection when `occupancy >= capacity`.
8. **Moving a Student:** Updating bus assignment and storing `previousBus` for student notification.
9. **Removing a Student:** Unassigning student, reducing occupancy, and restoring available seats.
10. **Automatic Allocation:** Distributing unassigned students across available buses up to capacity.
11. **Correct Occupancy Calculations:** Dynamic calculation of occupied seats, available seats, and full buses.
12. **Registration Closing:** Rejection of new bookings when registration is closed by admin.

---

## 🔑 Default Development Credentials

| Role | Email Address | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin@campusbus.edu` | `AdminPass123!` |
| **Pre-Allocated Student** | `john.doe@university.edu` | `StudentPass123!` |
| **Unallocated Student** | `liam.n@university.edu` | `StudentPass123!` |

> **Security Note:** In production, replace `JWT_SECRET` and change the default admin credentials immediately.

---

## 📡 REST API Documentation

All responses follow a uniform JSON format:

* Success:
  ```json
  { "success": true, "message": "...", "data": {} }
  ```
* Error:
  ```json
  { "success": false, "message": "..." }
  ```

### Authentication Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new student account |
| `POST` | `/api/auth/login` | Public | Login for students and admins |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile |

### Church Trips Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/trips` | Public | List all trips with fleet capacity metrics |
| `GET` | `/api/trips/:id` | Public | Get single trip details and real-time stats |
| `POST` | `/api/trips` | Admin | Create a new church trip |
| `PUT` | `/api/trips/:id` | Admin | Update trip information |
| `PUT` | `/api/trips/:id/status` | Admin | Open or close student registration |
| `DELETE` | `/api/trips/:id` | Admin | Delete a trip and related bookings |

### Bus Fleet Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/buses?tripId=...` | Authenticated | List all 9 buses with dynamic occupancy |
| `GET` | `/api/buses/:id` | Authenticated | Get bus details and passenger roster |
| `POST` | `/api/buses` | Admin | Add new bus to fleet |
| `PUT` | `/api/buses/:id` | Admin | Update bus details |
| `DELETE` | `/api/buses/:id` | Admin | Remove bus from fleet |

### Registration Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/registrations` | Student | Register for a church trip |
| `GET` | `/api/registrations/my` | Student | View student's confirmed registration and assigned bus |
| `GET` | `/api/registrations` | Admin | View all registered students (filterable by bus/status) |
| `DELETE` | `/api/registrations/:id` | Authenticated | Cancel a registration |

### Allocation Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/allocation/assign` | Admin | Assign student to a designated bus |
| `POST` | `/api/allocation/move` | Admin | Move student from one bus to another |
| `POST` | `/api/allocation/remove` | Admin | Remove student from assigned bus |
| `POST` | `/api/allocation/auto` | Admin | Run automatic allocation algorithm |
| `GET` | `/api/allocation/stats` | Admin | Get dynamically calculated dashboard statistics |

---

## 🧠 Core Business Rules & Architectural Explanations

1. **How the Frontend Communicates with Express:**  
   The frontend uses modern vanilla JavaScript `fetch()` through a modular client (`frontend/js/api.js`). Tokens stored in `localStorage` are automatically attached as `Authorization: Bearer <token>` headers to every API request.
2. **How Express Communicates with MongoDB:**  
   Mongoose models define strict schemas (`User`, `Bus`, `Trip`, `Registration`). Mongoose translates queries and aggregations into MongoDB operations.
3. **How Authentication Works:**  
   Users submit credentials to `/api/auth/login`. Passwords are validated using `bcrypt.compare()`. Upon success, a signed JWT containing the user ID and role is returned. Express middleware (`authMiddleware.js` and `adminMiddleware.js`) verify the JWT and enforce access controls.
4. **How Students are Registered:**  
   Students submit a booking request to `/api/registrations`. The backend validates that the trip registration status is `'open'`, checks that total fleet capacity is not exceeded, and uses a compound index `{ student: 1, trip: 1 }` to prevent duplicate bookings.
5. **How Bus Capacity is Enforced:**  
   Before any student assignment or move occurs (`assignStudentToBus`), the backend calculates the current occupancy of the destination bus: `currentOccupancy < bus.capacity`. If the bus is full, the server returns an HTTP 400 error (`Bus is already full`).
6. **How Automatic Allocation Works:**  
   The backend service queries all confirmed registrations without a bus (`bus: null`) and all buses with remaining capacity. It iterates sequentially, filling available seats without ever exceeding vehicle capacity.
7. **How the Student Receives Updated Bus Information:**  
   When an admin reassigns a student, the previous bus ID is recorded in `registration.previousBus`. When the student visits their dashboard (`/api/registrations/my`), the backend calculates the difference and alerts the student with both the previous and newly assigned bus.
