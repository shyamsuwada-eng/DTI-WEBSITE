// Faculty Dashboard Logic
// Handle project reviews, approvals, and analytics
import { db, auth } from './firebase.js';
import {
    collection,
    query,
    getDocs,
    addDoc,
    doc,
    updateDoc,
    orderBy,
    where
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { notificationManager } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const sessionStr = localStorage.getItem('dti_session');
    console.log('Faculty Dashboard: Session loaded:', sessionStr);

    let session = {};
    try {
        session = sessionStr ? JSON.parse(sessionStr) : {};
    } catch (e) {
        console.warn('Faculty Dashboard: Failed to parse session data', e);
    }

    if (!session.uid || session.role !== 'Faculty') {
        console.warn('Faculty Dashboard: Unauthorized access attempt. Session:', session);
        alert('Access denied. Please log in as faculty.');
        window.location.href = 'login.html';
        return;
    }

    console.log('Faculty Dashboard: Access granted for:', session.email);

    // Display user email
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) userEmailEl.textContent = session.email;

    // Initialize dashboard after auth check
    const facultyDashboard = new FacultyDashboard(session);
    window.facultyDashboard = facultyDashboard;
    facultyDashboard.init();
});

class FacultyDashboard {
    constructor(session) {
        this.session = session;
        this.projects = [];
        this.stats = {
            totalProjects: 0,
            approved: 0,
            pending: 0,
            rejected: 0
        };
        this.currentProjectId = null;
    }

    // Initialize faculty dashboard
    async init() {
        this.initializeCharts();
        await this.loadProjects();
        this.setupEventListeners();
        this.updateCharts();
    }

    // Load projects from Firestore
    async loadProjects() {
        console.log('Loading projects from Firestore...');
        const projectsTableBody = document.getElementById('projectsTableBody');
        if (projectsTableBody) projectsTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center">Loading projects...</td></tr>';

        try {
            const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            this.projects = [];

            querySnapshot.forEach((doc) => {
                this.projects.push({ id: doc.id, ...doc.data() });
            });

            this.updateStatistics();
            this.displayProjects(this.projects);
            this.updateCharts();
        } catch (error) {
            console.error("Error loading projects:", error);
            if (projectsTableBody) projectsTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red">Error loading projects.</td></tr>';
        }
    }

    // Update dashboard statistics
    updateStatistics() {
        this.stats = {
            totalProjects: this.projects.length,
            approved: this.projects.filter(p => p.status === 'approved').length,
            pending: this.projects.filter(p => !p.status || p.status === 'pending').length,
            rejected: this.projects.filter(p => p.status === 'rejected').length
        };

        const totalEl = document.getElementById('totalProjects');
        const approvedEl = document.getElementById('approvedProjects');
        const pendingEl = document.getElementById('pendingProjects');
        const rejectedEl = document.getElementById('rejectedProjects');

        if (totalEl) totalEl.textContent = this.stats.totalProjects;
        if (approvedEl) approvedEl.textContent = this.stats.approved;
        if (pendingEl) pendingEl.textContent = this.stats.pending;
        if (rejectedEl) rejectedEl.textContent = this.stats.rejected;
    }

    // Display projects in table
    displayProjects(projects) {
        const tableBody = document.getElementById('projectsTableBody');
        if (!tableBody) return;

        if (projects.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center">No projects found.</td></tr>';
            return;
        }

        tableBody.innerHTML = projects.map(project => `
            <tr>
                <td>${project.projectName}</td>
                <td>${project.teamLead || 'Anonymous'}</td>
                <td>${project.domain}</td>
                <td>${project.year || 'N/A'}</td>
                <td>${this.formatDate(project.createdAt)}</td>
                <td>
                    <span class="status-badge status-${project.status || 'pending'}">
                        ${this.getStatusText(project.status)}
                    </span>
                </td>
                <td>
                    <button class="btn-review" onclick="openReviewModal('${project.id}')">Review</button>
                </td>
            </tr>
        `).join('');
    }

