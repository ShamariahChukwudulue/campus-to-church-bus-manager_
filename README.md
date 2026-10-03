# TPCM Ride

TPCM Ride is a **full-stack bus registration and allocation system** designed to manage student transportation registration and bus assignments.

The system allows students to register for available trips while administrators can manage students, trips, buses, registrations, and bus allocations.

## Features

### Student Features

* Student registration
* Student login
* Secure authentication
* Trip registration
* View registration status
* View assigned bus
* View bus information
* Receive updated assignment information
* Access student-specific functionality

### Administrator Features

* Administrator authentication
* Admin dashboard
* View registered students
* View registration information
* Manage buses
* Manage trips
* Manage student registrations
* Allocate students to buses
* Move students between buses
* Remove students from buses
* Monitor bus capacity
* Prevent allocation to full buses

## Bus Allocation

The system is designed to manage a fleet consisting of:

| Bus Type  | Number Available |
| --------- | ---------------: |
| 12-seater |                3 |
| 14-seater |                2 |
| 18-seater |                2 |
| 20-seater |                1 |
| 30-seater |                1 |

The system checks bus capacity during allocation to prevent the number of assigned students from exceeding the available seats.

## Technologies Used

### Frontend

* HTML5
* CSS3
* JavaScript
* Fetch API
* Responsive Web Design

### Backend

* Node.js
* Express.js
* REST API
* JavaScript

### Database

* MongoDB
* Mongoose

### Authentication and Security

* JWT
* bcryptjs
* Authentication middleware
* Role-based authorization
* Environment variables

### Testing

* Node.js Test Runner
* Supertest
* MongoDB Memory Server
* Assertions

## Architecture

The application follows a frontend-backend architecture:

```text
┌──────────────────────┐
│      Frontend        │
│  HTML / CSS / JS     │
└──────────┬───────────┘
           │
           │ HTTP / REST API
           ▼
┌──────────────────────┐
│    Node.js / Express │
│                      │
│ Routes               │
│ Controllers          │
│ Middleware           │
│ Services             │
└──────────┬───────────┘
           │
           │ Mongoose
           ▼
┌──────────────────────┐
│       MongoDB        │
└──────────────────────┘
```

## Project Structure

```text
TPCM-Ride/
│
├── frontend/
│   ├── admin/
│   ├── student/
│   ├── css/
│   └── js/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── server.js
│
├── tests/
│
└── README.md
```

## Main Backend Components

### Routes

The backend separates API routes according to their responsibilities, including:

```text
Authentication
Buses
Trips
Registrations
Allocation
```

### Controllers

Controllers process incoming requests and coordinate the required application operations.

### Models

Mongoose models define the structure of data stored in MongoDB.

The application uses data structures for entities such as:

* Users
* Buses
* Trips
* Registrations

### Middleware

Middleware is used for tasks such as:

* Authentication
* Authorization
* Request processing
* Error handling

### Services

Business logic, including bus allocation operations, is separated into service functions to keep the application organized.

## Authentication

TPCM Ride uses JWT-based authentication.

The general authentication flow is:

```text
User
 ↓
Login
 ↓
Backend validates credentials
 ↓
JWT generated
 ↓
Token returned to client
 ↓
Token sent with protected requests
 ↓
Authentication middleware validates token
 ↓
Protected resource accessed
```

Passwords are hashed using bcryptjs before being stored.

## Bus Capacity Management

Bus capacity is enforced by the backend.

Before assigning students to a bus, the system checks whether the bus still has available seats.

This prevents invalid states such as:

```text
Capacity: 12
Assigned Students: 13
```

If a bus is full, the backend rejects further allocation to that bus.

## API Testing

The project includes automated API and integration tests.

Testing covers functionality such as:

* User registration
* User login
* Authentication
* Authorization
* Duplicate registration
* Bus allocation
* Bus capacity enforcement
* Student management
* Registration operations

Supertest is used to send HTTP requests to the application during testing, while MongoDB Memory Server provides an isolated database environment for tests.

## Running the Project

### Backend

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file based on the project's required environment variables.

Then start the development server using the command configured in the backend's `package.json`.

For example:

```bash
npm run dev
```

### Frontend

Open the frontend through the appropriate local development setup or browser according to the project's configuration.

The frontend communicates with the backend through REST API requests.

## Environment Variables

The backend uses environment variables for configuration and sensitive information.

Typical configuration may include:

```text
PORT
MONGODB_URI
JWT_SECRET
```

**Never commit actual passwords, database credentials, JWT secrets, or other sensitive information to GitHub.**

Use a `.env.example` file to document required variables without exposing their values.

## Testing

The automated test suite can be run using the test command configured in the backend's `package.json`.

The tests are designed to verify that important application functions behave as expected.



## Screenshots

### Student Interface

Add a screenshot of the student registration or dashboard interface here.

### Admin Dashboard

Add a screenshot showing the administrative dashboard and bus information here.

### Bus Allocation

Add a screenshot showing students and their assigned buses here.

## Learning Outcomes

This project provided practical experience with:

* Full-stack web development
* REST API development
* Express.js
* MongoDB
* Mongoose
* Authentication
* Authorization
* JWT
* Password hashing
* CRUD operations
* Backend architecture
* Database integration
* API testing
* Automated testing
* Error handling
* Environment variables
* Deployment
* Git and GitHub

## Project Status

**Completed**

## Author

**Chukwudulue Chimkeremeze Shamariah**

Software Engineering Student
Cosmopolitan University Abuja
