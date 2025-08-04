# Application Management UI Implementation Plan

## Phase 1: Foundation Components

### Step 1: Create Reusable UI Components
**Context**: Build foundation components needed throughout the application UI.

**Prompt**:
```
Create the following reusable UI components for HackyStack:

1. **Modal Component** (`src/components/ui/modal.tsx`):
   - Overlay backdrop with click-to-close
   - Close button (X) in top-right corner
   - Support for title and children props
   - Accessible with proper focus management
   - Use Tailwind CSS for styling

2. **Button Component** (`src/components/ui/button.tsx`):
   - Primary, secondary, and danger variants
   - Loading state with spinner
   - Disabled state styling
   - Support for onClick handler and children

3. **Input Component** (`src/components/ui/input.tsx`):
   - Text input with label and error message support
   - Focus and validation states
   - Support for required field indicator

4. **Textarea Component** (`src/components/ui/textarea.tsx`):
   - Multi-line text input
   - Auto-resize functionality
   - Label and error message support

Make all components accessible and follow existing Tailwind design patterns from the current header component.
```

### Step 2: Application Card Component
**Context**: Core component for displaying applications in grid layout.

**Prompt**:
```
Create an ApplicationCard component (`src/components/application-card.tsx`) that displays:

1. Application name (truncated if too long)
2. Description (truncated to 2 lines)
3. Health indicator dot (green/red) - use mock data for now
4. Hover effects and click handling
5. Context menu (three dots) for delete action

Requirements:
- Click card to navigate to `/applications/[id]`
- Context menu shows on three-dots click
- Health dot: green for healthy, red for unhealthy (random for now)
- Responsive design that works in 2x3 grid
- Use existing Tailwind styles from the codebase

Include TypeScript interface for Application type based on the Prisma schema.
```

### Step 3: Skeleton Loading Component
**Context**: Loading states for smooth pagination experience.

**Prompt**:
```
Create a SkeletonCard component (`src/components/skeleton-card.tsx`) for loading states:

1. Same dimensions as ApplicationCard
2. Animated shimmer effect
3. Placeholder blocks for name, description, and health indicator
4. Smooth animation using Tailwind CSS

Use modern CSS animations and make it visually consistent with the ApplicationCard layout.
```

## Phase 2: Dashboard Implementation

### Step 4: Applications Data Hook
**Context**: API integration for fetching applications with pagination.

**Prompt**:
```
Create a custom hook (`src/hooks/use-applications.ts`) for managing applications data:

1. Fetch applications with pagination (6 per page)
2. Infinite scroll loading with SWR or React Query
3. Loading states and error handling
4. Create, update, delete operations
5. Optimistic updates for better UX

Use the existing API routes:
- GET /api/applications (with pagination params)
- POST /api/applications
- PUT /api/applications/[id]
- DELETE /api/applications/[id]

Include proper TypeScript types and error handling. Follow existing patterns in the codebase for API calls.
```

### Step 5: Create Application Modal
**Context**: Modal form for creating new applications.

**Prompt**:
```
Build CreateApplicationModal component (`src/components/create-application-modal.tsx`):

1. Use the Modal component from Step 1
2. Form with name (required) and description (optional)
3. Form validation and error handling
4. Integration with applications hook from Step 4
5. Loading state during creation
6. Success/error feedback

Requirements:
- Auto-focus on name field when modal opens
- Clear form on successful creation
- Close modal after successful creation
- Proper form validation with error messages
- Use the Button and Input components from Step 1
```

### Step 6: Empty State Component
**Context**: First-time user experience when no applications exist.

**Prompt**:
```
Create EmptyState component (`src/components/empty-state.tsx`):

1. Centered layout with illustration or icon
2. "Create Your First Application" heading
3. Descriptive text about applications
4. Primary CTA button to open create modal
5. Responsive design

Follow the existing design language from the header and use appropriate Tailwind spacing and typography.
```

### Step 7: Main Dashboard Page
**Context**: Complete dashboard implementation with all components integrated.

**Prompt**:
```
Update the main page (`src/app/page.tsx`) to implement the complete dashboard:

1. Integrate useApplications hook
2. Show EmptyState when no applications
3. Display ApplicationCard grid (2x3 layout)
4. Infinite scroll with SkeletonCard loading states
5. "Create New Application" button
6. CreateApplicationModal integration
7. Proper loading states and error handling

Requirements:
- Responsive grid that works on mobile/desktop
- Infinite scroll triggers at bottom of page
- Loading states during initial fetch
- Error boundary for API failures
- Integration with existing authentication from layout
```

