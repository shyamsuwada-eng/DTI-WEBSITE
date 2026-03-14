# 🏛️ DTI Lab Academic Portal

**Lendi Institute of Engineering & Technology – ECE Digital Thinking and Innovation Lab**

A modern, responsive Firebase-based web platform for managing academic project submissions, approvals, and public browsing.

## Features

### 🏠 Home Page
- Professional header with college branding
- Hero section with institutional imagery
- Department information and highlights
- Leadership profiles (Principal, HOD)
- Contact information and social links
- Fully responsive design

### 📚 Projects Repository
- Browse all approved projects from students
- Filter by:
  - **Domain** (VLSI, IoT, AI, Signal Processing, Antennas, Quantum, etc.)
  - **Academic Year** (auto-populated from projects)
  - **Batch** (auto-populated from projects)
- **Search** by project title, student name, or registration number
- View detailed project information
- Download project reports (PDF, DOC, DOCX)
- View prototype images and demo videos
- **Comments section** for peer feedback

### ✍️ Project Submission
- **Login required** (Firebase Authentication)
- Comprehensive project form:
  - Project title and detailed description
  - Domain/technology category selection
  - Academic year and batch information
  - Team information (team name + dynamic team members)
  - Technologies used (comma-separated)
  - **File uploads:**
    - Group photo (JPG, PNG)
    - Project report (PDF, DOC, DOCX)
    - Prototype image
    - Demo video
- **Progress indicator** during submission
- Automatic data storage in Firestore with "pending" status

### 👤 Student Authentication
- Email/password login via Firebase Auth
- Automatic role detection (Student/Admin)
- Session management with localStorage
- Secure token-based authentication

### 👨‍💼 Admin Dashboard
- **Admin-only access** (verified against Firestore admins collection)
- View all submitted projects (all statuses)
- Search and filter by:
  - Project title/student name
  - Submission status (Pending, Approved, Rejected)
- **Approve/Reject projects** with optional feedback
- Download project files from dashboard
- Delete projects if needed
- Logout functionality

### 📋 About Page
- Institutional information
- Department details
- Faculty information
- Contact methods

## Technology Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Responsive design with CSS Grid & Flexbox
- **JavaScript ES6+** - Modular code with imports
- **Google Fonts** - Professional typography (Inter)

### Backend & Services
- **Firebase Authentication** - Secure user login
- **Firestore Database** - Real-time NoSQL database
- **Firebase Storage** - File upload and management
- **Firebase Hosting** - Production deployment

### Browser Compatibility
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Architecture

### Database Schema

```
projects/{projectId}
├── title: string
├── description: string
├── domain: string
├── academicYear: string
├── batch: string
├── teamName: string
├── teamLeader: string
├── teamMembers: [{name, regNumber}]
├── status: "pending"|"approved"|"rejected"
├── submittedAt: timestamp
├── submittedBy: uid
├── reportUrl: string (Storage URL)
├── prototypeImageUrl: string (Storage URL)
├── videoUrl: string (Storage URL)
├── groupPhotoUrl: string (Storage URL)
└── feedback/{feedbackId}
    ├── name: string
    ├── text: string
    └── timestamp: timestamp

admins/{adminId}
├── uid: string
├── email: string
├── name: string
└── role: "admin"

users/{userId}
├── email: string
├── role: "Student"|"Admin"
├── displayName: string
└── lastLogin: timestamp
```

### Storage Structure

```
/projects/{projectId}/
├── groupPhoto/[filename]
├── report/[filename]
├── prototype/[filename]
└── video/[filename]
```

## Color Scheme

- **Primary Blue:** #003366 (Deep Navy)
- **Accent Blue:** #0077c8 (Bright Cyan)
- **Text:** #0f172a (Dark)
- **Muted:** #6b7280 (Gray)
- **Background:** #f8fafc (Light)
- **White:** #ffffff (Card background)

## Getting Started

### Prerequisites
- Google/Firebase account (free)
- Modern web browser
- Firebase project set up

### Installation

1. **Create Firebase Project**
   ```bash
   # Go to https://console.firebase.google.com
   # Create new project "dti-lab-project-portal"
   ```

2. **Update Configuration**
   - Copy Firebase config from Project Settings
   - Paste into `js/firebase.js`

3. **Set Up Firestore**
   - Enable Firestore Database
   - Create collections: `projects`, `admins`, `users`
   - Apply security rules from DEPLOYMENT_GUIDE.md

4. **Configure Authentication**
   - Enable Email/Password auth
   - Create test user accounts

5. **Enable Firebase Storage**
   - Create storage bucket
   - Apply upload rules

6. **Deploy**
   ```bash
   firebase init hosting
   firebase deploy
   ```

## File Structure

```
index.html              # Home page
projects.html          # Project browsing
submit.html            # Student submission form
login.html             # Authentication
admin.html             # Admin dashboard
about.html             # About page

CSS/
  style.css            # Unified responsive stylesheet (600+ lines)

js/
  firebase.js          # Firebase initialization & exports
  auth.js              # Login & session management
  projects.js          # Project display & filtering
  submit.js            # File upload & form submission
  admin.js             # Admin dashboard logic

assets/
  fonts/               # Custom fonts (if any)
  icons/               # Icon files
  images/              # Hero images, etc.

IMPLEMENTATION_GUIDE.md # Detailed feature documentation
DEPLOYMENT_GUIDE.md    # Step-by-step deployment instructions
README.md              # This file
```

