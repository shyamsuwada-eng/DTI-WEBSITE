// Projects Page Logic
// Handle project listing, filtering, searching, and display
import { db } from './firebase.js';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const projectsManager = new ProjectsManager();
    projectsManager.init();
});

class ProjectsManager {
    constructor() {
        this.projects = [];
        this.searchTerm = '';
    }

    // Initialize projects manager
    async init() {
        await this.loadProjects();
        this.setupFilterListeners();
        this.setupSearchListeners();
        this.setupAddProjectListener();
    }

    // Load approved projects from Firestore
    async loadProjects() {
        console.log('Loading projects from Firestore...');
        const grid = document.getElementById('projectsGrid');
        if (grid) grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted);">Loading projects...</div>';

        try {
            const q = query(
                collection(db, "projects"), 
                where("status", "==", "approved"),
                orderBy("createdAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            this.projects = [];
            
            querySnapshot.forEach((doc) => {
                this.projects.push({ id: doc.id, ...doc.data() });
            });

            this.displayProjects(this.projects);
        } catch (error) {
            console.error("Error loading projects:", error);
            if (grid) grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: red;">Error loading projects.</div>';
        }
    }

    // Display projects on page
    displayProjects(projects) {
        const grid = document.getElementById('projectsGrid');
        if (!grid) return;

        if (projects.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--muted);">
                    <p style="font-size: 18px; margin: 0;">No projects found</p>
                    <p style="margin-top: 8px;">Be the first to <a href="submit.html" style="color: var(--accent); text-decoration: none; font-weight: 600;">submit your project</a></p>
                </div>
            `;
            return;
        }

        grid.innerHTML = projects.map(project => `
            <div class="card">
                <div class="top">
                    <img src="${project.photoUrl || 'assets/images/default-project.jpg'}" class="thumb" alt="${project.projectName}" onerror="this.src='https://via.placeholder.com/150?text=Project'">
                    <div>
                        <span class="tag">${project.domain.toUpperCase()}</span>
                        <h3 class="title">${project.projectName}</h3>
                        <p class="team">Lead: ${project.teamLead || 'Anonymous'}</p>
                    </div>
                </div>
                <p style="font-size: 14px; color: var(--text-dark); margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                    ${project.description}
                </p>
                <div class="actions">
                    <button onclick="window.open('${project.documentUrl}', '_blank')">Documentation</button>
                    ${project.videoUrl ? `<button onclick="window.open('${project.videoUrl}', '_blank')">Watch Video</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    // Setup filter event listeners
    setupFilterListeners() {
        const filterSelect = document.querySelector('.select');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                const category = e.target.value.toLowerCase();
                if (category === 'all categories') {
                    this.displayProjects(this.projects);
                } else {
                    const filtered = this.projects.filter(p => p.domain.toLowerCase() === category || p.domain === category);
                    this.displayProjects(filtered);
                }
            });
        }
    }

    // Setup search event listeners
    setupSearchListeners() {
        const searchInput = document.querySelector('.search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = this.projects.filter(p => 
                    p.projectName.toLowerCase().includes(term) ||
                    p.description.toLowerCase().includes(term)
                );
                this.displayProjects(filtered);
            });
        }
    }

    setupAddProjectListener() {
        const addBtn = document.querySelector('.add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                window.location.href = 'submit.html';
            });
        }
    }
}
