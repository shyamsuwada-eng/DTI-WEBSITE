// Submit Project Form Logic
// Handle project submission, validation, and file uploads
import { auth, db, storage } from './firebase.js';
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

// ──────────────────────────────────────────────────────────────────────
// AUTH GUARD — runs immediately when module loads
// Checks localStorage first (instant). If no session exists, redirect.
// ──────────────────────────────────────────────────────────────────────
const sessionStr = localStorage.getItem('dti_session');
if (!sessionStr) {
    // No session at all — redirect to login immediately
    alert('Please login first to submit a project.');
    window.location.href = 'login.html';
}

// Parse session (safe — we only reach here if sessionStr exists)
let currentSession = null;
try {
    currentSession = JSON.parse(sessionStr);
} catch (e) {
    // Corrupted session data
    localStorage.removeItem('dti_session');
    alert('Your session is invalid. Please login again.');
    window.location.href = 'login.html';
}

// ──────────────────────────────────────────────────────────────────────
// DOM READY — initialize form
// ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const manager = new ProjectSubmissionManager();
    manager.init();
});

class ProjectSubmissionManager {
    constructor() {
        this.isSubmitting = false;
    }

    init() {
        const form = document.getElementById('projectForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Pre-fill team lead name from session if available
        if (currentSession && currentSession.email) {
            const firstNameInput = document.querySelector('.team-input');
            if (firstNameInput && !firstNameInput.value) {
                firstNameInput.placeholder = `Team Lead (${currentSession.email})`;
            }
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        if (this.isSubmitting) return;

        // Re-verify session on submit (in case it was cleared)
        const latestSession = localStorage.getItem('dti_session');
        if (!latestSession) {
            alert('Your session has expired. Please login again.');
            window.location.href = 'login.html';
            return;
        }

        let session;
        try {
            session = JSON.parse(latestSession);
        } catch (err) {
            alert('Your session is invalid. Please login again.');
            localStorage.removeItem('dti_session');
            window.location.href = 'login.html';
            return;
        }

        const form = e.target;
        const submitBtn = form.querySelector('.btn-submit');

        // ── Basic Validation ──
        const projectName = document.getElementById('projectName').value.trim();
        const description = document.getElementById('description').value.trim();
        const docFile = document.getElementById('document').files[0];

        if (!projectName) {
            alert('Please enter a project name.');
            return;
        }
        if (!description) {
            alert('Please provide a project description.');
            return;
        }
        if (description.length < 50) {
            alert('Description must be at least 50 characters.');
            return;
        }
        if (!docFile) {
            alert('Please upload the project documentation (PDF or DOC).');
            return;
        }

        // ── Determine if this is a real Firebase user or hardcoded session ──
        const isHardcodedSession = session.uid === 'hardcoded-admin-123';

        try {
            this.isSubmitting = true;
            submitBtn.textContent = 'Uploading...';
            submitBtn.disabled = true;

            let docUrl = '';
            let photoUrl = '';

            if (!isHardcodedSession) {
                // ── Real Firebase Auth user: upload files to Storage ──
                submitBtn.textContent = 'Uploading documentation...';
                const timestamp = Date.now();

                // Upload Documentation
                const docRef = ref(storage, `projects/${timestamp}_doc_${docFile.name}`);
                const docSnapshot = await uploadBytes(docRef, docFile);
                docUrl = await getDownloadURL(docSnapshot.ref);

                // Upload Photo (optional)
                const photoFile = document.getElementById('groupPhoto').files[0];
                if (photoFile) {
                    submitBtn.textContent = 'Uploading photo...';
                    const photoRef = ref(storage, `projects/${timestamp}_photo_${photoFile.name}`);
                    const photoSnapshot = await uploadBytes(photoRef, photoFile);
                    photoUrl = await getDownloadURL(photoSnapshot.ref);
                }
            } else {
                // ── Hardcoded admin session: file upload not available ──
                // Files cannot be uploaded to Firebase Storage without real auth.
                // Store file names for reference only.
                docUrl = `[local-file] ${docFile.name}`;
                const photoFile = document.getElementById('groupPhoto').files[0];
                if (photoFile) photoUrl = `[local-file] ${photoFile.name}`;
                console.warn('Hardcoded admin session: files not uploaded to Storage, filenames recorded only.');
            }

            // ── Build team members list ──
            const teamMembers = [];
            document.querySelectorAll('.team-member').forEach(el => {
                const name = el.querySelector('.team-input')?.value?.trim();
                const reg = el.querySelector('.team-reg')?.value?.trim();
                if (name && reg) teamMembers.push({ name, reg });
            });

            // ── Build project data object ──
            submitBtn.textContent = 'Saving to database...';
            const projectData = {
                projectName,
                domain: document.getElementById('domain').value,
                year: document.getElementById('year').value,
                description,
                teamLead: teamMembers[0]?.name || session.email,
                email: session.email || '',
                uid: session.uid,
                teamMembers,
                documentUrl: docUrl,
                photoUrl: photoUrl,
                videoUrl: document.getElementById('videoUrl')?.value?.trim() || '',
                links: document.getElementById('links')?.value?.trim() || '',
                status: 'pending',
                submittedBy: session.email || 'unknown',
                createdAt: serverTimestamp()
            };

            // ── Save to Firestore ──
            await addDoc(collection(db, "projects"), projectData);

            alert('✅ Project submitted successfully! It will be visible once approved by an admin.');
            window.location.href = 'projects.html';

        } catch (error) {
            console.error('Submission error:', error);

            // Provide a helpful message based on error type
            if (error.code === 'storage/unauthorized') {
                alert('File upload failed: You do not have permission to upload files. Please contact the admin or use a registered student account.');
            } else if (error.code === 'permission-denied') {
                alert('Database error: Permission denied. Please ensure you are logged in with a valid student account.');
            } else {
                alert('An error occurred during submission: ' + (error.message || 'Unknown error'));
            }
        } finally {
            this.isSubmitting = false;
            submitBtn.textContent = 'Submit Project';
            submitBtn.disabled = false;
        }
    }
}
