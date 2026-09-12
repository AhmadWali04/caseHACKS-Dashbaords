# CaseHacks Hacker Portal

A full-stack application for managing hackathon participants, from signup and applications to event scheduling and team management.

## 🚀 Tech Stack

- **Frontend:** React, Vite, TailwindCSS, Lucide Icons, React Router
- **Backend:** Python, Flask, Supabase Python SDK, PyJWT
- **Database & Auth:** Supabase (PostgreSQL, GoTrue)

---

## 🏗 Project Structure

```text
hacker_portal/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── Layout.jsx           # Main navigation and app shell
│   │   │   └── ProtectedRoute.jsx   # Auth & status-based routing logic
│   │   ├── contexts/       # React Contexts
│   │   │   └── AuthContext.jsx      # Supabase auth session management
│   │   ├── pages/          # Page components
│   │   │   ├── Auth.jsx             # Login/Signup via Magic Link
│   │   │   ├── Application.jsx      # Dynamic application form
│   │   │   ├── Dashboard.jsx        # User home: Announcements & Event check-ins
│   │   │   ├── Schedule.jsx         # Full event timeline
│   │   │   ├── Teams.jsx            # Team creation, joining, and management
│   │   │   └── Profile.jsx          # User profile and QR code for check-ins
│   │   ├── App.jsx         # Route definitions
│   │   └── main.jsx        # Entry point with AuthProvider
│   └── package.json
├── server/                 # Flask Backend
│   ├── app.py              # Main API routes and logic
│   ├── auth.py             # JWT validation decorator
│   ├── .env                # Secrets (Supabase URL, Keys, JWT Secret)
│   └── requirements.txt    # Python dependencies
└── .gitignore
```

---

## 📂 File Directory & Descriptions

### 🖥 Frontend (`client/src/`)

#### 🏗 Core Components
- **`App.jsx`**: Main router configuration; defines all public and protected routes.
- **`main.jsx`**: Application entry point; initializes React and wraps the app in the `AuthProvider`.
- **`supabaseClient.js`**: Initializes the Supabase client for frontend interaction with Auth and Database.

#### 🧱 Components (`components/`)
- **`Layout.jsx`**: The main application shell. Contains the sidebar, top navigation, and responsive mobile menu.
- **`ProtectedRoute.jsx`**: High-order component that handles authentication and conditional routing based on a user's application status (e.g., redirecting to `/application` if they haven't applied).

#### 🧪 Contexts (`contexts/`)
- **`AuthContext.jsx`**: Manages the user's Supabase session. Listens for auth state changes and triggers the backend user record creation on signup.

#### 📄 Pages (`pages/`)
- **`Auth.jsx`**: The login and registration gateway. Handles Magic Link requests and captures user names for new accounts.
- **`Application.jsx`**: The dynamic application form. Fetches questions from Supabase and handles the submission process.
- **`Dashboard.jsx`**: The home view for accepted hackers. Features announcements and check-in history.
- **`Schedule.jsx`**: A full timeline of events, locations, and times.
- **`Teams.jsx`**: Interface for creating teams, searching for existing ones, and managing team membership.
- **`Profile.jsx`**: Personal profile management, including QR code generation for event check-ins.

### ⚙ Backend (`server/`)

- **`app.py`**: The primary Flask application. Contains all API endpoints for users, applications, teams, events, and announcements.
- **`auth.py`**: Contains the `token_required` decorator for JWT validation. Ensures that only requests with a valid Supabase session token can access protected routes.
- **`supabase_client.py`**: Initializes the Supabase Python client using service role keys for backend operations.
- **`requirements.txt`**: Lists all Python dependencies required for the backend (Flask, PyJWT, Supabase SDK).
- **`.env`**: Stores sensitive environment variables like API keys and the Supabase JWT secret.

---

## 💻 Portal Features

### 1. Dashboard & Announcements
- **Real-time Updates**: Displays the latest announcements from organizers.
- **Event Highlights**: Shows upcoming events from the schedule.
- **Check-in Summary**: Track which events the user has successfully checked into.

### 2. Team Management (`Teams.jsx`)
- **Create/Join Teams**: Hackers can create new teams or join existing ones using team names.
- **Team Discovery**: List of teams looking for members with specific skills.
- **Team Chat/Links**: Centralized place for team-specific resources.

### 3. Schedule & Check-ins (`Schedule.jsx`)
- **Full Timeline**: Complete list of workshops, meals, and activities.
- **Location Mapping**: Specific rooms or links for every event.
- **Attendance**: Integrated with the check-in system.

### 4. Hacker Profile (`Profile.jsx`)
- **QR Code**: Every user has a unique QR code used by organizers for event check-ins.
- **Skill Tracking**: Manage GitHub, LinkedIn, and Portfolio links.
- **Points System**: Track points earned through event attendance and participation.

---

## 🔐 Authentication & Onboarding Flow

1.  **Signup/Login**: Users enter their email (and name for signup) on the `/login` page. A Supabase Magic Link is sent.
2.  **Session Management**: `AuthContext` catches the session. If it's a new signup, it calls the backend to create a `users` table record with a `null` status.
3.  **Conditional Routing**: `ProtectedRoute` checks the user's status:
    - **`status is null`**: Redirected to `/application`.
    - **`status is 'pending' | 'waitlisted' | 'rejected'`**: Shown a status-specific message (Hacker Portal pages are locked).
    - **`status is 'accepted'`**: Full access to Dashboard, Schedule, Teams, and Profile.

---

## 📝 Application System

The portal uses a highly dynamic application system controlled entirely through the database.

### Dynamic Questions
Instead of hardcoded forms, `Application.jsx` fetches questions from the `application_questions` table. It supports:
- **Types**: `text`, `long_text`, `number`, `multiple_choice`, `checkbox`, `url`.
- **Validation**: Respects `is_required` and `sort_order`.

### Field Mapping (`field_key`)
To sync application data to the user's profile, questions can be tagged with a `field_key` (e.g., `school`, `year`, `resume_url`, `dietary`).
- When a user submits, the backend saves the full application to `application_answers`.
- It also automatically maps any answer with a `field_key` directly to the corresponding column in the `users` table.

---

## 🛠 Features

### Implemented & Functional
- **Magic Link Auth**: Secure, passwordless entry.
- **Role-Based Access**: Internal checks for `hacker` vs `organizer` roles (ready for admin features).
- **Dynamic Application**: Easily change hackathon questions without touching code.
- **Profile Sync**: Key information flows from the application directly to the hacker's profile.
- **Secure API**: Backend routes are protected by JWT validation using the Supabase JWT secret.
- **Status-Based Navigation**: Mobile and desktop menus update based on user authentication.

### Database Tables (Public Schema)
- `users`: Core profile data and portal access status.
- `applications`: Metadata for each submission.
- `application_questions`: The bank of questions for the form.
- `application_answers`: Individual responses linked to applications and questions.
- `events`: Schedule items for the hackathon.
- `announcements`: Global updates for participants.
- `teams`: Hacker team management.

---

## 🛠 Setup & Development

### Backend
1. `cd server`
2. `python -m venv venv`
3. `source venv/bin/activate`
4. `pip install -r requirements.txt`
5. Configure `.env` with Supabase credentials.
6. `python app.py`

### Frontend
1. `cd client`
2. `npm install`
3. `npm run dev`

---

## ⚠️ Important Environment Variables
| Variable | Description |
| :--- | :--- |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Supabase Service Role Key (Backend) or Anon Key (Frontend) |
| `SUPABASE_JWT_SECRET` | Used for validating auth tokens on the backend |
