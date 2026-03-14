// Header Navigation Logic
// Handle header functionality, mobile menu, and active link highlighting

class HeaderManager {
    constructor() {
        this.mobileMenuOpen = false;
    }

    // Initialize header
    init() {
        this.setupMobileMenu();
        this.setActiveNavLink();
        this.setupResponsiveListeners();
    }

    // Setup mobile menu toggle
    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const navMenu = document.getElementById('topNavMenu');

        if (mobileMenuBtn && navMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                this.toggleMobileMenu(navMenu, mobileMenuBtn);
            });

            // Close menu when link is clicked
            navMenu.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                    mobileMenuBtn.classList.remove('active');
                    this.mobileMenuOpen = false;
                });
            });
        }
    }

    // Toggle mobile menu
    toggleMobileMenu(navMenu, btn) {
        this.mobileMenuOpen = !this.mobileMenuOpen;
        navMenu.classList.toggle('active');
        btn.classList.toggle('active');
    }

    // Set active navigation link based on current page
    setActiveNavLink() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage || (currentPage === '' && href === 'index.html')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Setup responsive listeners for window resize
    setupResponsiveListeners() {
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                const navMenu = document.getElementById('topNavMenu');
                const mobileMenuBtn = document.getElementById('mobileMenuBtn');
                if (navMenu) navMenu.classList.remove('active');
                if (mobileMenuBtn) mobileMenuBtn.classList.remove('active');
                this.mobileMenuOpen = false;
            }
        });
    }
}

// Initialize header manager
const headerManager = new HeaderManager();
