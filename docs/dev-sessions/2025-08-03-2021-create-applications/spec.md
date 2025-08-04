# Application Management UI Specification

## Overview
Add comprehensive UI for creating, viewing, updating, and deleting applications in HackyStack. The main dashboard will serve as the primary application management interface.

## Main Dashboard (/)

### Empty State
- When user has no applications, display "Create Your First Application" call-to-action button
- Prominent, centered layout to guide new users

### Application Grid
- Display applications as cards in a 2x3 responsive grid layout (6 cards initially)
- Each card shows:
  - Application name
  - Truncated description
  - Health indicator (colored dot: green for healthy, red for unhealthy)
- Cards are clickable and navigate to application details page
- Use placeholder/mock health status for now

### Pagination & Loading
- Load 6 applications initially in 2x3 grid
- On scroll to bottom, load additional applications with skeleton loading cards
- Skeleton cards show blank card outline while loading next batch
- Infinite scroll pattern for smooth user experience

### Create Application Modal
- Triggered by "Create New Application" button
- Modal overlay with simple form:
  - Application name (required)
  - Description (optional)
- Cancel and Create buttons
- Form validation for required name field

## Application Details Page

### Layout & Navigation
- Appears as modal overlay on top of dashboard
- X button in top-right corner to close and return to dashboard
- Logo in header always navigates back to dashboard from any page

### Content Structure
1. **Header Section**
   - Editable application name (click to edit, save on Enter or blur)
   - Editable description (click to edit, save on blur or Ctrl/Cmd+Enter, supports newlines)

2. **Navigation Links**
   - Links to Secrets management (placeholder for future)
   - Links to Variables management (placeholder for future)

3. **Environments Section**
   - Grid of environment cards
   - Empty state with disabled "Add Your First Environment" call-to-action
   - Maintains UI consistency with main dashboard pattern

## CRUD Operations

### Create
- Modal form on dashboard for new applications
- Only name and description fields
- Environment setup handled in separate dev session

### Read
- Dashboard displays all user's applications
- Details page shows full application information
- Health indicators provide quick status overview

### Update
- Inline editing for name and description on details page
- Name: click to edit, save on Enter or blur
- Description: click to edit, save on blur or Ctrl/Cmd+Enter

### Delete
- Context menu (three dots) on application cards
- Delete option in context menu
- Confirmation modal before deletion
- No restrictions on deletion (delete allowed even with active deployments)

## Technical Notes
- Use existing API routes: `/api/applications`, `/api/applications/[id]`
- Health status will be placeholder/mock data for now
- Environments, secrets, and variables sections are UI previews only
- Modal routing should update URL but maintain overlay UX