## Usage

### For Students
1. **Browse Projects:** Visit `projects.html` to see approved projects
2. **Submit Project:** 
   - Navigate to `submit.html`
   - Log in with your email
   - Fill the comprehensive form
   - Upload supporting files
   - Submit for admin review
3. **Track Status:** Log back in to see project status

### For Administrators
1. **Access Dashboard:** Go to `admin.html`
2. **Log In:** Use admin credentials
3. **Review Projects:** See pending submissions
4. **Approve/Reject:** Make approval decisions
5. **Manage:** Edit or delete projects as needed

### For Public Users
1. **Browse:** View all approved projects on `projects.html`
2. **Search & Filter:** Use filters to find specific projects
3. **Comment:** Leave feedback on projects
4. **Download:** Get project reports and files

## Key Features Explained

### Authentication & Security
- Firebase Auth handles all user authentication
- Firestore security rules ensure proper access control
- Admin verification through dedicated admins collection
- Session tokens stored securely in localStorage

### File Management
- Up to 50MB per file limit
- Multiple file types supported
- Firebase Storage handles cloud hosting
- Downloads via secure signed URLs

### Real-Time Updates
- Firestore provides real-time project updates
- Admin approvals immediately visible to students
- Comments appear instantly for all users

### Responsive Design
- Mobile-first CSS approach
- Breakpoints at 900px and 720px
- Touch-friendly buttons and forms
- Optimized for all screen sizes

### Search & Filtering
- Client-side filtering for instant results
- Multi-field search (title, names, registration)
- Auto-populated filter options from database

## Performance Considerations

- Lazy loading for images
- Minimal external dependencies
- CSS Grid for efficient layouts
- Optimized Firestore queries
- Image compression recommended for uploads

## Security Features

- Firebase Authentication (industry standard)
- Firestore Security Rules (enforce access control)
- Storage Rules (file upload restrictions)
- HTTPS encryption (automatic with Firebase Hosting)
- XSS protection (HTML escaping in JS)
- CSRF protection (Firebase built-in)

## Browser Testing

Tested and confirmed working on:
- ✅ Chrome 120+
- ✅ Firefox 121+
- ✅ Safari 17+
- ✅ Edge 120+
- ✅ Chrome Mobile 120+
- ✅ Safari Mobile 17+

## Accessibility

- Semantic HTML5 elements
- ARIA labels for interactive elements
- Color contrast ratios (WCAG AA compliant)
- Keyboard navigation support
- Form validation with error messages
- Alt text for images

## Deployment Options

### Firebase Hosting (Recommended)
```bash
npm install -g firebase-tools
firebase deploy
```
- ✅ Free tier available
- ✅ Global CDN
- ✅ HTTPS included
- ✅ Custom domain support

### Custom Hosting
- Copy files to any static hosting provider
- Update Firebase config as needed
- Ensure HTTPS enabled

## Customization Guide

### Change Colors
Edit `:root` variables in `CSS/style.css`

### Add Logo
Replace `assets/images/logo.png` and update header

### Modify Form Fields
Edit `submit.html` and `submit-NEW.js`

### Add New Filters
Update filter logic in `projects.js`

### Custom Domain
Firebase Hosting → Domain → Connect custom domain

## Support & Maintenance

### Regular Maintenance
- Monitor Firestore usage
- Review storage costs
- Check user feedback
- Update documentation

### Troubleshooting
- See DEPLOYMENT_GUIDE.md Troubleshooting section
- Check browser console for errors
- Review Firebase logs in console

### Contact
**Lendi Institute DTI Lab**
- Email: principal@lendi.edu.in
- Phone: 9490344747
- Website: www.lendi.edu.in

## License & Credits

**Platform:** DTI Lab Academic Portal v1.0.0

**Built with:**
- Firebase (Google Cloud)
- HTML5, CSS3, JavaScript ES6+
- Open-source best practices

**For:** Lendi Institute of Engineering & Technology
Department of Electronics and Communication Engineering

---

## Versions & Updates

### Version 1.0.0 (Current)
- ✅ Complete project submission system
- ✅ Admin approval workflow
- ✅ Public project browsing
- ✅ Advanced filtering & search
- ✅ File upload to cloud
- ✅ Comments & feedback
- ✅ Mobile responsive
- ✅ Firebase integration

### Planned (Future)
- Comment notifications
- Email confirmations
- Project views/likes
- Export reports
- Analytics dashboard
- User profiles
- Project sharing

---

## Quick Links

- 🏠 **Home:** `index.html`
- 📚 **Projects:** `projects.html`
- ✏️ **Submit:** `submit.html`
- 👤 **Login:** `login.html`
- 👨‍💼 **Admin:** `admin.html`
- 📖 **Implementation Guide:** `IMPLEMENTATION_GUIDE.md`
- 🚀 **Deployment Guide:** `DEPLOYMENT_GUIDE.md`

---

**Last Updated:** February 22, 2024  
**Status:** ✅ Production Ready  
**Deployment Ready:** YES

For detailed setup instructions, see **DEPLOYMENT_GUIDE.md**
