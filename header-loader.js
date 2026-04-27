document.addEventListener('DOMContentLoaded', async function() {
    await loadHeader();
    setupMobileMenu();
    setActiveLink();
    updateHeaderForSession();
    registerServiceWorker();
});

function getFallbackHeaderHTML() {
    return `
<header class="top-header">
    <div class="header-container">
        <div class="brand">
            <div class="logo">
                <img src="logo.webp" alt="LIET logo" class="logo-img" style="width: 50px; height: 50px; object-fit: contain;">
            </div>
            <div class="brand-text">
                <h1 class="college-name">Lendi Institute of Engineering & Technology</h1>
                <p class="department-name">ECE Department • DTI Lab</p>
            </div>
        </div>
        <nav class="top-nav">
            <button class="mobile-menu-btn" id="mobileMenuBtn" aria-label="Toggle Menu">
                <span></span><span></span><span></span>
            </button>
            <ul class="top-nav-menu" id="topNavMenu">
                <li><a href="index.html" class="nav-link">Home</a></li>
                <li><a href="projects.html" class="nav-link">Projects</a></li>
                <li><a href="about.html" class="nav-link">About</a></li>
                <li><a href="submit.html" class="nav-link">Submit Project</a></li>
                <li><a href="login.html" class="nav-link btn-login">Login</a></li>
            </ul>
        </nav>
    </div>
</header>
`;
}

function mountHeaderMarkup(headerHTML) {
    const body = document.body;
    const headerContainer = document.createElement('div');
    headerContainer.innerHTML = headerHTML;
    const headerElement = headerContainer.querySelector('header') || headerContainer.firstElementChild;
    if (headerElement) {
        body.insertBefore(headerElement, body.firstChild);
        return true;
    }
    return false;
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registered from header-loader:', registration.scope);
            })
            .catch(error => {
                console.warn('Service Worker registration failed:', error);
            });
    }
}

function updateHeaderForSession() {
    const sessionStr = localStorage.getItem('dti_session');
    const topNavMenu = document.getElementById('topNavMenu');
    if (!topNavMenu) return;

    const loginLi = topNavMenu.querySelector('.btn-login')?.parentElement;
    
    if (sessionStr) {
        try {
            const session = JSON.parse(sessionStr);
            
            // 1. Show Logout instead of Login
            if (loginLi) {
                loginLi.innerHTML = '<a href="#" class="nav-link btn-logout" id="logoutBtn">Logout</a>';
                document.getElementById('logoutBtn').addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.removeItem('dti_session');
                    window.location.href = 'index.html';
                });
            }

            // 2. Show dashboard link for Admin and Faculty
            if (session.role === 'Admin') {
                const adminLi = document.createElement('li');
                adminLi.innerHTML = '<a href="admin-dashboard.html" class="nav-link admin-only-link" style="color: #ef4444; font-weight: 700;">Admin Dashboard</a>';
                if (loginLi) {
                    topNavMenu.insertBefore(adminLi, loginLi);
                } else {
                    topNavMenu.appendChild(adminLi);
                }
            }

            if (session.role === 'Faculty') {
                const facultyLi = document.createElement('li');
                facultyLi.innerHTML = '<a href="faculty-dashboard.html" class="nav-link faculty-only-link" style="color: #0f766e; font-weight: 700;">Faculty Dashboard</a>';
                if (loginLi) {
                    topNavMenu.insertBefore(facultyLi, loginLi);
                } else {
                    topNavMenu.appendChild(facultyLi);
                }
            }
        } catch (e) {
            console.warn('Header: Failed to process session', e);
        }
    }
}

async function loadHeader() {
    try {
        // Try fetching relative to the current page first
        let response = await fetch('header.html');
        
        // If that fails (e.g., in a subfolder or due to server config), try root-relative
        if (!response.ok) {
            console.log('Header: Relative fetch failed, trying root-relative path...');
            response = await fetch('/header.html');
        }

        // If both failed, try adding ./ prefix just in case some servers prefer it
        if (!response.ok) {
            response = await fetch('./header.html');
        }

        if (!response.ok) throw new Error('Failed to load header from any path');
        
        const headerHTML = await response.text();
        const mounted = mountHeaderMarkup(headerHTML);
        if (!mounted) {
            mountHeaderMarkup(getFallbackHeaderHTML());
        }
    } catch (error) {
        console.error('Header Loader Error:', error);
        console.warn('Could not load header.html dynamically. Rendering fallback header.');
        mountHeaderMarkup(getFallbackHeaderHTML());
    }
}

function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const topNavMenu = document.getElementById('topNavMenu');
    
    if (!mobileMenuBtn || !topNavMenu) return;
    
    mobileMenuBtn.addEventListener('click', function() {
        topNavMenu.classList.toggle('active');
        mobileMenuBtn.classList.toggle('active');
    });
    
    // Close menu when a link is clicked
    const navLinks = topNavMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            topNavMenu.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        });
    });
}

function setActiveLink() {
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
