// Admin Dashboard Logic
// Session validation for admin access
import { db, auth } from './firebase.js';
import { 
    collection, 
    query, 
    getDocs, 
    addDoc,
    doc, 
    updateDoc, 
    deleteDoc,
    orderBy 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { notificationManager } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const sessionStr = localStorage.getItem('dti_session');
  console.log('Admin Dashboard: Session loaded:', sessionStr);
  let session = {};
  try {
    session = sessionStr ? JSON.parse(sessionStr) : {};
  } catch (e) {
    console.warn('Admin Dashboard: Failed to parse session data', e);
  }
  
  if (!session.uid || session.role !== 'Admin') {
    console.warn('Admin Dashboard: Unauthorized access attempt. Session:', session);
    alert('Access denied. Please log in as an admin.');
    window.location.href = 'login.html';
    return;
  }
  console.log('Admin Dashboard: Access granted for:', session.email);
  
  // Initialize dashboard after auth check
  const adminDashboard = new AdminDashboard(session);
  adminDashboard.init();
});

class AdminDashboard {
    constructor(session) {
        this.session = session;
        this.projects = [];
        this.filteredProjects = [];
        this.stats = {
            totalProjects: 0,
            approved: 0,
            pending: 0,
            rejected: 0
        };
        this.charts = {};
        this.currentPage = 1;
        this.perPage = 12;
    }

    // Initialize admin dashboard
    async init() {
        this.setUserProfile();
        this.initializeCharts();
        await this.loadProjects();
        this.setupEventListeners();
    }

