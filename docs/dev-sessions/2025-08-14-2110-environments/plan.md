# Environment Management Implementation Plan

## Overview

This plan details the step-by-step implementation of environment management features for the HackyStack application. The implementation will be broken down into small, iterative chunks that build upon each other, ensuring no orphaned code and maintaining working functionality at each step.

## Architecture Analysis

### Existing Components
- **Database Schema**: Environment model already exists with relationships to secrets and variables
- **API Routes**: Basic GET and POST endpoints exist at `/api/applications/[id]/environments`
- **UI Framework**: Application details modal exists with environment section placeholder
- **Toast System**: Application-level toast notifications already implemented
- **Modals**: Modal system in place from application management

### Required Components
- Environment API endpoints (PUT, DELETE for `/api/environments/[id]`)
- Environment management UI components (list, create modal, edit modal, delete confirmation)
- Form validation for environment names
- Permission checks for EDITOR/OWNER roles
- Resource count display (secrets and variables)

## Implementation Phases

### Phase 1: API Foundation
Build robust API endpoints with proper validation and permission checks.

### Phase 2: UI Components
Create reusable modal components for environment operations.

### Phase 3: List Display
Implement the environment list with metadata display.

### Phase 4: Create Functionality
Add ability to create new environments with validation.

### Phase 5: Edit Functionality
Implement environment editing (description only).

### Phase 6: Delete Functionality
Add delete with resource dependency checks.

### Phase 7: Integration & Polish
Wire everything together with proper error handling and user feedback.

---

## Implementation Prompts

### Prompt 1: Enhance Environment API Validation

**Context**: The existing POST endpoint needs enhanced validation for environment names according to spec requirements.

**Task**: Update the POST endpoint in `/api/applications/[id]/environments/route.ts` to add:
1. Name validation: only lowercase letters (a-z), numbers (0-9), hyphens (-), and underscores (_)
2. Maximum length of 15 characters for names
3. Check for maximum 10 environments per application limit
4. Return appropriate error messages for each validation failure

**Code Location**: `/src/app/api/applications/[id]/environments/route.ts`

---

### Prompt 2: Create Environment API Update and Delete Endpoints

**Context**: Need individual environment management endpoints for update and delete operations.

**Task**: Create a new file `/api/environments/[id]/route.ts` with:
1. PUT endpoint to update environment description (name is immutable)
2. DELETE endpoint that checks for attached secrets/variables before deletion
3. Proper permission checks (EDITOR/OWNER for both operations)
4. Return 409 Conflict if deletion attempted with attached resources

**Code Location**: `/src/app/api/environments/[id]/route.ts` (new file)

---

### Prompt 3: Create Environment Types

**Context**: Need TypeScript types for environment data structures.

**Task**: Create types for environments in `/src/types/environment.ts`:
1. Environment type with id, name, description, createdAt, updatedAt
2. EnvironmentWithCounts type extending Environment with _count for secrets and variables
3. CreateEnvironmentInput and UpdateEnvironmentInput types for forms

**Code Location**: `/src/types/environment.ts` (new file)

---

### Prompt 4: Create useEnvironments Hook

**Context**: Need a React hook to manage environment state and API calls.

**Task**: Create `/src/hooks/use-environments.ts` with:
1. Fetch environments for an application
2. Create environment with optimistic updates
3. Update environment description
4. Delete environment with confirmation
5. Handle loading states and errors
6. Integration with existing toast system for notifications

**Code Location**: `/src/hooks/use-environments.ts` (new file)

---

### Prompt 5: Create Environment List Component

**Context**: Need to display environments in the application details modal.

**Task**: Create `/src/components/environment-list.tsx` that:
1. Displays environments in a table/list format
2. Shows name, description (truncated), creation date, modified date
3. Shows count of secrets and variables
4. Has Edit and Delete action buttons
5. Shows empty state when no environments exist
6. Includes "Add Environment" button (max 10 check)

