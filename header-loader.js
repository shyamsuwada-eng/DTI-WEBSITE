document.addEventListener('DOMContentLoaded', async function() {
    await loadHeader();
    setupMobileMenu();
    setActiveLink();
    updateHeaderForSession();
});

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

            // 2. Show Admin Dashboard link if Admin
            if (session.role === 'Admin') {
                const adminLi = document.createElement('li');
                adminLi.innerHTML = '<a href="admin-dashboard.html" class="nav-link admin-only-link" style="color: #ef4444; font-weight: 700;">Admin Dashboard</a>';
                if (loginLi) {
                    topNavMenu.insertBefore(adminLi, loginLi);
                } else {
                    topNavMenu.appendChild(adminLi);
                }
            }
        } catch (e) {
            console.warn('Header: Failed to process session', e);
        }
    }
}

async function loadHeader() {
    try {
        // Fetch header.html from root
        const response = await fetch('header.html');
        if (!response.ok) throw new Error('Failed to load header');
        
        const headerHTML = await response.text();
        
        // Insert header at the very beginning of body
        const body = document.body;
        const headerContainer = document.createElement('div');
        headerContainer.innerHTML = headerHTML;
        body.insertBefore(headerContainer.firstElementChild, body.firstChild);
        
    } catch (error) {
        console.warn('Could not load header.html dynamically:', error);
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