## Phase 3: Application Details Implementation

### Step 8: Inline Edit Components
**Context**: Editable text components for application details.

**Prompt**:
```
Create inline editing components:

1. **EditableText** (`src/components/ui/editable-text.tsx`):
   - Click to edit functionality
   - Save on Enter or blur
   - Cancel on Escape
   - Loading state during save

2. **EditableTextarea** (`src/components/ui/editable-textarea.tsx`):
   - Click to edit for multi-line text
   - Save on blur or Ctrl/Cmd+Enter
   - Support for newlines
   - Auto-resize functionality

Both components should handle API calls for updating and show loading/error states.
```

### Step 9: Application Details Modal Layout
**Context**: Modal overlay structure for application details.

**Prompt**:
```
Create ApplicationDetailsModal component (`src/components/application-details-modal.tsx`):

1. Full-screen modal overlay over dashboard
2. Close button (X) in top-right corner
3. Header section with editable name and description
4. Navigation tabs/links for Secrets and Variables (disabled/placeholder)
5. Environments section with empty state
6. Integration with inline edit components from Step 8

Requirements:
- URL updates to /applications/[id] but maintains modal overlay
- Proper focus management and accessibility
- Responsive design for mobile/desktop
- Loading state while fetching application data
```

### Step 10: Application Details Page Route
**Context**: Next.js routing for application details with modal behavior.

**Prompt**:
```
Implement the application details route (`src/app/applications/[id]/page.tsx`):

1. Server-side application data fetching
2. Modal overlay behavior over dashboard
3. Integration with ApplicationDetailsModal
4. Proper error handling for invalid IDs
5. URL state management

Use Next.js App Router patterns and ensure the modal appears over the dashboard when navigating directly to the URL.
```

## Phase 4: Delete Functionality

### Step 11: Context Menu Component
**Context**: Three-dots menu for application actions.

**Prompt**:
```
Create ContextMenu component (`src/components/ui/context-menu.tsx`):

1. Three-dots trigger button
2. Dropdown menu with positioning
3. Delete option with danger styling
4. Click outside to close
5. Keyboard navigation support

Integrate this into the ApplicationCard component and add delete confirmation modal.
```

### Step 12: Delete Confirmation Modal
**Context**: Safety confirmation before deleting applications.

**Prompt**:
```
Create DeleteConfirmationModal component (`src/components/delete-confirmation-modal.tsx`):

1. Warning modal with application name
2. Clear confirmation message
3. Cancel and Delete buttons (danger styling)
4. Integration with applications hook for deletion
5. Loading state during deletion

Show application name in confirmation text and handle deletion with optimistic updates.
```

## Phase 5: Polish and Integration

### Step 13: Header Logo Navigation
**Context**: Update header to navigate to dashboard.

**Prompt**:
```
Update the Header component (`src/components/header.tsx`) to:

1. Make logo/title clickable
2. Navigate to dashboard (/) when clicked
3. Maintain existing styling and layout
4. Add proper hover states

Ensure this works from any page in the application.
```

### Step 14: Error Boundaries and Loading States
**Context**: Robust error handling and user feedback.

**Prompt**:
```
Add comprehensive error handling:

1. Error boundary component for application grid
2. Retry mechanisms for failed API calls
3. Toast notifications for success/error feedback
4. Proper loading states throughout the UI
5. Network error handling

Ensure graceful degradation and user-friendly error messages.
```

### Step 15: Final Integration and Testing
**Context**: Wire everything together and ensure smooth operation.

**Prompt**:
```
Complete the integration:

1. Test all CRUD operations work correctly
2. Verify routing and navigation flows
3. Ensure responsive design works on all screen sizes
4. Test infinite scroll and loading states
5. Verify accessibility features
6. Add any missing TypeScript types
7. Run linting and fix any issues

Make sure all components work together seamlessly and follow the existing code patterns in HackyStack.
```

## Technical Considerations

### API Integration
- Use existing `/api/applications` routes
- Implement proper error handling and loading states
- Add pagination support for infinite scroll
- Follow existing authentication patterns

### Styling Guidelines
- Use Tailwind CSS classes consistently
- Follow existing design patterns from header component
- Maintain responsive design principles
- Use proper semantic HTML and accessibility features

### State Management
- Use React hooks for local state
- SWR or React Query for server state
- Optimistic updates for better UX
- Proper error boundaries

### Performance
- Infinite scroll with pagination
- Skeleton loading states
- Proper memoization where needed
- Lazy loading for modals