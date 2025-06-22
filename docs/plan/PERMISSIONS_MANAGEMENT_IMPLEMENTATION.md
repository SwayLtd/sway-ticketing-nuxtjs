# Event Permissions Management Implementation Plan

## Overview
Implementation of a permissions management page for events at `/admin/event/[id]/permissions` that allows administrators and managers to manage user permissions for specific events.

## Permission Levels
- **Level 1**: User - Read-only access
- **Level 2**: Manager - Can manage users, cannot manage managers/admins
- **Level 3**: Admin - Can manage all permission levels

## Database Schema
- **Table**: `user_permissions`
- **Fields**:
  - `user_id` (references users.id)
  - `entity_type` ('event')
  - `entity_id` (event ID)
  - `permission_level` (1, 2, or 3)

## User Interface Components

### 1. Header Section
- Page title: "Gestion des permissions"
- Event context information
- Add user button (permission-dependent)

### 2. Permissions Overview Cards
- Total users with access
- Admins count
- Managers count
- Regular users count

### 3. Users Table
- User information (name, email)
- Current permission level
- Actions (edit/remove based on user's permission level)
- Search and filter functionality

### 4. Add User Modal
- Search for users from `users` table
- Select permission level
- Add permission confirmation

### 5. Edit Permission Modal
- Change user's permission level
- Remove user permission

## Permission Rules Implementation

### Admin (Level 3)
- Can add/remove admins, managers, and users
- Can modify any permission level
- Full access to all features

### Manager (Level 2)
- Can add/remove only users (level 1)
- Cannot modify admins or managers
- Limited access based on permission level

### User (Level 1)
- Cannot add/remove any users
- Read-only access to permissions list

## API Functions Required

### 1. Fetch Event Permissions
```javascript
async function fetchEventPermissions(eventId)
```

### 2. Fetch Available Users
```javascript
async function fetchAvailableUsers(eventId)
```

### 3. Add User Permission
```javascript
async function addUserPermission(userId, eventId, permissionLevel)
```

### 4. Update User Permission
```javascript
async function updateUserPermission(userId, eventId, newPermissionLevel)
```

### 5. Remove User Permission
```javascript
async function removeUserPermission(userId, eventId)
```

### 6. Check Current User Permission
```javascript
async function getCurrentUserPermission(eventId)
```

## UI/UX Features

### Design Consistency
- Follow existing design patterns from tickets.vue and orders/index.vue
- Use daisyUI components with Tailwind CSS
- Responsive design for mobile and desktop

### Interactive Elements
- Search functionality for users
- Permission level badges with color coding
- Confirmation modals for destructive actions
- Loading states and error handling

### Accessibility
- ARIA labels for screen readers
- Keyboard navigation support
- Color contrast compliance

## Security Considerations

### RLS Policy Compliance
- Respect existing Row Level Security policies
- Validate user permissions before any action
- Prevent privilege escalation attempts

### Input Validation
- Validate permission levels (1, 2, 3)
- Verify user exists in users table
- Check entity_type and entity_id constraints

## Error Handling

### User Feedback
- Success notifications for actions
- Error messages for failed operations
- Loading states during API calls

### Edge Cases
- User already has permission
- Invalid permission level
- Network connectivity issues
- Unauthorized access attempts

## Implementation Steps

1. **Create the base page structure** with admin-event layout
2. **Implement permission checking** for current user
3. **Create the permissions overview section** with statistics cards
4. **Build the users table** with search and filtering
5. **Implement the add user modal** with user search
6. **Create edit/remove permission modals**
7. **Add API functions** for CRUD operations
8. **Implement permission-based UI rendering**
9. **Add comprehensive error handling**
10. **Test all permission level scenarios**

## File Structure
```
pages/admin/event/[id]/permissions.vue - Main permissions management page
```

## Dependencies
- Vue 3 Composition API
- Nuxt 3
- Supabase client
- daisyUI components
- Tailwind CSS
- AdminNotification component (for feedback)

## Testing Scenarios
- Admin managing all permission levels
- Manager managing only users
- User with read-only access
- Permission escalation prevention
- Edge cases and error conditions
