# DTI Lab Academic Portal - Production Ready Implementation Guide

## Overview
This is a complete Firebase-based academic project portal for Lendi Institute's ECE Digital Thinking and Innovation Lab.

## Current Status
- ✅ Firebase Configuration (firebase.js) - Complete
- ✅ CSS Styling (style.css) - Complete and responsive
- ✅ Authentication Module (auth.js) - Ready
- ✅ Projects Display Module (projects.js) - Ready with filtering
- ⏳ Project Submission Module (submit.js) - To be completed
- ⏳ Admin Dashboard Module (admin.js) - To be completed
- ⏳ All HTML pages - To be updated

## Architecture

### Frontend Structure
```
index.html          - Home page (complete)
projects.html       - Project listing with filters (complete)
submit.html         - Project submission form (to update)
login.html          - Authentication (to complete)
admin.html          - Admin dashboard (to complete)
about.html          - About page (to complete)

CSS/
  style.css         - Unified responsive stylesheet (complete)

js/
  firebase.js       - Firebase initialization (complete)
  auth.js           - Authentication logic (ready)
  projects.js       - Project display & filtering (ready)
  submit.js         - File upload & submission (to complete)
  admin.js          - Admin panel (to complete)
```

### Firebase Structure

#### Authentication
- Firebase Auth (email/password)
- Session stored in localStorage

#### Firestore Collections

**projects/{projectId}**
```
{
  title: string,
  description: string,
  domain: string (VLSI, IoT, AI, Signal Processing, Antennas, Quantum, Other),
  academicYear: string,
  batch: string,
  teamName: string,
  teamLeader: string,
  teamMembers: [{name: string, regNumber: string}],
  technologiesUsed: [string],
  status: "pending" | "approved" | "rejected",
  submittedAt: timestamp,
  submittedBy: uid,
  reportUrl: string,
  prototypeImageUrl: string,
  videoUrl: string,
  groupPhotoUrl: string
}
```

**projects/{projectId}/feedback/{feedbackId}**
```
{
  name: string,
  text: string,
  timestamp: timestamp
}
```

**admins/{adminId}**
```
{
  uid: string,
  email: string,
  name: string,
  role: "admin"
}
```

**users/{userId}**
```
{
  email: string,
  role: "Student" | "Admin",
  displayName: string,
  lastLogin: timestamp
}
```

#### Firebase Storage Structure
```
/projects/{projectId}/
  groupPhoto/          - Team photo
  report/report.pdf    - Project report
  prototype/           - Prototype image
  video/              - Demo video
```

## Key Features Implemented

### 1. Home Page (index.html)
- Header with logo, college name, navigation
- Hero section with college building image
- Department about section
- Key highlights list
- Leadership cards (Principal, HOD)
- Contact information
- Footer with social links
- Fully responsive design
- Mobile menu toggle

### 2. Projects Page (projects.html)
- Display all approved projects in a responsive grid
- Filters:
  - Domain (VLSI, IoT, AI, Signal Processing, etc.)
  - Academic Year (auto-generated from projects)
  - Batch (auto-generated from projects)
  - Search bar (title, student name, reg number)
- Project Cards display:
  - Prototype image
  - Domain tag
  - Project title
  - Team name
  - Year & Batch
  - Description snippet
  - Download PDF report button
  - View Details button
  - Prototype image/video
  - Comments section

### 3. Project Submission (submit.html) - READY TO BUILD
- Login required (Firebase Auth)
- Form Fields:
  - Project Title (required)
  - Description (required)
  - Domain dropdown (required)
  - Academic Year (required)
  - Batch (required)
  - Team Name (required)
  - Team Leader Email (required)
  - Dynamic team members (add/remove)
  - Technologies Used
  - Project Details
  - File Uploads:
    - Project Report (PDF, DOC, DOCX)
    - Demo/Presentation
    - Additional files (multiple)
  - Upload progress indicator

### 4. Login Page (login.html) - READY TO BUILD
- Role selector (Student/Admin)
- Email & password fields
- Firebase Auth integration
- Error messaging
- Redirect to appropriate dashboard

### 5. Admin Dashboard (admin.html) - READY TO BUILD
- Admin-only access
- Project listing (all statuses)
- Search by title/student
- Filter by status (Pending, Approved, Rejected)
- Approval/Rejection workflow
- View full project details
- Logout button