    // Initialize charts
    initializeCharts() {
        // Domain distribution chart
        const domainCtx = document.getElementById('domainChart');
        if (domainCtx) {
            this.charts.domain = new Chart(domainCtx, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }

        // Monthly submissions chart
        const monthlyCtx = document.getElementById('monthlyChart');
        if (monthlyCtx) {
            this.charts.monthly = new Chart(monthlyCtx, {
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

        // Approval rate chart
        const approvalCtx = document.getElementById('approvalChart');
        if (approvalCtx) {
            this.charts.approval = new Chart(approvalCtx, {
                type: 'bar',
                data: {
                    labels: ['Approved', 'Pending', 'Rejected'],
                    datasets: [{
                        label: 'Projects',
                        data: [],
                        backgroundColor: ['#10B981', '#F59E0B', '#EF4444']
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
    }

    // Update dashboard data and analytics
    updateDashboard() {
        const domainCounts = {};
        const monthlyCounts = {};
        const techCounts = {};
        const yearCounts = {};
        let approved = 0;
        let pending = 0;
        let rejected = 0;

        this.projects.forEach(project => {
            const status = project.status || 'pending';
            if (status === 'approved') approved += 1;
            else if (status === 'rejected') rejected += 1;
            else pending += 1;

            const domain = project.domain || 'Other';
            domainCounts[domain] = (domainCounts[domain] || 0) + 1;

            if (project.createdAt) {
                const date = project.createdAt.toDate ? project.createdAt.toDate() : new Date(project.createdAt.seconds * 1000);
                const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
            }

            const techs = this.getProjectTechnologies(project);
            techs.forEach(tech => {
                techCounts[tech] = (techCounts[tech] || 0) + 1;
            });

            const year = project.year || 'Unknown';
            yearCounts[year] = (yearCounts[year] || 0) + 1;
        });

        this.stats = {
            totalProjects: this.projects.length,
            approved,
            pending,
            rejected
        };

        this.updateStatsCards();
        this.updateCharts(domainCounts, monthlyCounts);
        this.displayAdditionalStats(techCounts, yearCounts);
        this.displayProjects();
        this.renderPagination();
    }

    setUserProfile() {
        const userLabel = document.getElementById('adminUserLabel');
        if (!userLabel) return;
        if (this.session?.name) {
            userLabel.textContent = `${this.session.name} • Admin`;
        } else if (this.session?.email) {
            userLabel.textContent = `${this.session.email} • Admin`;
        }
    }

    updateStatsCards() {
        const totalEl = document.getElementById('totalProjects');
        const approvedEl = document.getElementById('approvedProjects');
        const pendingEl = document.getElementById('pendingProjects');

        if (totalEl) totalEl.textContent = this.stats.totalProjects;
        if (approvedEl) approvedEl.textContent = this.stats.approved;
        if (pendingEl) pendingEl.textContent = this.stats.pending;
    }

    updateCharts(domainCounts, monthlyCounts) {
        if (this.charts.domain) {
            this.charts.domain.data.labels = Object.keys(domainCounts);
            this.charts.domain.data.datasets[0].data = Object.values(domainCounts);
            this.charts.domain.update();
        }

        if (this.charts.monthly) {
            this.charts.monthly.data.labels = Object.keys(monthlyCounts);
            this.charts.monthly.data.datasets[0].data = Object.values(monthlyCounts);
            this.charts.monthly.update();
        }

        if (this.charts.approval) {
            this.charts.approval.data.datasets[0].data = [
                this.stats.approved,
                this.stats.pending,
                this.stats.rejected
            ];
            this.charts.approval.update();
        }
    }

    // Get project technologies (simple keyword matching)
    getProjectTechnologies(project) {
        const text = `${project.projectName} ${project.description || ''}`.toLowerCase();
        const technologies = [];

        const techKeywords = {
            'Python': ['python'],
            'JavaScript': ['javascript', 'js', 'node.js'],
            'Java': ['java'],
            'C/C++': ['c++', 'c programming'],
            'Arduino': ['arduino'],
            'Raspberry Pi': ['raspberry pi', 'rpi'],
            'React': ['react'],
            'Angular': ['angular'],
            'Vue.js': ['vue'],
            'Firebase': ['firebase'],
            'AWS': ['aws'],
            'Azure': ['azure'],
            'IoT': ['iot', 'internet of things'],
            'AI/ML': ['machine learning', 'artificial intelligence', 'ai', 'ml']
        };

        Object.entries(techKeywords).forEach(([tech, keywords]) => {
            if (keywords.some(keyword => text.includes(keyword))) {
                technologies.push(tech);
            }
        });

        return technologies;
    }

    // Display additional statistics
    displayAdditionalStats(techCounts, yearCounts) {
        const techStatsEl = document.getElementById('techStats');
        const yearStatsEl = document.getElementById('yearStats');

        if (techStatsEl) {
            const topTechs = Object.entries(techCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5);
            
            techStatsEl.innerHTML = topTechs.map(([tech, count]) => 
                `<div class="stat-item"><strong>${tech}:</strong> ${count} projects</div>`
            ).join('');
        }

        if (yearStatsEl) {
            const yearStats = Object.entries(yearCounts)
                .sort(([,a], [,b]) => b - a)
                .map(([year, count]) => `<div class="stat-item"><strong>${year}:</strong> ${count} projects</div>`)
                .join('');
            yearStatsEl.innerHTML = yearStats;
        }
    }

    renderPagination() {
        const total = this.filteredProjects.length;
        const totalPages = Math.max(1, Math.ceil(total / this.perPage));
        this.currentPage = Math.min(this.currentPage, totalPages);

        const start = total === 0 ? 0 : (this.currentPage - 1) * this.perPage + 1;
        const end = Math.min(total, this.currentPage * this.perPage);

        const pageInfo = document.querySelector('.page-info');
        if (pageInfo) {
            pageInfo.textContent = `Showing ${start} to ${end} of ${total} entries`;
        }

        const buttons = Array.from(document.querySelectorAll('.page-controls .page-btn'));
        const prevBtn = buttons[0];
        const nextBtn = buttons[1];

        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
    }

    handleTableAction(event) {
        const approveBtn = event.target.closest('.btn-approve');
        const rejectBtn = event.target.closest('.btn-reject');
        const feedbackBtn = event.target.closest('.btn-feedback');

        if (approveBtn) {
            this.approveProject(approveBtn.dataset.id);
        } else if (rejectBtn) {
            this.rejectProject(rejectBtn.dataset.id);
        } else if (feedbackBtn) {
            this.submitProjectFeedback(feedbackBtn.dataset.id);
        }
    }

    handlePageClick(event) {
        const button = event.target.closest('.page-btn');
        if (!button || button.disabled) return;

        if (button.textContent.includes('Previous')) {
            this.currentPage = Math.max(1, this.currentPage - 1);
        } else if (button.textContent.includes('Next')) {
            this.currentPage += 1;
        }

        this.displayProjects();
        this.renderPagination();
    }

    // Load projects from Firestore
    async loadProjects() {
        console.log('Loading projects from Firestore...');
        const projectsTableBody = document.getElementById('projectsTableBody');
        if (projectsTableBody) projectsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Loading projects...</td></tr>';

        try {
            const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            this.projects = [];

            querySnapshot.forEach((doc) => {
                this.projects.push({ id: doc.id, ...doc.data() });
            });

            this.filteredProjects = [...this.projects];
            this.currentPage = 1;
            this.updateDashboard();
        } catch (error) {
            console.error("Error loading projects:", error);
            if (projectsTableBody) projectsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red">Error loading projects.</td></tr>';
        }
    }

    // Display projects in table
    displayProjects(projects = this.filteredProjects) {
        const tableBody = document.getElementById('projectsTableBody');
        if (!tableBody) return;

        if (!projects || projects.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">No projects found.</td></tr>';
            return;
        }

        const startIndex = (this.currentPage - 1) * this.perPage;
        const pageItems = projects.slice(startIndex, startIndex + this.perPage);

        tableBody.innerHTML = pageItems.map(project => `
            <tr>
                <td>
                    <div class="project-name">${project.projectName || 'Untitled Project'}</div>
                    <div class="project-domain">${project.domain || 'Unknown'} | ${project.year || 'N/A'} Year</div>
                </td>
                <td>
                    <div>${project.teamLead || 'N/A'}</div>
                    <div style="font-size: 12px; color: var(--muted)">${project.regNumber || project.email || ''}</div>
                </td>
                <td>${project.createdAt ? new Date(project.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <span class="status-badge status-${project.status || 'pending'}">
                        ${project.status || 'pending'}
                    </span>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn-action btn-view" onclick="window.open('${project.documentUrl || '#'}', '_blank')">View Doc</button>
                        ${(project.status !== 'approved') ? `<button class="btn-action btn-approve" data-id="${project.id}">Approve</button>` : ''}
                        ${(project.status !== 'rejected') ? `<button class="btn-action btn-reject" data-id="${project.id}">Reject</button>` : ''}
                        ${(project.status === 'approved') ? `<button class="btn-action btn-view btn-feedback" data-id="${project.id}">Feedback</button>` : ''}
                    </div>
                </td>
            </tr>
        `).join('');

        this.renderPagination();
    }

    // Approve project
    async approveProject(projectId) {
        if (!confirm('Are you sure you want to approve this project?')) return;
        try {
            await updateDoc(doc(db, "projects", projectId), {
                status: 'approved',
                updatedAt: new Date()
            });

            this.projects = this.projects.map(project =>
                project.id === projectId ? { ...project, status: 'approved', updatedAt: new Date() } : project
            );
            this.filteredProjects = this.filteredProjects.map(project =>
                project.id === projectId ? { ...project, status: 'approved', updatedAt: new Date() } : project
            );

            alert('Project approved successfully!');
            this.updateDashboard();
        } catch (error) {
            console.error("Error approving project:", error);
            alert('Failed to approve project.');
        }
    }

    // Reject project
    async rejectProject(projectId) {
        const reason = prompt('Please enter a reason for rejection (optional):');
        if (reason === null) return;
        try {
            await updateDoc(doc(db, "projects", projectId), {
                status: 'rejected',
                rejectionReason: reason,
                updatedAt: new Date()
            });

            this.projects = this.projects.map(project =>
                project.id === projectId ? { ...project, status: 'rejected', rejectionReason: reason, updatedAt: new Date() } : project
            );
            this.filteredProjects = this.filteredProjects.map(project =>
                project.id === projectId ? { ...project, status: 'rejected', rejectionReason: reason, updatedAt: new Date() } : project
            );

            alert('Project rejected.');
            this.updateDashboard();
        } catch (error) {
            console.error("Error rejecting project:", error);
            alert('Failed to reject project.');
        }
    }

    async submitProjectFeedback(projectId) {
        const project = this.projects.find((item) => item.id === projectId);
        if (!project || project.status !== 'approved') {
            notificationManager.show('Feedback can only be added to approved projects.', 'warning');
            return;
        }

        const ratingInput = prompt('Enter star rating (1 to 5). Leave empty to skip rating:');
        if (ratingInput === null) return;

        let rating = null;
        const trimmedRating = ratingInput.trim();
        if (trimmedRating) {
            const parsed = parseInt(trimmedRating, 10);
            if (Number.isNaN(parsed) || parsed < 1 || parsed > 5) {
                notificationManager.show('Rating must be a number between 1 and 5.', 'error');
                return;
            }
            rating = parsed;
        }

        const comment = prompt('Enter feedback comment (optional):');
        if (comment === null) return;
        const cleanComment = comment.trim();
        if (!cleanComment && !rating) {
            notificationManager.show('Please provide a rating or a comment.', 'warning');
            return;
        }

        try {
            await addDoc(collection(db, 'projects', projectId, 'feedback'), {
                comment: cleanComment,
                rating,
                userEmail: this.session.email || 'admin@dti.edu',
                userRole: 'Admin',
                createdAt: new Date()
            });
            await this.updateProjectRatingSummary(projectId);
            notificationManager.show('Feedback submitted successfully.', 'success');
            await this.loadProjects();
        } catch (error) {
            console.error('Error submitting admin feedback:', error);
            notificationManager.show('Unable to submit feedback right now.', 'error');
        }
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

    // Setup event listeners
    setupEventListeners() {
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }

        const filterStatus = document.getElementById('filterStatus');
        if (filterStatus) {
            filterStatus.addEventListener('change', () => this.applyFilters());
        }

        const filterDomain = document.getElementById('filterDomain');
        if (filterDomain) {
            filterDomain.addEventListener('change', () => this.applyFilters());
        }

        const tableBody = document.getElementById('projectsTableBody');
        if (tableBody) {
            tableBody.addEventListener('click', (event) => this.handleTableAction(event));
        }

        const pagination = document.querySelector('.page-controls');
        if (pagination) {
            pagination.addEventListener('click', (event) => this.handlePageClick(event));
        }
    }

    // Combined filter application
    applyFilters() {
        const status = document.getElementById('filterStatus')?.value || 'all';
        const domain = document.getElementById('filterDomain')?.value || 'all';
        const term = document.querySelector('.search-box input')?.value?.toLowerCase() || '';

        this.filteredProjects = this.projects.filter(project => {
            const matchesStatus = status === 'all' || project.status === status || (!project.status && status === 'pending');
            const matchesDomain = domain === 'all' || project.domain?.toLowerCase() === domain;
            const matchesTerm = !term || [
                project.projectName,
                project.teamLead,
                project.regNumber,
                project.email,
                project.domain
            ].some(value => value?.toLowerCase().includes(term));
            return matchesStatus && matchesDomain && matchesTerm;
        });

        this.currentPage = 1;
        this.displayProjects();
        this.renderPagination();
    }
}
