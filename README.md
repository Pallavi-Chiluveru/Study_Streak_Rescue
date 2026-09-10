# ⚡ Study Streak Rescue

> **Fall Behind. Rescue Your Plan. Keep Moving.**

Study Streak Rescue is an AI-powered self-healing productivity and catch-up planner. Unlike traditional static timetable apps that simply mark tasks as overdue, Study Streak Rescue dynamically recalculates your remaining capacity, protects your completed work, and automatically rebuilds a realistic catch-up schedule.

---

## 🚀 Key Features

* **⚡ RESCUE MY PLAN (Core Differentiator)**: Automatically rebalances overdue and remaining tasks across remaining deadline days without ever modifying completed tasks.
* **⚡ I Have Less Time Today**: Quick adaptation feature to trim today's schedule on busy days and push non-essential tasks to tomorrow.
* **🤖 AI-Powered Task Breakdown (Groq AI)**: Generates sequential, actionable micro-tasks from any goal title, description, and topics.
* **🛡️ Mathematical Feasibility Engine**: Compares estimated work hours against available daily study time to prevent impossible schedules.
* **❤️ Live Plan Health Score**: Dynamic health calculation (0–100%) tracking completion rate, missed tasks, and study pace.
* **🔥 Gamified Momentum & Achievements**: Track study streaks, earn +50 XP per task completed, and unlock achievement badges.
* **⏱️ Integrated Focus Session Timer**: Deep-work countdown timer with circular ring progress and ambient electric glow.
* **📊 Visual Analytics**: Interactive Recharts graphs monitoring weekly task completion, focus hours, and plan progress.
* **⚡ Premium Electric Energy UI**: Modern Tailwind CSS v4 design with glowing borders, energy pulses, and lightning accents.

---

## 🛠️ Technology Stack

### Frontend
* **React 19** + **Vite 8**
* **Tailwind CSS v4** + Custom Keyframes & Utilities
* **React Router v7**
* **Axios**
* **Lucide React Icons**
* **Recharts**
* **Framer Motion**

### Backend
* **Node.js** & **Express.js**
* **MongoDB** & **Mongoose**
* **JWT** Authentication & **bcryptjs**
* **groq-sdk** (centralized Groq model configuration with deterministic fallback)

---

## 📁 Folder Structure

```
Hacthon2/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB Mongoose Connection
│   ├── controllers/              # Auth, Plan, Task, Analytics, Dashboard Controllers
│   ├── middleware/               # Auth (JWT) & Error Handling Middleware
│   ├── models/                   # User, Plan, Task Schemas
│   ├── routes/                   # API Endpoints
│   ├── services/
│   │   ├── groqService.js        # Groq AI Generator & Fallback
│   │   ├── feasibilityService.js # Feasibility Math Engine
│   │   ├── healthService.js     # Health Score Calculation
│   │   ├── schedulingService.js # Task Distribution Engine
│   │   └── rescueService.js     # ⚡ Rescue My Plan Backend Engine
│   ├── utils/
│   │   └── dateUtils.js          # Date Math Helpers
│   ├── server.js                 # Express Application Entry
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/               # ElectricButton, ElectricCard, LightningBackground, PlanHealth, etc.
│   │   │   ├── layout/           # Sidebar, Navbar, MobileNavigation
│   │   │   ├── tasks/            # TaskCard, FocusTimer, QuickAdaptModal
│   │   │   ├── rescue/           # RescueModal (⚡ Rescue My Plan Flow)
│   │   │   └── plans/            # CreatePlanWizard
│   │   ├── context/              # AuthContext & ToastContext
│   │   ├── pages/                # LandingPage, LoginPage, RegisterPage, Dashboard, Plans, Today, Analytics, Achievements
│   │   ├── services/             # Axios API Client
│   │   ├── App.jsx
│   │   └── index.css             # Custom Keyframes & Electric Glow Utilities
│   ├── index.html
│   └── vite.config.js
└── README.md
```

---

## ⚙️ Installation & Configuration

### Prerequisites
* **Node.js**: v18.x or higher
* **MongoDB**: Running locally on `mongodb://localhost:27017` or MongoDB Atlas URI.