**Code Location**: `/src/components/environment-list.tsx` (new file)

---

### Prompt 6: Create Environment Create Modal

**Context**: Need a modal for creating new environments.

**Task**: Create `/src/components/environment-create-modal.tsx` with:
1. Form with name (required) and description (optional) fields
2. Client-side validation for name format and length
3. Display validation errors inline
4. Save and Cancel buttons
5. Loading state during save
6. Integration with useEnvironments hook

**Code Location**: `/src/components/environment-create-modal.tsx` (new file)

---

### Prompt 7: Create Environment Edit Modal

**Context**: Need a modal for editing environment descriptions.

**Task**: Create `/src/components/environment-edit-modal.tsx` with:
1. Pre-populated form showing current values
2. Name field displayed but disabled (read-only)
3. Description field editable
4. Save and Cancel buttons
5. Loading state during save
6. Integration with useEnvironments hook

**Code Location**: `/src/components/environment-edit-modal.tsx` (new file)

---

### Prompt 8: Create Delete Confirmation Modal

**Context**: Need a confirmation modal for environment deletion.

**Task**: Create `/src/components/environment-delete-modal.tsx` with:
1. Warning message about deletion
2. Display environment name being deleted
3. Error message if resources are attached
4. Confirm and Cancel buttons
5. Loading state during deletion
6. Integration with useEnvironments hook

**Code Location**: `/src/components/environment-delete-modal.tsx` (new file)

---

### Prompt 9: Integrate Environment List into Application Details Modal

**Context**: The application details modal has a placeholder for environments that needs to be replaced with the actual list.

**Task**: Update `/src/components/application-details-modal.tsx` to:
1. Import and use the EnvironmentList component
2. Pass applicationId and user role to the list
3. Replace the empty state placeholder with the actual component
4. Ensure proper data fetching and state management

**Code Location**: `/src/components/application-details-modal.tsx`

---

### Prompt 10: Add Modal State Management to Environment List

**Context**: The environment list needs to manage modal states for create, edit, and delete operations.

**Task**: Update `/src/components/environment-list.tsx` to:
1. Add state for managing which modal is open
2. Add state for selected environment (for edit/delete)
3. Import and render the three modal components conditionally
4. Pass appropriate props to each modal
5. Handle modal open/close callbacks

**Code Location**: `/src/components/environment-list.tsx`

---

### Prompt 11: Add Permission-Based UI Controls

**Context**: UI elements should respect user roles (VIEWER can only view, EDITOR/OWNER can modify).

**Task**: Update environment components to:
1. Pass user role from application details modal through to environment list
2. Conditionally show/hide Add Environment button based on role
3. Conditionally show/hide Edit and Delete buttons based on role
4. Disable buttons appropriately for VIEWER role
5. Show read-only UI for viewers

**Code Location**: Multiple files - environment-list.tsx and application-details-modal.tsx

---

### Prompt 12: Testing and Error Handling

**Context**: Need to ensure robust error handling and user feedback.

**Task**: Review and enhance all components to:
1. Handle network errors gracefully with toast notifications
2. Show loading states during async operations
3. Validate all edge cases (empty strings, special characters)
4. Test permission boundaries
5. Ensure modals close properly after operations
6. Test the 10 environment limit
7. Test deletion blocking with attached resources

**Code Location**: All environment-related components and API routes

---

## Success Metrics

1. ✅ Users can create environments with valid names
2. ✅ Name validation prevents invalid characters and enforces limits
3. ✅ Maximum 10 environments per application is enforced
4. ✅ Deletion is blocked when resources are attached
5. ✅ Role-based access control works correctly
6. ✅ All operations provide toast notifications
7. ✅ UI updates immediately after operations
8. ✅ No orphaned code or broken functionality

## Notes

- Each prompt builds on the previous one
- No step introduces breaking changes
- The application remains functional after each step
- All code follows existing patterns in the codebase
- TypeScript types ensure type safety throughout