# Patient Monitoring System App (CareTrack)

A full-stack MERN application for monitoring patient health information and
enabling doctor-patient communication, with role-based access for patients,
doctors, and admins.

## Features

**Core**
- JWT authentication, bcrypt password hashing, role-based access (patient / doctor / admin)
- Patient health readings with configurable abnormal-reading alerts
- Health history with trend charts (Recharts)
- Appointment booking, confirmation/cancellation workflow, doctor picker
- Dashboard statistics per role

**Added in this build**
- **AI-assisted health insights (current trend)**: explainable trend detection, wellness monitoring score, recent-value analysis, and attention flags generated from the patient's own readings. No diagnosis is made and no external AI service is required.
- **Medications**: patients can add, pause/resume, and remove medication reminders
- **Real-time messaging**: Socket.IO-powered doctor-patient chat, with contact list
  derived from shared appointments/prior conversations
- **Notifications**: in-app bell with live push (Socket.IO) for health alerts,
  appointment updates, and new messages; mark as read / mark all as read
- **Medical document upload**: patients upload PDFs/images/Word docs (local disk
  storage, served from `/uploads`); doctors can view a patient's documents
- **Admin panel**: create/deactivate/delete user accounts, view system-wide stats
- **Doctor patient detail view**: per-patient health trend chart and history

## Technology
Frontend: React + Vite + React Router + Axios + Recharts + Socket.IO client
Backend: Node.js + Express + MongoDB + Mongoose + JWT + bcryptjs + Multer + Socket.IO
Database: MongoDB

## Requirements
- Node.js 18+
- MongoDB Community Server (running locally) or a MongoDB Atlas connection string

## Setup

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env      # on Windows: copy .env.example .env
# edit .env if needed (Mongo URI, JWT secret, etc.)
npm run seed               # optional: creates demo admin/doctor/patient accounts + sample data
npm run dev
```
Backend runs at http://localhost:5000 (REST API + Socket.IO on the same port).

### 2. Frontend
Open another terminal:
```bash
cd frontend
npm install
cp .env.example .env       # on Windows: copy .env.example .env
npm run dev
```
Frontend runs at http://localhost:5173

### 3. Demo logins (after `npm run seed`)
| Role    | Email                 | Password    |
|---------|-----------------------|-------------|
| Admin   | admin@example.com     | Password123 |
| Doctor  | doctor@example.com    | Password123 |
| Patient | patient@example.com   | Password123 |

You can also register new patient/doctor accounts from the login screen.
Admin accounts can only be created via the seed script or by an existing admin
from the Admin Panel — public self-registration cannot create admins.

## Environment

Backend `.env`:
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/patient_monitoring_system
JWT_SECRET=change_this_to_a_long_random_secret
CLIENT_URL=http://localhost:5173
```

Frontend `.env`:
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## API overview
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/health
POST   /api/health
GET    /api/health/summary
GET    /api/health/patient/:patientId
DELETE /api/health/:id

GET    /api/appointments
POST   /api/appointments
PATCH  /api/appointments/:id/status
DELETE /api/appointments/:id

GET    /api/patients               (doctor/admin)
GET    /api/patients/doctors       (list doctors, for booking)
GET    /api/patients/:id           (doctor/admin)

GET    /api/medications
POST   /api/medications
PUT    /api/medications/:id
DELETE /api/medications/:id

GET    /api/notifications
GET    /api/notifications/unread-count
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all
DELETE /api/notifications/:id

GET    /api/messages/contacts
GET    /api/messages/:userId
POST   /api/messages

GET    /api/documents
POST   /api/documents              (multipart/form-data, field name "file")
DELETE /api/documents/:id

GET    /api/admin/overview         (admin)
GET    /api/admin/users            (admin)
POST   /api/admin/users            (admin)
PATCH  /api/admin/users/:id        (admin)
DELETE /api/admin/users/:id        (admin)

GET    /api/dashboard/stats

GET    /api/insights
GET    /api/insights/patient/:patientId  (doctor/admin)
```

Socket.IO events: connect with `auth: { token }`; server emits
`notification:new` and `message:new` to the relevant user's room.

## Important
AI insights are rule-based/algorithmic in this version so the project works without an AI API key. You can later swap the insight engine for a clinician-approved AI service with proper privacy controls.

This is a student-project architecture. It is not a medical diagnostic
system. Health alerts are configurable monitoring notifications and should
not be treated as emergency medical advice.

## Modern demo features
- **AI Health Risk Prediction:** explainable rule-based 7-day monitoring risk from recent BP, blood sugar, SpO2 and heart-rate trends.
- **Voice Health Input:** browser Web Speech API converts spoken readings such as “BP 120 by 80, sugar 110” into form values.
- **Emergency SOS + Live Location:** patient can activate an SOS, capture GPS coordinates and share a Google Maps location link with the care team through in-app notifications.

These features are educational monitoring aids, not medical diagnosis or emergency services. SOS notifications are recorded in the application; real SMS/WhatsApp delivery requires an external provider integration and credentials.

# CareTrack upgraded features

This version modifies the existing CareTrack project in place and adds:
- 5-language UI selector: English, Tamil, Hindi, Telugu, Malayalam
- global browser voice assistant on login and authenticated pages
- multilingual voice navigation and voice form filling
- multilingual health-reading voice parser
- 7-day explainable monitoring risk already present in the project
- Emergency SOS with browser GPS and doctor notifications
- doctor patient health report generation with Print / Save as PDF

## Windows PowerShell

Backend terminal:
```powershell
cd "...\build\backend"
copy .env.example .env
npm install
npm start
```

Frontend terminal:
```powershell
cd "...\build\frontend"
copy .env.example .env
npm install
npm run dev
```

Use the URL printed by Vite. If port 5173 is busy, Vite may use 5174.

Voice recognition uses the browser Web Speech API. Chrome/Edge are recommended. Microphone permission is required.
