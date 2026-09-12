# CaseHacks Organizer Dashboard

This is the internal dashboard for CaseHacks organizers to manage various aspects of the hackathon. The application is built with Next.js and uses Supabase for the backend.

## Features

- **Authentication**: Organizers can request access and sign in. Access to the dashboard is restricted to approved organizers.
- **Admin Approval**: A specific admin user can approve or revoke organizer access.
- **Dashboard**: A central hub displaying key stats like total check-ins, participants, and events for the day. It also shows a list of recent check-ins.
- **QR Code Scanner**: Organizers can scan user QR codes to check them into specific events.
- **Hacker Profiles**: View a list of all hackers and their detailed profiles.
- **Application Questions**: Manage the questions on the hacker application form, including creating, editing, deleting, and reordering them. Questions can be mapped to specific fields in the user's profile.
- **Event Management**: Create, edit, and delete events.

## Project Structure

The application is a Next.js project with the following structure:

- `app/`: Contains all the routes and UI components.
  - `admin/`: Admin-specific features.
    - `approve/`: Page for approving organizers.
  - `components/`: Shared UI components like the Navbar and QR Scanner.
  - `dashboard/`: Organizer-only routes.
    - `hackers/`: Pages for listing and viewing hacker profiles.
    - `questions/`: Page for managing application questions.
  - `events/`: Page for managing events.
  - `login/`: Login page.
  - `signup/`: Signup/request access page.
  - `scan/`: Page for scanning QR codes.
- `lib/`: Contains helper functions and Supabase client initializers.
- `middleware.ts`: Handles authentication and authorization for all routes.

## Key Files

- **`middleware.ts`**: Protects routes based on user authentication and role (organizer, admin).
- **`app/layout.tsx`**: The root layout for the application, includes the main navbar.
- **`app/page.tsx`**: The public landing page with links to sign in or request access.
- **`app/dashboard/page.tsx`**: The main dashboard page for organizers.
- **`app/admin/approve/page.tsx`**: The UI for the admin to manage organizer approvals.
- **`app/dashboard/hackers/page.tsx`**: Displays a list of all hackers.
- **`app/dashboard/hackers/[hackerId]/page.tsx`**: Displays the detailed profile of a single hacker.
- **`app/dashboard/questions/page.tsx`**: The main page for managing application questions, using the `QuestionList` component.
- **`app/events/page.tsx`**: The page for managing events.
- **`app/scan/page.tsx`**: The page with the QR code scanner for event check-ins.

## Setup

1.  **Clone the repository.**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up environment variables:**
    Create a `.env.local` file in the root of the project and add the following variables. You can get these from your Supabase project settings.

    ```
    NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
    SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
    ADMIN_APPROVER_EMAIL=your-admin-email@example.com
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:3000`.