    // Format date for display
    formatDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString();
    }

    // Get status text
    getStatusText(status) {
        switch(status) {
            case 'approved': return 'Approved';
            case 'rejected': return 'Rejected';
            default: return 'Pending';
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterProjects(e.target.value, document.getElementById('statusFilter').value);
            });
        }

        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterProjects(document.getElementById('searchInput').value, e.target.value);
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadProjects());
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('dti_session');
                window.location.href = 'login.html';
            });
        }
    }

    // Filter projects
    filterProjects(searchTerm, statusFilter) {
        let filtered = this.projects;

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(project =>
                project.projectName.toLowerCase().includes(term) ||
                (project.teamLead && project.teamLead.toLowerCase().includes(term)) ||
                project.domain.toLowerCase().includes(term)
            );
        }

        // Filter by status
        if (statusFilter && statusFilter !== 'all') {
            filtered = filtered.filter(project => (project.status || 'pending') === statusFilter);
        }

        this.displayProjects(filtered);
    }

    // Initialize charts
    initializeCharts() {
        this.domainChart = new Chart(document.getElementById('domainChart'), {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        this.monthlyChart = new Chart(document.getElementById('monthlyChart'), {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Submissions',
                    data: [],
                    borderColor: '#36A2EB',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    updateCharts() {
        if (!this.domainChart || !this.monthlyChart) return;

        const domainCounts = {};
        const monthlyCounts = {};

        this.projects.forEach((project) => {
            const domain = project.domain || 'Other';
            domainCounts[domain] = (domainCounts[domain] || 0) + 1;

            if (project.createdAt) {
                const date = project.createdAt.toDate ? project.createdAt.toDate() : new Date(project.createdAt.seconds * 1000);
                const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
            }
        });

        this.domainChart.data.labels = Object.keys(domainCounts);
        this.domainChart.data.datasets[0].data = Object.values(domainCounts);
        this.domainChart.update();

        this.monthlyChart.data.labels = Object.keys(monthlyCounts);
        this.monthlyChart.data.datasets[0].data = Object.values(monthlyCounts);
        this.monthlyChart.update();
    }

    // Open review modal
    openReviewModal(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (!project) return;

        this.currentProjectId = projectId;
        const modal = document.getElementById('reviewModal');
        const modalBody = document.getElementById('modalBody');

        const ratingValue = Number(project.averageRating || 0);
        const ratingText = project.ratingCount ? `${ratingValue.toFixed(1)} / 5 (${project.ratingCount} ratings)` : 'Not rated yet';

        modalBody.innerHTML = `
            <div class="project-details">
                <h4>${project.projectName}</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <strong>Student:</strong> ${project.teamLead || 'Anonymous'}
                    </div>
                    <div class="detail-item">
                        <strong>Domain:</strong> ${project.domain}
                    </div>
                    <div class="detail-item">
                        <strong>Year:</strong> ${project.year || 'N/A'}
                    </div>
                    <div class="detail-item">
                        <strong>Status:</strong> <span class="status-badge status-${project.status || 'pending'}">${this.getStatusText(project.status)}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Rating:</strong> ${ratingText}
                    </div>
                </div>
                <div class="project-description">
                    <strong>Description:</strong>
                    <p>${project.description || 'No description provided'}</p>
                </div>
                <div class="project-description">
                    <strong>Faculty Feedback</strong>
                    <p style="font-size:13px; color: var(--muted); margin-bottom:12px;">Feedback and star rating will be posted to approved projects.</p>
                    <label for="facultyRatingInput" style="display:block; margin-bottom:6px; font-weight:600;">Star Rating</label>
                    <select id="facultyRatingInput" style="width:100%; margin-bottom:12px;">
                        <option value="">No rating</option>
                        <option value="5">5 - Excellent</option>
                        <option value="4">4 - Very Good</option>
                        <option value="3">3 - Good</option>
                        <option value="2">2 - Needs Improvement</option>
                        <option value="1">1 - Poor</option>
                    </select>
                    <label for="facultyFeedbackInput" style="display:block; margin-bottom:6px; font-weight:600;">Feedback Comment</label>
                    <textarea id="facultyFeedbackInput" rows="4" placeholder="Add faculty feedback for this project..." style="width:100%;"></textarea>
                </div>
                ${project.documentUrl ? `
                    <div class="project-files">
                        <strong>Files:</strong>
                        <a href="${project.documentUrl}" target="_blank" class="file-link">📄 Documentation</a>
                    </div>
                ` : ''}
            </div>
        `;

        const modalFooter = document.querySelector('#reviewModal .modal-footer');
        if (modalFooter) {
            modalFooter.innerHTML = `
                <button class="btn-danger" onclick="updateProjectStatus('rejected')">Reject</button>
                <button class="btn-success" onclick="updateProjectStatus('approved')">Approve</button>
            `;
            if (project.status === 'approved') {
                modalFooter.innerHTML = `
                    <button class="btn-review" onclick="submitFacultyFeedback()">Submit Feedback</button>
                    <button class="btn-success" onclick="closeReviewModal()">Close</button>
                `;
            }
        }

        modal.style.display = 'block';
    }

    // Update project status
    async updateProjectStatus(status) {
        if (!this.currentProjectId) return;
        const feedbackText = document.getElementById('facultyFeedbackInput')?.value?.trim() || '';
        const ratingRaw = document.getElementById('facultyRatingInput')?.value || '';
        const rating = ratingRaw ? parseInt(ratingRaw, 10) : null;

        try {
            const projectRef = doc(db, 'projects', this.currentProjectId);
            await updateDoc(projectRef, {
                status: status,
                reviewedAt: new Date(),
                reviewedBy: this.session.email
            });

            if (status === 'approved' && (feedbackText || rating)) {
                await this.addFeedback(this.currentProjectId, feedbackText, rating);
                await this.updateProjectRatingSummary(this.currentProjectId);
            }

            notificationManager.show(`Project ${status} successfully!`, 'success');
            closeReviewModal();
            this.loadProjects(); // Refresh the list
        } catch (error) {
            console.error('Error updating project status:', error);
            notificationManager.show('Error updating project status', 'error');
        }
    }

    async submitFeedbackOnly() {
        if (!this.currentProjectId) return;
        const feedbackText = document.getElementById('facultyFeedbackInput')?.value?.trim() || '';
        const ratingRaw = document.getElementById('facultyRatingInput')?.value || '';
        const rating = ratingRaw ? parseInt(ratingRaw, 10) : null;

        if (!feedbackText && !rating) {
            notificationManager.show('Add a rating or feedback comment before submitting.', 'warning');
            return;
        }

        try {
            await this.addFeedback(this.currentProjectId, feedbackText, rating);
            await this.updateProjectRatingSummary(this.currentProjectId);
            notificationManager.show('Feedback submitted successfully.', 'success');
            closeReviewModal();
            this.loadProjects();
        } catch (error) {
            console.error('Error submitting faculty feedback:', error);
            notificationManager.show('Unable to submit feedback. Please try again.', 'error');
        }
    }

    async addFeedback(projectId, comment, rating) {
        await addDoc(collection(db, 'projects', projectId, 'feedback'), {
            comment: comment || '',
            rating: rating || null,
            userEmail: this.session.email || 'faculty@dti.edu',
            userRole: 'Faculty',
            createdAt: new Date()
        });
    }

    async updateProjectRatingSummary(projectId) {
        const feedbackQuery = query(collection(db, 'projects', projectId, 'feedback'), orderBy('createdAt', 'desc'));
        const feedbackSnapshot = await getDocs(feedbackQuery);
        const ratings = [];
        feedbackSnapshot.forEach((feedbackDoc) => {
            const data = feedbackDoc.data();
            if (typeof data.rating === 'number' && data.rating >= 1 && data.rating <= 5) {
                ratings.push(data.rating);
            }
        });

        const ratingCount = ratings.length;
        const averageRating = ratingCount ? (ratings.reduce((sum, value) => sum + value, 0) / ratingCount) : 0;

        await updateDoc(doc(db, 'projects', projectId), {
            averageRating,
            ratingCount,
            updatedAt: new Date()
        });
    }
}

// Global functions for modal
window.openReviewModal = function(projectId) {
    if (window.facultyDashboard) {
        window.facultyDashboard.openReviewModal(projectId);
    }
};

window.closeReviewModal = function() {
    const modal = document.getElementById('reviewModal');
    if (modal) modal.style.display = 'none';
};

window.updateProjectStatus = function(status) {
    if (window.facultyDashboard) {
        window.facultyDashboard.updateProjectStatus(status);
    }
};

window.submitFacultyFeedback = function() {
    if (window.facultyDashboard) {
        window.facultyDashboard.submitFeedbackOnly();
    }
};