### 1. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in `backend/`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/studystreakrescue
JWT_SECRET=super_secret_lightning_key_2026
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
CLIENT_URLS=https://your-frontend-domain.example,http://localhost:5173
```
*Note: If `GROQ_API_KEY` is not provided or the provider fails, the backend uses an explicit deterministic fallback breakdown so the app remains usable.*

Start backend server:
```bash
npm run dev
# Server runs at http://localhost:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```
Create a `.env` file in `frontend/`:
```env
VITE_API_URL=https://study-streak-rescue.onrender.com/api

For local development, use `http://localhost:5000/api` instead.

### Production deployment

For Render, set the backend service root directory to `backend`, use `npm install` as the build command, and `npm start` as the start command. Add `GROQ_API_KEY`, `GROQ_MODEL`, `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_URLS` in the Render environment. `CLIENT_URLS` must include the exact deployed frontend origin, for example `https://your-app.vercel.app`.

For Vercel, set the frontend root directory to `frontend` and add `VITE_API_URL=https://study-streak-rescue.onrender.com/api`. Rebuild and redeploy the frontend after changing this variable because Vite embeds it at build time.

The production registration endpoint is `POST https://study-streak-rescue.onrender.com/api/auth/register`.
```

Start Vite dev server:
```bash
npm run dev
# App runs at http://localhost:5173
```

---

## 🔌 API Route Overview

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT |
| `GET` | `/api/auth/me` | Get current user profile |
| `POST` | `/api/plans/generate` | AI breakdown preview & feasibility check |
| `POST` | `/api/plans` | Create and save new study plan & tasks |
| `GET` | `/api/plans` | Get user study plans |
| `GET` | `/api/plans/:id` | Get single plan details with tasks |
| `POST` | `/api/plans/:id/rescue` | **⚡ Execute Rescue My Plan Workflow** |
| `POST` | `/api/plans/:id/quick-adapt` | **⚡ Execute Quick Adaptation Workflow** |
| `GET` | `/api/tasks/today` | Get today focus tasks |
| `PATCH` | `/api/tasks/:id/complete` | Complete task & award +50 XP |
| `POST` | `/api/tasks/simulate-missed` | **Demo Mode: Simulate missed tasks for testing** |
| `GET` | `/api/dashboard` | Main dashboard stats & active plans |
| `GET` | `/api/analytics` | Analytics summary & chart data |
| `GET` | `/api/health` | Backend health check |

---

## ⚡ Core Rescue Workflow Test

1. Register or Log in to the application.
2. Click **Create New Plan** and enter Goal: `"Java Backend Interview Preparation"`, Deadline: `6 days from today`, Availability: `3 hours/day`.
3. Click **⚡ Generate My Rescue-Ready Plan** -> AI/Fallback breakdown generates micro-tasks and verifies feasibility. Save plan.
4. Complete 2 tasks to earn **+50 XP** each and start your study streak.
5. Trigger **Demo Mode: Simulate Missed Tasks** button on Dashboard or Plan Details page.
6. Observe Plan Health drop below 50% (`Rescue Recommended ⚠`).
7. Click **⚡ RESCUE MY PLAN** button:
   * View missed task summary.
   * Update daily available hours (e.g., `2 hours/day`).
   * Watch the electric re-balancing animation state.
   * View **⚡ PLAN RESCUED** success screen.
8. Verify that completed tasks remain untouched while missed/pending work is redistributed across remaining days with new Plan Health score.

---

## 📸 Screenshots & UI Identity

Study Streak Rescue features a **Premium Electric Energy Visual Theme**:
* Slate-950 dark background with purple, indigo, and cyan energy glows.
* Subtle lightning animation accents on key CTAs, streak badges, and active navigation items.
* Red/Orange pulse specifically reserved for emergency/rescue states.

---

## 🔮 Future Enhancements
* iCal / Google Calendar export integration.
* Social study group accountability mode.
* Subject-specific AI quiz flashcard generation.

---

## 📄 License
ISC License. Built for self-healing productivity.
