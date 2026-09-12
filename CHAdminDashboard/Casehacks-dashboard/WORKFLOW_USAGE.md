# GitHub Issues Workflow - Usage Guide

## Overview

This project includes a GitHub Actions workflow that automatically creates all 25 issues needed to complete the CaseHacks Organizer Dashboard.

## Files

- `.github/workflows/create-issues.yml` - The workflow file (contains all issues)

## How to Use

### Prerequisites

1. Push your code to GitHub (create a repository first)
2. Make sure you have Actions enabled in your repository settings

### Steps

1. **Push the workflow files to GitHub:**
   ```bash
   git add .github/
   git commit -m "Add GitHub issues workflow"
   git push origin main
   ```

2. **Run the workflow:**
   - Go to your GitHub repository
   - Click on the "Actions" tab
   - Click on "Create GitHub Issues" workflow in the left sidebar
   - Click "Run workflow" button (top right)
   - Click the green "Run workflow" button in the dropdown
   - Wait ~30 seconds for it to complete

3. **Check your issues:**
   - Go to the "Issues" tab
   - You should see all 25 issues created with proper labels

## What Gets Created

### Labels (10 total)
- **Priority Labels:** P0-critical, P1-high, P2-medium, P3-low
- **Type Labels:** backend, frontend, fullstack
- **Phase Labels:** phase-1, phase-2, phase-3

### Issues (25 total)

#### Phase 1: Core MVP (16 issues, ~69 hours)
1. Database Schema Setup & Migrations (8h)
2. Authentication System - Backend (5h)
3. Authentication System - Frontend (6h)
4. Dashboard Sidebar & Navigation (5h)
5. Events API Endpoints (4h)
6. Events Management Page (6h)
7. Check-in API Endpoints (4h)
8. QR Scanner Component (6h)
9. Check-in Monitor - Frontend (5h)
10. Real-time Check-in Subscriptions (4h)
11. Generate Test Users & QR Codes (3h)
12. UI Polish & Responsive Design (5h)
13. Error Handling & Validation (4h)
14. End-to-End Testing (5h)
15. Production Deployment (3h)
16. Documentation & README (2h)

#### Phase 2: Enhanced Features (5 issues, ~20 hours)
17. Announcements System - Backend (3h)
18. Announcements Management Page (4h)
19. Teams Management - Backend (4h)
20. Teams Management Page (5h)
21. Participants List Page (4h)

#### Phase 3: Advanced Features (4 issues, ~20 hours)
22. Admin Tools - Bulk Operations (5h)
23. Analytics Dashboard (6h)
24. Enhanced Event Management (4h)
25. Audit Logs & Activity Tracking (5h)

## Customizing Issues

To modify the issues:

1. Edit `.github/workflows/create-issues.yml`
2. Find the `const issues = [...]` array in the "Create Issues" step
3. Each issue object has:
   - `title` - Issue title (string)
   - `labels` - Array of label names
   - `body` - Issue description (supports Markdown, use backticks for multi-line)
4. Push changes to GitHub
5. Re-run the workflow

## Troubleshooting

### Workflow fails with "Permission denied"
- Go to Settings → Actions → General
- Scroll to "Workflow permissions"
- Select "Read and write permissions"
- Click Save

### Duplicate labels error
- Labels are only created once
- Re-running the workflow will skip existing labels

### Issues not created
- Check the Actions log for error messages
- Check that you have permission to create issues
- Ensure the workflow file syntax is valid

## Issue Structure

Each issue includes:
- **Description:** What needs to be built
- **Tasks:** Checklist of implementation steps
- **Estimate:** Time estimate in hours
- **Dependencies:** Which issues must be completed first
- **Acceptance Criteria:** Definition of done

## Development Flow

### Week 1: Phase 1 Core (Issues #1-7)
Focus on foundational infrastructure
- Database and authentication
- Basic UI structure
- Core APIs

### Week 2: Phase 1 Completion (Issues #8-16)
Complete the MVP
- QR scanning functionality
- Real-time features
- Polish and deployment

### Week 3-4: Phase 2 (Issues #17-21)
Add enhanced features
- Announcements system
- Teams management
- Participants view

### Week 5+: Phase 3 (Issues #22-25)
Advanced features (optional)
- Bulk operations
- Analytics
- Audit logs

## Tips

1. **Start with Phase 1:** These are the critical MVP features
2. **Follow dependencies:** Some issues depend on others being completed first
3. **Close issues as you go:** Check them off when done
4. **Reference issues in commits:** Use `#1`, `#2`, etc. in commit messages
5. **Link PRs to issues:** Mention "Closes #1" in PR descriptions

## Total Project Scope

- **Total Issues:** 25
- **Total Estimated Time:** ~109 hours
- **Team Size:** 2-3 developers recommended
- **Timeline:** 3-5 weeks for full scope
- **MVP Timeline:** 2 weeks for Phase 1 only

---

**Ready to start?** Run the workflow and begin with Issue #1! 🚀
