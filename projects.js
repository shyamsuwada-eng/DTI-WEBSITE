// Projects Page Logic
// Handle project listing, filtering, searching, and display
import { db } from './firebase.js';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    addDoc,
    updateDoc,
    doc,
    orderBy 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { registerServiceWorker, requestNotificationPermission, notificationManager } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const projectsManager = new ProjectsManager();
    projectsManager.init();

    // Register PWA service worker
    registerServiceWorker();
    requestNotificationPermission();
});

class ProjectsManager {
    constructor() {
        this.projects = [];
        this.searchTerm = '';
        this.domainFilter = 'all';
        this.yearFilter = 'all';
        this.techFilter = 'all';
        this.session = null;
    }

    // Initialize projects manager
    async init() {
        this.loadSession();
        this.setupFilterListeners();
        this.setupSearchListeners();
        this.setupAddProjectListener();
        this.setupProjectListeners();
        await this.loadProjects();
    }

    // Load approved projects from Firestore
    async loadProjects() {
        console.log('Loading projects from Firestore...');
        const grid = document.getElementById('projectsGrid');
        if (grid) grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--muted);">Loading projects...</div>';

        try {
            // Load approved projects only
            // This query requires a Firestore composite index on status + createdAt.
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

            // Sort locally by createdAt desc
            this.projects.sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            });

            this.displayProjects(this.projects);
            this.setupRecommendations();
        } catch (error) {
            console.error("Error loading projects:", error);
            const needsIndex = error.message && error.message.toLowerCase().includes("requires an index");
            const indexHint = needsIndex ? `
                    <p style="margin-top: 8px; font-size: 14px; color: #b91c1c; max-width: 560px; margin: 0 auto;">
                        Firestore requires a composite index for this query: <strong>status</strong> Ascending + <strong>createdAt</strong> Descending.
                        Create it in Firebase Console → Firestore Database → Indexes → Composite Indexes.
                    </p>` : "";

            if (grid) grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: red;">
                        Error: ${error.message}${indexHint}
                    </div>`;
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
            <div class="card" data-project-id="${project.id}">
                <div class="top">
                    <img src="${project.photoUrl || 'logo.webp'}" class="thumb" alt="${project.projectName}" onerror="this.src='https://via.placeholder.com/150?text=Project'">
                    <div>
                        <span class="tag">${project.domain.toUpperCase()}</span>
                        <h3 class="title">${project.projectName}</h3>
                        <p class="team">Lead: ${project.teamLead || 'Anonymous'}</p>
                        <div class="rating-summary">
                            ${this.renderStars(project.averageRating || 0)}
                            <span>${project.ratingCount ? `${Number(project.averageRating).toFixed(1)} (${project.ratingCount})` : 'Not rated yet'}</span>
                        </div>
                    </div>
                </div>
                <p style="font-size: 14px; color: var(--text-dark); margin-bottom: 16px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
                    ${project.description}
                </p>
                <div class="actions">
                    <button onclick="window.open('${project.documentUrl}', '_blank')">Documentation</button>
                    ${project.videoUrl ? `<button onclick="window.open('${project.videoUrl}', '_blank')">Watch Video</button>` : ''}
                    <button class="btn-comment-toggle" data-id="${project.id}" type="button">Comments</button>
                    <span class="comment-count" id="comment-count-${project.id}" style="margin-left:auto; font-size: 13px; color: var(--muted);">0 comments</span>
                </div>
                <div class="comments-panel" id="commentsPanel-${project.id}" style="display:none; margin-top: 18px;">
                    <div class="comments-summary" id="commentsList-${project.id}">
                        <div class="comment-loading">Loading comments...</div>
                    </div>
                    <div class="comment-actions" style="margin-top: 16px;">
                        ${this.session ? `
                            <form class="comment-form" data-project-id="${project.id}">
                                ${this.canRateProject() ? `
                                    <label for="rating-${project.id}" style="display:block; font-size:13px; color:var(--muted); margin-bottom:8px;">Star Rating</label>
                                    <select id="rating-${project.id}" name="rating" style="width:100%; padding:10px 14px; border-radius:10px; border:1px solid var(--border); margin-bottom:12px;">
                                        <option value="">No rating</option>
                                        <option value="5">5 - Excellent</option>
                                        <option value="4">4 - Very Good</option>
                                        <option value="3">3 - Good</option>
                                        <option value="2">2 - Needs Improvement</option>
                                        <option value="1">1 - Poor</option>
                                    </select>
                                ` : ''}
                                <textarea name="comment" rows="3" placeholder="Write a comment..." style="width:100%; padding:14px; border-radius:12px; border:1px solid var(--border); margin-bottom:12px;"></textarea>
                                <button class="btn-action btn-comment-submit" type="submit">Post Comment</button>
                            </form>
                        ` : `
                            <div class="comment-login-prompt" style="font-size: 14px; color: var(--muted);">
                                Log in as Faculty, Student, or Admin to add feedback. <a href="login.html">Sign in</a>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Load saved session for comment permissions
    loadSession() {
        const sessionStr = localStorage.getItem('dti_session');
        if (!sessionStr) return;

        try {
            this.session = JSON.parse(sessionStr);
        } catch (error) {
            console.warn('Projects: Invalid session data', error);
            this.session = null;
        }
    }

    canRateProject() {
        return this.session && (this.session.role === 'Faculty' || this.session.role === 'Admin');
    }

    renderStars(rating) {
        const rounded = Math.round(Number(rating) || 0);
        return `
            <span class="rating-stars" aria-label="Project rating">
                ${[1, 2, 3, 4, 5].map((star) => `
                    <span class="star ${star <= rounded ? 'filled' : ''}">${star <= rounded ? '&#9733;' : '&#9734;'}</span>
                `).join('')}
            </span>
        `;
    }

    setupProjectListeners() {
        const grid = document.getElementById('projectsGrid');
        if (!grid) return;

        grid.addEventListener('click', (event) => this.handleProjectGridClick(event));
        grid.addEventListener('submit', (event) => this.handleCommentSubmit(event));
    }

    setupSearchListeners() {
        // no-op placeholder for built-in search event handling
    }

    setupAddProjectListener() {
        const addBtn = document.getElementById('addProjectBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const sessionStr = localStorage.getItem('dti_session');
                if (!sessionStr) {
                    alert('Please login first to submit a project.');
                    window.location.href = 'login.html';
                    return;
                }

                try {
                    JSON.parse(sessionStr);
                } catch (error) {
                    localStorage.removeItem('dti_session');
                    alert('Your session is invalid. Please login again.');
                    window.location.href = 'login.html';
                    return;
                }

                window.location.href = 'submit.html';
            });
        }
    }

    handleProjectGridClick(event) {
        const button = event.target.closest('.btn-comment-toggle');
        if (!button) return;

        const projectId = button.dataset.id;
        const panel = document.getElementById(`commentsPanel-${projectId}`);
        if (!panel) return;

        const isHidden = panel.style.display === 'none' || panel.style.display === '';
        panel.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            this.loadComments(projectId);
        }
    }

    async handleCommentSubmit(event) {
        const form = event.target.closest('.comment-form');
        if (!form) return;
        event.preventDefault();

        const projectId = form.dataset.projectId;
        const textarea = form.querySelector('textarea[name="comment"]');
        const commentText = textarea?.value?.trim();
        const ratingValue = form.querySelector('select[name="rating"]')?.value || '';
        const rating = ratingValue ? parseInt(ratingValue, 10) : null;

        if (!projectId) return;
        if (!this.session || !['Student', 'Faculty', 'Admin'].includes(this.session.role)) {
            alert('You must be logged in as Faculty, Student, or Admin to post comments.');
            window.location.href = 'login.html';
            return;
        }

        if (rating && !this.canRateProject()) {
            notificationManager.show('Only faculty and admins can submit star ratings.', 'warning');
            return;
        }

        if (!commentText && !rating) {
            notificationManager.show('Add a comment or rating before submitting.', 'warning');
            return;
        }

        try {
            await addDoc(collection(db, 'projects', projectId, 'feedback'), {
                comment: commentText || '',
                rating: rating || null,
                userEmail: this.session.email || 'anonymous@dti.edu',
                userRole: this.session.role,
                createdAt: new Date()
            });

            if (rating) {
                await this.updateProjectRatingSummary(projectId);
                await this.loadProjects();
            }

            if (textarea) textarea.value = '';
            const ratingSelect = form.querySelector('select[name="rating"]');
            if (ratingSelect) ratingSelect.value = '';
            this.loadComments(projectId);
            notificationManager.show('Feedback posted successfully!', 'success');
        } catch (error) {
            console.error('Error posting comment:', error);
            notificationManager.show('Unable to post comment. Please try again.', 'error');
        }
    }

    async loadComments(projectId) {
        const commentsList = document.getElementById(`commentsList-${projectId}`);
        const commentCount = document.getElementById(`comment-count-${projectId}`);
        if (!commentsList) return;

        commentsList.innerHTML = '<div class="comment-loading">Loading comments...</div>';

        try {
            const commentsQuery = query(collection(db, 'projects', projectId, 'feedback'), orderBy('createdAt', 'desc'));
            const commentSnapshot = await getDocs(commentsQuery);
            const comments = [];
            commentSnapshot.forEach((doc) => comments.push({ id: doc.id, ...doc.data() }));
            const ratings = comments
                .map((comment) => comment.rating)
                .filter((value) => typeof value === 'number' && value >= 1 && value <= 5);
            const avgRating = ratings.length ? (ratings.reduce((sum, value) => sum + value, 0) / ratings.length) : 0;

            if (commentCount) {
                commentCount.textContent = `${comments.length} comment${comments.length === 1 ? '' : 's'}`;
            }

            if (comments.length === 0) {
                commentsList.innerHTML = '<div class="comment-empty">No comments yet. Be the first to share feedback.</div>';
                return;
            }

            commentsList.innerHTML = `
                <div class="feedback-summary-header">
                    ${ratings.length ? `${this.renderStars(avgRating)} <span>${avgRating.toFixed(1)} average from ${ratings.length} rating${ratings.length === 1 ? '' : 's'}</span>` : '<span>No ratings yet</span>'}
                </div>
                ${comments.map((comment) => {
                    const createdAt = comment.createdAt?.toDate ? comment.createdAt.toDate() : new Date(comment.createdAt);
                    const friendlyDate = createdAt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    return `
                        <div class="comment-item">
                            <div class="comment-meta">${comment.userRole || 'User'} &bull; ${comment.userEmail || 'Anonymous'} &bull; ${friendlyDate}</div>
                            ${comment.rating ? `<div class="comment-rating">${this.renderStars(comment.rating)} <span>${comment.rating}/5</span></div>` : ''}
                            ${comment.comment ? `<p>${comment.comment}</p>` : ''}
                        </div>
                    `;
                }).join('')}
            `;
        } catch (error) {
            console.error('Error loading comments:', error);
            commentsList.innerHTML = '<div class="comment-error">Unable to load comments at this time.</div>';
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

    // Setup filter event listeners
    setupFilterListeners() {
        // Enhanced search input with live suggestions
        const searchInput = document.getElementById('searchInput') || document.querySelector('.search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.showSearchSuggestions(e.target.value);
                this.applyFilters();
            });
        }

        // Domain filter
        const domainFilter = document.getElementById('domainFilter') || document.querySelector('.select');
        if (domainFilter) {
            domainFilter.addEventListener('change', (e) => {
                this.domainFilter = e.target.value;
                this.applyFilters();
            });
        }

        // Year filter
        const yearFilter = document.getElementById('yearFilter');
        if (yearFilter) {
            yearFilter.addEventListener('change', (e) => {
                this.yearFilter = e.target.value;
                this.applyFilters();
            });
        }

        // Technology filter
        const techFilter = document.getElementById('techFilter');
        if (techFilter) {
            techFilter.addEventListener('change', (e) => {
                this.techFilter = e.target.value;
                this.applyFilters();
            });
        }

        // Clear filters
        const clearBtn = document.getElementById('clearFilters');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearFilters());
        }
    }

    // Show search suggestions
    showSearchSuggestions(query) {
        const suggestionsEl = document.getElementById('searchSuggestions');
        if (!suggestionsEl || !query) {
            if (suggestionsEl) suggestionsEl.style.display = 'none';
            return;
        }

        const suggestions = this.getSearchSuggestions(query);
        if (suggestions.length === 0) {
            suggestionsEl.style.display = 'none';
            return;
        }

        suggestionsEl.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-item" onclick="selectSuggestion('${suggestion.replace(/'/g, "\\'")}')">
                ${suggestion}
            </div>
        `).join('');
        suggestionsEl.style.display = 'block';
    }

    // Get search suggestions
    getSearchSuggestions(query) {
        const suggestions = new Set();
        const queryLower = query.toLowerCase();

        this.projects.forEach(project => {
            // Project names
            if (project.projectName.toLowerCase().includes(queryLower)) {
                suggestions.add(project.projectName);
            }
            // Team leads
            if (project.teamLead && project.teamLead.toLowerCase().includes(queryLower)) {
                suggestions.add(project.teamLead);
            }
            // Domains
            if (project.domain.toLowerCase().includes(queryLower)) {
                suggestions.add(project.domain);
            }
            // Keywords from description
            if (project.description) {
                const words = project.description.toLowerCase().split(/\s+/);
                words.forEach(word => {
                    if (word.includes(queryLower) && word.length > 3) {
                        suggestions.add(word);
                    }
                });
            }
        });

        return Array.from(suggestions).slice(0, 5);
    }

    // Apply all filters
    applyFilters() {
        let filtered = [...this.projects];

        // Search filter
        if (this.searchTerm) {
            filtered = filtered.filter(project =>
                project.projectName.toLowerCase().includes(this.searchTerm) ||
                (project.teamLead && project.teamLead.toLowerCase().includes(this.searchTerm)) ||
                project.domain.toLowerCase().includes(this.searchTerm) ||
                (project.description && project.description.toLowerCase().includes(this.searchTerm))
            );
        }

        // Domain filter
        if (this.domainFilter && this.domainFilter !== 'all') {
            filtered = filtered.filter(project => project.domain === this.domainFilter);
        }

        // Year filter
        if (this.yearFilter && this.yearFilter !== 'all') {
            filtered = filtered.filter(project => project.year === this.yearFilter);
        }

        // Technology filter (based on auto-tagging)
        if (this.techFilter && this.techFilter !== 'all') {
            filtered = filtered.filter(project => {
                const tags = this.getProjectTags(project);
                return tags.includes(this.techFilter);
            });
        }

        this.displayProjects(filtered);
    }

    // Clear all filters
    clearFilters() {
        this.searchTerm = '';
        this.domainFilter = '';
        this.yearFilter = '';
        this.techFilter = '';

        const searchInput = document.getElementById('searchInput') || document.querySelector('.search');
        const domainFilter = document.getElementById('domainFilter') || document.querySelector('.select');
        const yearFilter = document.getElementById('yearFilter');
        const techFilter = document.getElementById('techFilter');

        if (searchInput) searchInput.value = '';
        if (domainFilter) domainFilter.value = 'all';
        if (yearFilter) yearFilter.value = 'all';
        if (techFilter) techFilter.value = 'all';

        this.displayProjects(this.projects);
    }

    // Get project tags for filtering
    getProjectTags(project) {
        const tags = [];
        const text = `${project.projectName} ${project.description || ''}`.toLowerCase();

        // Technology keywords
        const techKeywords = {
            'AI': ['artificial intelligence', 'machine learning', 'deep learning', 'neural network'],
            'IoT': ['internet of things', 'iot', 'sensors', 'embedded'],
            'Web': ['web', 'website', 'html', 'css', 'javascript', 'react', 'angular'],
            'Mobile': ['mobile', 'android', 'ios', 'app'],
            'Robotics': ['robot', 'automation', 'control system'],
            'Cybersecurity': ['security', 'encryption', 'hacking', 'cyber'],
            'Cloud': ['cloud', 'aws', 'azure', 'firebase'],
            'Data Science': ['data', 'analytics', 'big data', 'visualization']
        };

        Object.entries(techKeywords).forEach(([tech, keywords]) => {
            if (keywords.some(keyword => text.includes(keyword))) {
                tags.push(tech);
            }
        });

        return tags;
    }

    // Setup project recommendations
    setupRecommendations() {
        const recommendationsEl = document.getElementById('projectRecommendations');
        if (!recommendationsEl) return;

        const recommendations = this.getProjectRecommendations();
        if (recommendations.length === 0) return;

        recommendationsEl.innerHTML = `
            <h3>Recommended Projects</h3>
            <div class="recommendations-grid">
                ${recommendations.map(project => `
                    <div class="recommendation-card" onclick="viewProject('${project.id}')">
                        <h4>${project.projectName}</h4>
                        <p>${project.domain}</p>
                        <div class="tags">
                            ${this.getProjectTags(project).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        recommendationsEl.style.display = 'block';
    }

    // Get project recommendations based on popularity and recency
    getProjectRecommendations() {
        // Simple recommendation: most recent approved projects
        return this.projects
            .filter(project => project.status === 'approved')
            .sort((a, b) => {
                const dateA = a.createdAt?.seconds || 0;
                const dateB = b.createdAt?.seconds || 0;
                return dateB - dateA;
            })
            .slice(0, 6);
    }
}

// Global functions for search suggestions
window.selectSuggestion = function(suggestion) {
    const searchInput = document.getElementById('searchInput') || document.querySelector('.search');
    if (searchInput) {
        searchInput.value = suggestion;
        searchInput.dispatchEvent(new Event('input'));
    }
    const suggestionsEl = document.getElementById('searchSuggestions');
    if (suggestionsEl) suggestionsEl.style.display = 'none';
};

window.viewProject = function(projectId) {
    // Scroll to project in grid
    const projectCard = document.querySelector(`[data-project-id="${projectId}"]`);
    if (projectCard) {
        projectCard.scrollIntoView({ behavior: 'smooth' });
        projectCard.style.boxShadow = '0 0 0 3px var(--accent)';
        setTimeout(() => {
            projectCard.style.boxShadow = '';
        }, 2000);
    }
};
