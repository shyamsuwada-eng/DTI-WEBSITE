# DTI Lab Portal - Deployment & Setup Guide

## Quick Start Checklist

### Phase 1: File Activation (5 minutes)
- [ ] Delete original files: `projects.html`, `submit.html`, `login.html`, `admin.html`, `auth.js`, `projects.js`, `submit.js`, `admin.js`
- [ ] Rename `-NEW` files to remove suffix:
  - [ ] `projects-NEW.html` → `projects.html`
  - [ ] `projects-NEW.js` → `projects.js`
  - [ ] `submit-NEW.html` → `submit.html`
  - [ ] `submit-NEW.js` → `submit.js`
  - [ ] `login-NEW.html` → `login.html`
  - [ ] `auth-NEW.js` → `auth.js`
  - [ ] `admin-NEW.html` → `admin.html`
  - [ ] `admin-NEW.js` → `admin.js`
- [ ] Keep `index.html` and `about.html` as is (they're already updated)

### Phase 2: Firebase Configuration (10 minutes)
- [ ] Go to https://console.firebase.google.com
- [ ] Create project or use: "dti-lab-project-portal"
- [ ] Copy Firebase config from Project Settings
- [ ] Update `js/firebase.js` with your config:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Phase 3: Firestore Setup (15 minutes)

#### Enable Firestore
1. In Firebase Console → Firestore Database
2. Click "Create Database"
3. Choose "Production mode"
4. Select your region (closest to India: asia-south1)

#### Create Collections
In Firestore console, manually create these collections (or let them auto-create):
- `projects`
- `admins`
- `users`

#### Set Security Rules
Replace Firestore Security Rules with:

```firebase
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Approved projects readable by all, editable by owner
    match /projects/{projectId} {
      allow read: if resource.data.status == "approved";
      allow read: if request.auth.uid == resource.data.submittedBy;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.submittedBy && resource.data.status == "pending";
    }
    
    // Comments on projects
    match /projects/{projectId}/feedback/{feedbackId} {
      allow read: if parent.read();
      allow create: if request.auth != null;
      allow delete: if request.auth.uid == resource.data.userId;
    }
    
    // Admin verification
    match /admins/{adminId} {
      allow read: if request.auth.uid == adminId;
    }
    
    // User profiles
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
  }
}
```

### Phase 4: Authentication Setup (5 minutes)

#### Enable Email/Password Auth
1. Firebase Console → Authentication → Sign-in method
2. Enable "Email/Password"
3. Toggle "Password Authentication" ON
4. Save

#### Create Test Accounts
Create these test users in Firebase Auth:

**Student Account:**
- Email: `student@lendi.edu.in`
- Password: `Student123!`

**Admin Account:**
- Email: `admin@lendi.edu.in`
- Password: `Admin123!`

### Phase 5: Create Admin Users (10 minutes)

1. In Firestore, go to collection `admins`
2. Add document with:
   - **Document ID:** (Copy the UID of admin email from Firebase Auth → Users)
   - **Fields:**
     ```
     uid: "admin-user-uid-here"
     email: "admin@lendi.edu.in"
     name: "Administrator"
     role: "admin"
     ```

### Phase 6: Firebase Storage Setup (5 minutes)

1. Firebase Console → Storage
2. Click "Get Started"
3. Start in "Production mode"
4. Choose region (asia-south1)
5. Update Storage Rules:

```firebase
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /projects/{projectId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.resource.size <= 50 * 1024 * 1024;
    }
  }
}
```

### Phase 7: Deploy to Firebase Hosting (10 minutes)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Log in
firebase login

# Initialize project
firebase init hosting

# Deploy
firebase deploy
```

### Phase 8: Testing Workflow (30 minutes)

#### Test Student Workflow
1. Go to login.html
2. Select "Student" role
3. Log in with: `student@lendi.edu.in` / `Student123!`
4. Fill project submission form with sample data:
   - Title: "Smart IoT Plant Monitor"
   - Description: "A system using IoT sensors to monitor plant health"
   - Domain: "Embedded Systems & IoT"
   - Academic Year: "2024-2025"
   - Batch: "2022"
   - Team Name: "Tech Innovators"
   - Add 2-3 team members
   - Technologies: "Arduino, Python, Firebase, IoT"
5. Submit project
6. Verify project appears in Firestore with status: "pending"

#### Test Admin Workflow
1. Go to admin.html
2. Log in with: `admin@lendi.edu.in` / `Admin123!`
3. Verify pending project appears in dashboard
4. Click "Approve" button
5. Verify status changes to "approved"
6. Log out

#### Test Public Display
1. Go to projects.html (no login needed)
2. Verify approved project appears in listing
3. Test filters (Domain, Year, Batch, Search)
4. Verify download buttons work for uploaded files

### Phase 9: Production Hardening (Before Going Live)

#### Security Review
- [ ] All sensitive data in .gitignore
- [ ] Firebase config uses environment variables (optional for static hosting)
- [ ] Security rules tested
- [ ] File upload limits enforced (50MB max)

#### Data Backup
- [ ] Export Firestore data regularly
- [ ] Test recovery process

#### Monitoring
- [ ] Enable Firebase Analytics
- [ ] Set up error monitoring
- [ ] Monitor storage usage

### Phase 10: Go Live!

1. **Update DNS** (if using custom domain)
2. **Update Links** on marketing materials, emails, etc.
3. **Enable HTTPS** (automatic with Firebase Hosting)
4. **Test from different devices** (mobile, tablet, desktop)
5. **Monitor for issues** first 24-48 hours

---

## File Structure Reference

```
d:\DTI-website\
├── index.html              ✅ Home page (updated)
├── projects.html           ✅ Project listing (ready)
├── submit.html             ✅ Submission form (ready)
├── login.html              ✅ Authentication (ready)
├── admin.html              ✅ Admin dashboard (ready)
├── about.html              ℹ️ To update manually
│
├── CSS/
│   └── style.css          ✅ Complete responsive CSS
│
├── js/
│   ├── firebase.js        ✅ Firebase config (update with your keys)
│   ├── auth.js            ✅ Authentication module
│   ├── projects.js        ✅ Project display & filtering
│   ├── submit.js          ✅ File upload & form submission
│   ├── admin.js           ✅ Admin dashboard
│   └── header.js          ℹ️ Legacy (optional to remove)
│
└── assets/
    ├── fonts/
    ├── icons/
    └── images/
```

---

## Troubleshooting

### Problem: "Projects not loading"
**Solution:**
- [ ] Check Firestore has documents with `status: "approved"`
- [ ] Verify Firebase config in `js/firebase.js`
- [ ] Open browser console and check for errors
- [ ] Verify security rules allow reads

### Problem: "Login fails"
**Solution:**
- [ ] Verify user created in Firebase Auth
- [ ] Check email format matches exactly
- [ ] Clear browser localStorage: `localStorage.clear()`
- [ ] Check browser console for error codes

### Problem: "Admin dashboard shows 'Access Denied'"
**Solution:**
- [ ] Verify user UID in `admins` collection matches Firebase Auth UID
- [ ] Check security rules allow admin reads
- [ ] Verify document exists with correct `uid` field

### Problem: "File uploads failing"
**Solution:**
- [ ] Check file size (max 50MB)
- [ ] Verify Storage rules updated
- [ ] Check browser console for storage errors
- [ ] Verify Firebase Storage enabled in console

### Problem: "Can't approve/reject projects"
**Solution:**
- [ ] Verify logged in as admin user
- [ ] Check Firestore update permissions
- [ ] Test with browser console: `db.collection('projects').doc('test').update({status: 'approved'})`

---

## Advanced Configuration

### Custom Domain Setup
1. Firebase Console → Hosting → Domain
2. Click "Connect custom domain"
3. Follow DNS setup instructions
4. SSL certificate auto-provisioned

### Email Notifications (Optional)
Implement using Cloud Functions to send emails when projects are approved:
- Firebase Cloud Functions
- SendGrid or Mail service
- Merge with Firestore triggers

### Analytics
Enable in Firebase to track:
- User login patterns
- Most viewed projects
- Submission trends

### Backup Strategy
1. Enable automatic Firestore backups in console
2. Export data monthly: `gcloud firestore export gs://bucket/export`

---

## Support

### Documentation
- Firebase Docs: https://firebase.google.com/docs
- Cloud Firestore: https://firebase.google.com/docs/firestore
- Authentication: https://firebase.google.com/docs/auth
- Storage: https://firebase.google.com/docs/storage
- Hosting: https://firebase.google.com/docs/hosting

### Contact
**Lendi Institute DTI Lab**
- Email: principal@lendi.edu.in
- Phone: 9490344747
- Website: www.lendi.edu.in

---

## Version Information
- **Version:** 1.0.0 Production Ready
- **Last Updated:** February 2024
- **Firebase SDK:** 9.22.1
- **Browser Support:** Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- **Status:** ✅ Production Ready for Deployment

---

## Post-Deployment Checklist

### Week 1
- [ ] Monitor error logs
- [ ] Verify email notifications working
- [ ] Test file downloads
- [ ] Check performance metrics

### Week 2-4
- [ ] Gather user feedback
- [ ] Fix any reported issues
- [ ] Optimize database queries if needed
- [ ] Document any customizations

### Monthly
- [ ] Backup data
- [ ] Review security rules
- [ ] Update project list
- [ ] Check storage usage

---

## Success Metrics

Your portal is successfully deployed when:
- ✅ Users can register and log in
- ✅ Students can submit projects with files
- ✅ Admins can review and approve/reject
- ✅ Approved projects visible publicly
- ✅ All filters and search work
- ✅ Comments section functional
- ✅ File downloads work correctly
- ✅ Mobile responsive on all devices
- ✅ Performance acceptable (< 3s load time)
- ✅ No console errors

Happy deploying! 🚀