### 6. About Page (about.html)
- Institutional information
- Department details
- Editable content blocks
- Faculty information

## CSS Specifications

### Color Scheme
- Primary: #003366 (Deep Navy Blue)
- Accent: #0077c8 (Bright Cyan Blue)
- Muted: #6b7280 (Gray for secondary text)
- Background: #f8fafc (Light background)
- Card Background: #ffffff (White)
- Border: #e6edf3 (Light gray)
- Text Dark: #0f172a

### Layout
- Max container width: 1100px
- Responsive breakpoints:
  - 900px: Single column grid
  - 720px: Mobile optimized
- Uses CSS Grid and Flexbox

### Typography
- Font: Inter (Google Fonts)
- Weights: 300, 400, 600, 700, 800

## Setup Instructions

### 1. Firebase Setup
1. Go to https://console.firebase.google.com
2. Create a new project or use existing: "dti-lab-project-portal"
3. Copy config from Project Settings
4. Replace in `js/firebase.js`

### 2. Create Collections in Firestore
Run these in Firebase Console (Firestore):

```
Collections to create:
- projects (auto-created when first document added)
- admins (for admin users)
- users (for user profiles)
```

### 3. Create Admin User
1. In Firebase Console, create a user account with admin email
2. In Firestore, add document to admins collection:
   - Document ID: admin's UID
   - Fields: { uid: "...", email: "...", name: "...", role: "admin" }

### 4. Enable Authentication Methods
In Firebase Console > Authentication:
- Enable Email/Password provider
- Set password policy to allow weak passwords for development

### 5. Firestore Security Rules
```firebase
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Approved projects - publicly readable
    match /projects/{projectId} {
      allow read: if resource.data.status == "approved";
      allow read: if request.auth.uid == resource.data.submittedBy;
      allow create: if request.auth != null && request.auth.token.email_verified;
      allow update, delete: if request.auth.uid == resource.data.submittedBy && resource.data.status == "pending";
    }
    
    // Feedback/comments on projects
    match /projects/{projectId}/feedback/{feedbackId} {
      allow read: if parent.read();
      allow create: if request.auth != null;
      allow delete: if request.auth.uid == resource.data.userId;
    }
    
    // Admin checks
    match /admins/{adminId} {
      allow read: if request.auth.uid == adminId;
      allow write: if false;
    }
    
    // User profiles
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow read: if request.auth.uid != null;
    }
  }
}
```

### 6. Firebase Storage Rules
```firebase
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /projects/{projectId}/upload/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## File Naming Convention

Old files are kept for reference:
- projects.js → projects-NEW.js
- auth.js → auth-NEW.js
- projects.html → projects-NEW.html

To activate new versions:
1. Delete old files
2. Rename new files (remove -NEW suffix)
3. Update HTML script references

## Development Workflow

1. **Create Account**: Register on login page as Student or Admin
2. **Submit Project**: Fill form, upload files, submit
3. **Admin Approval**: Admin logs in, reviews pending projects, approves/rejects
4. **View Published**: Approved projects visible to all on Projects page

## Deployment

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Custom Domain
In Firebase Console > Hosting > Connect a domain

## Troubleshooting

### Projects Not Loading
- Check Firestore has documents with status: "approved"
- Verify Firebase config in firebase.js
- Check browser console for errors

### File Upload Failed
- Verify Firebase Storage enabled
- Check file size limits
- Verify storage rules

### Admin Access Denied
- Verify user UID in admins collection
- Check Firestore security rules
- Verify user account created in Firebase Auth

## Next Steps

1. ✅ Complete Submit Project Page (submit.js & submit.html)
2. ✅ Complete Admin Dashboard (admin.js & admin.html)
3. ✅ Implement file upload to Firebase Storage
4. ✅ Test end-to-end workflow
5. ✅ Deploy to Firebase Hosting
6. ✅ Configure custom domain
7. ✅ Set up SSL certificate

## Support & Contact

For issues or questions:
- Email: principal@lendi.edu.in
- Phone: 9490344747
- Web: www.lendi.edu.in

---
Last Updated: February 22, 2024
Version: 1.0.0 Beta
