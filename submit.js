// Submit Project Form Logic
// Handles project submission and file uploads with a single write path.
import { db, storage } from './firebase.js';
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";
import { collection, addDoc, serverTimestamp, query, getDocs } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const sessionStr = localStorage.getItem('dti_session');
if (!sessionStr) {
    alert('Please login first to submit a project.');
    window.location.href = 'login.html';
}

let currentSession = null;
try {
    currentSession = sessionStr ? JSON.parse(sessionStr) : null;
} catch (error) {
    localStorage.removeItem('dti_session');
    alert('Your session is invalid. Please login again.');
    window.location.href = 'login.html';
}

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
            form.addEventListener('submit', (event) => this.handleFormSubmit(event));
        }

        if (currentSession && currentSession.email) {
            const firstNameInput = document.querySelector('.team-input');
            if (firstNameInput && !firstNameInput.value) {
                firstNameInput.placeholder = `Team Lead (${currentSession.email})`;
            }
        }
    }

    async handleFormSubmit(event) {
        event.preventDefault();
        if (this.isSubmitting) return;

        const latestSession = localStorage.getItem('dti_session');
        if (!latestSession) {
            alert('Your session has expired. Please login again.');
            window.location.href = 'login.html';
            return;
        }

        let session;
        try {
            session = JSON.parse(latestSession);
        } catch (error) {
            localStorage.removeItem('dti_session');
            alert('Your session is invalid. Please login again.');
            window.location.href = 'login.html';
            return;
        }

        const form = event.target;
        const submitBtn = form.querySelector('.btn-submit');

        const projectName = document.getElementById('projectName')?.value?.trim() || '';
        const description = document.getElementById('description')?.value?.trim() || '';
        const domain = document.getElementById('domain')?.value || 'other';
        const year = document.getElementById('year')?.value || '';
        const links = document.getElementById('links')?.value?.trim() || '';
        const docFile = document.getElementById('document')?.files?.[0] || null;
        const photoFile = document.getElementById('groupPhoto')?.files?.[0] || null;
        const presentationFile = document.getElementById('presentation')?.files?.[0] || null;
        const teamMembers = this.getTeamMembers();

        if (!projectName) {
            alert('Please enter a project name.');
            return;
        }

        const isDuplicate = await this.checkDuplicateProject(projectName);
        if (isDuplicate) {
            const proceed = confirm('A similar project title already exists. Do you want to continue?');
            if (!proceed) return;
        }

        try {
            this.isSubmitting = true;
            if (submitBtn) {
                submitBtn.textContent = 'Submitting...';
                submitBtn.disabled = true;
            }

            const timestamp = Date.now();
            let documentUrl = '';
            let photoUrl = '';
            let presentationUrl = '';

            if (docFile) {
                const docRef = ref(storage, `projects/${timestamp}_doc_${docFile.name}`);
                const docSnapshot = await uploadBytes(docRef, docFile);
                documentUrl = await getDownloadURL(docSnapshot.ref);
            }

            if (photoFile) {
                const photoRef = ref(storage, `projects/${timestamp}_photo_${photoFile.name}`);
                const photoSnapshot = await uploadBytes(photoRef, photoFile);
                photoUrl = await getDownloadURL(photoSnapshot.ref);
            }

            if (presentationFile) {
                const presRef = ref(storage, `projects/${timestamp}_presentation_${presentationFile.name}`);
                const presSnapshot = await uploadBytes(presRef, presentationFile);
                presentationUrl = await getDownloadURL(presSnapshot.ref);
            }

            const projectData = {
                projectName,
                description,
                domain,
                year: year || null,
                teamLead: teamMembers[0]?.name || session.email || 'Anonymous',
                teamMembers,
                links,
                documentUrl,
                photoUrl,
                presentationUrl,
                email: session.email || '',
                userId: session.uid,
                status: 'pending',
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, 'projects'), projectData);

            alert('Project submitted successfully! It will be visible once approved.');
            window.location.href = 'projects.html';
        } catch (error) {
            console.error('Submission error:', error);
            if (error.code === 'storage/unauthorized') {
                alert('File upload failed: You do not have permission to upload files.');
            } else if (error.code === 'permission-denied') {
                alert('Database error: Permission denied. Please login with a valid account.');
            } else {
                alert('An error occurred during submission: ' + (error.message || 'Unknown error'));
            }
        } finally {
            this.isSubmitting = false;
            if (submitBtn) {
                submitBtn.textContent = 'Submit Project';
                submitBtn.disabled = false;
            }
        }
    }

    async checkDuplicateProject(projectName) {
        try {
            const q = query(collection(db, 'projects'));
            const querySnapshot = await getDocs(q);
            const normalizedTitle = projectName.toLowerCase();

            for (const projectDoc of querySnapshot.docs) {
                const existingTitle = (projectDoc.data().projectName || '').toLowerCase();
                if (!existingTitle) continue;
                if (this.calculateSimilarity(normalizedTitle, existingTitle) > 0.8) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error('Error checking duplicates:', error);
            return false;
        }
    }

    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
        for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[str2.length][str1.length];
    }

    getTeamMembers() {
        const members = [];
        const memberElements = document.querySelectorAll('.team-member');

        memberElements.forEach((member) => {
            const name = member.querySelector('.team-input')?.value?.trim() || '';
            const reg = member.querySelector('.team-reg')?.value?.trim() || '';
            if (!name) return;

            members.push({
                name,
                registrationNumber: reg,
                isLead: member.querySelector('label')?.textContent?.includes('Lead') || false
            });
        });

        return members;
    }
}

