# Environment Management Specification

## Overview
Basic creation and management of environments within the application detail view. Environments represent deployment targets (dev, staging, production) that belong to Applications and can have secrets and variables attached to them.

## Core Requirements

### Environment Properties
- **Name** (required)
  - Unique within the application
  - Allowed characters: lowercase letters (a-z), numbers (0-9), hyphens (-), and underscores (_)
  - Maximum length: 15 characters
- **Description** (optional)
  - Free text field for additional context
- **Metadata** (system-generated)
  - Creation date
  - Last modified date
  - Count of attached secrets
  - Count of attached variables

### Operations

#### Create Environment
- Available to users with EDITOR or OWNER role
- Triggered via modal dialog
- Fields: name (required), description (optional)
- Validation: name uniqueness and format rules
- Maximum 10 environments per application
- Success feedback via toast notification

#### Edit Environment
- Available to users with EDITOR or OWNER role
- Triggered via modal dialog
- Editable fields: description only (name is immutable to prevent deployment issues)
- Success feedback via toast notification

#### Delete Environment
- Available to users with EDITOR or OWNER role
- Prevent deletion if environment has attached secrets or variables
- Show confirmation dialog before deletion
- Error message if deletion blocked due to attached resources
- Success feedback via toast notification

### User Interface

#### Location
- Integrated into existing application detail view at `/applications/[id]`
- Environments section already exists in the UI

#### Display Format
- List/table view showing all environments
- Columns:
  - Environment name
  - Description (truncated if long)
  - Creation date
  - Last modified date
  - Number of secrets
  - Number of variables
  - Actions (Edit, Delete buttons)

#### Modals
- **Create Environment Modal**
  - Form fields: name, description
  - Save and Cancel buttons
  - Client-side validation with error messages
  
- **Edit Environment Modal**
  - Pre-populated with current values
  - Description field editable
  - Name field displayed but disabled
  - Save and Cancel buttons
  
- **Delete Confirmation Modal**
  - Warning message
  - Confirm and Cancel buttons

### Permissions
- **VIEWER role**: Can view environments and their details only
- **EDITOR role**: Can create, edit, and delete environments
- **OWNER role**: Can create, edit, and delete environments

### API Endpoints
Utilize existing RESTful API structure:
- `GET /api/applications/[id]/environments` - List environments
- `POST /api/applications/[id]/environments` - Create environment
- `GET /api/environments/[id]` - Get environment details
- `PUT /api/environments/[id]` - Update environment
- `DELETE /api/environments/[id]` - Delete environment

### Error Handling
- **Validation errors**: Display inline in modal forms
- **Deletion blocked**: Toast notification explaining attached resources
- **Maximum environments reached**: Toast notification when trying to create 11th environment
- **Network errors**: Toast notification with generic error message

### Database Considerations
- Environments table already exists in schema
- Relationships with secrets and variables tables via foreign keys
- Cascade rules should prevent orphaned resources

### Success Criteria
1. Users can successfully create environments with valid names
2. Name validation prevents invalid characters and duplicates
3. Environment limit of 10 is enforced
4. Deletion is blocked when resources are attached
5. Appropriate role-based access control is enforced
6. All actions provide clear user feedback via toast notifications
7. UI updates reflect changes immediately after operations