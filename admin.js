// Admin Dashboard Logic
// Session validation for admin access
import { db, auth } from './firebase.js';
import { 
    collection, 
    query, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc,
    orderBy 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

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
  const adminDashboard = new AdminDashboard();
  adminDashboard.init();
});

class AdminDashboard {
    constructor() {
        this.projects = [];
        this.stats = {
            totalProjects: 0,
            approved: 0,
            pending: 0,
            rejected: 0
        };
    }

    // Initialize admin dashboard
    async init() {
        await this.loadProjects();
        this.setupEventListeners();
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

            this.updateStatistics();
            this.displayProjects(this.projects);
        } catch (error) {
            console.error("Error loading projects:", error);
            if (projectsTableBody) projectsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red">Error loading projects.</td></tr>';
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

        if (totalEl) totalEl.textContent = this.stats.totalProjects;
        if (approvedEl) approvedEl.textContent = this.stats.approved;
        if (pendingEl) pendingEl.textContent = this.stats.pending;
    }

    // Display projects in table
    displayProjects(projects) {
        const tableBody = document.getElementById('projectsTableBody');
        if (!tableBody) return;

        if (projects.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">No projects found.</td></tr>';
            return;
        }

        tableBody.innerHTML = projects.map(project => `
            <tr>
                <td>
                    <div class="project-name">${project.projectName}</div>
                    <div class="project-domain">${project.domain} | ${project.year} Year</div>
                </td>
                <td>
                    <div>${project.teamLead || 'N/A'}</div>
                    <div style="font-size: 12px; color: var(--muted)">${project.email || ''}</div>
                </td>
                <td>${project.createdAt ? new Date(project.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <span class="status-badge status-${project.status || 'pending'}">
                        ${project.status || 'pending'}
                    </span>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="btn-action btn-view" onclick="window.open('${project.documentUrl}', '_blank')">View Doc</button>
                        ${(project.status !== 'approved') ? `<button class="btn-action btn-approve" data-id="${project.id}">Approve</button>` : ''}
                        ${(project.status !== 'rejected') ? `<button class="btn-action btn-reject" data-id="${project.id}">Reject</button>` : ''}
                    </div>
                </td>
            </tr>
        `).join('');

        // Attach event listeners to new buttons
        tableBody.querySelectorAll('.btn-approve').forEach(btn => {
            btn.addEventListener('click', () => this.approveProject(btn.dataset.id));
        });
        tableBody.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', () => this.rejectProject(btn.dataset.id));
        });
    }

    // Approve project
    async approveProject(projectId) {
        if (!confirm('Are you sure you want to approve this project?')) return;
        try {
            await updateDoc(doc(db, "projects", projectId), {
                status: 'approved',
                updatedAt: new Date()
            });
            alert('Project approved successfully!');
            await this.loadProjects();
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
            alert('Project rejected.');
            await this.loadProjects();
        } catch (error) {
            console.error("Error rejecting project:", error);
            alert('Failed to reject project.');
        }
    }

    // Setup event listeners
    setupEventListeners() {
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.applyFilters());
        }

        const filterStatus = document.getElementById('filterStatus');
        if (filterStatus) {
            filterStatus.addEventListener('change', (e) => this.applyFilters());
        }

        const filterDomain = document.getElementById('filterDomain');
        if (filterDomain) {
            filterDomain.addEventListener('change', (e) => this.applyFilters());
        }
    }

    // Combined filter application
    applyFilters() {
        const status = document.getElementById('filterStatus')?.value || 'all';
        const domain = document.getElementById('filterDomain')?.value || 'all';
        const term = document.querySelector('.search-box input')?.value?.toLowerCase() || '';

        let filtered = this.projects;

        if (status !== 'all') {
            filtered = filtered.filter(p => p.status === status || (!p.status && status === 'pending'));
        }

        if (domain !== 'all') {
            filtered = filtered.filter(p => p.domain?.toLowerCase() === domain);
        }

        if (term) {
            filtered = filtered.filter(p => 
                p.projectName.toLowerCase().includes(term) || 
                (p.teamLead && p.teamLead.toLowerCase().includes(term))
            );
        }

        this.displayProjects(filtered);
    }
}
