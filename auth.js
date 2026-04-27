// Modular Firebase auth helper for login, role storage, and redirects
// This module auto-attaches to a form with id `loginForm` if present.
import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';
import { doc, setDoc, serverTimestamp, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

// Hard-coded admin UIDs (provided by project owner)
const ADMIN_UIDS = [
	'on9XbBtZrffB19QFi1BBAfGU1yK2', // Admin #2 (provided)
];

// Faculty email domains for auto-role assignment
const FACULTY_DOMAINS = ['lendi.edu.in', 'faculty.lendi.edu.in'];

// Role-based redirect mapping
const ROLE_REDIRECTS = {
	'Student': 'projects.html',
	'Faculty': 'faculty-dashboard.html',
	'Admin': 'admin-dashboard.html'
};

// Notification system
function showNotification(message, type = 'info') {
	const notification = document.createElement('div');
	notification.className = `notification notification-${type}`;
	notification.innerHTML = `
		<div class="notification-content">
			<span class="notification-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
			<span class="notification-message">${message}</span>
		</div>
		<button class="notification-close" onclick="this.parentElement.remove()">×</button>
	`;

	document.body.appendChild(notification);

	// Auto remove after 5 seconds
	setTimeout(() => {
		if (notification.parentElement) {
			notification.remove();
		}
	}, 5000);
}

// Make notification function globally available
window.showNotification = showNotification;

async function handleLoginEvent(e) {
	e.preventDefault();
	const roleEl = document.getElementById('role');
	const emailEl = document.getElementById('email');
	const passEl = document.getElementById('password');
	const errEl = document.getElementById('error');
	if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

	let role = roleEl ? roleEl.value : 'Student';
	const email = emailEl ? emailEl.value.trim() : '';
	const password = passEl ? passEl.value : '';

	console.log('Login attempt:', email, password); // Debug

	// Hardcoded Admin Account Bypass
	const normalizedEmail = email.toLowerCase();
	console.log('Checking hardcoded bypass for:', normalizedEmail);
	if (normalizedEmail === 'admin@lendi.edu.in' && password === 'Admin123!') {
		console.log('Hardcoded admin credentials MATCHED!');
		const session = {
			uid: 'hardcoded-admin-123',
			email: 'admin@lendi.edu.in',
			role: 'Admin',
			token: 'dummy-token',
			timestamp: Date.now()
		};
		console.log('Setting session:', session);
		localStorage.setItem('dti_session', JSON.stringify(session));
		console.log('Redirecting to admin-dashboard.html...');
		window.location.href = 'admin-dashboard.html';
		return;
	}

	if (normalizedEmail === 'faculty@gmail.com' && password === 'faculty123!') {
		console.log('Hardcoded faculty credentials MATCHED!');
		const session = {
			uid: 'hardcoded-faculty-123',
			email: 'faculty@gmail.com',
			role: 'Faculty',
			token: 'dummy-token',
			timestamp: Date.now()
		};
		console.log('Setting session:', session);
		localStorage.setItem('dti_session', JSON.stringify(session));
		console.log('Redirecting to faculty-dashboard.html...');
		window.location.href = 'faculty-dashboard.html';
		return;
	}

	console.log('No bypass match, proceeding to Firebase...');
	try {
		const cred = await signInWithEmailAndPassword(auth, email, password);
		const user = cred.user;

		// Determine role based on email domain or stored role
		let userRole = role;

		// Check if email domain indicates faculty
		const emailDomain = email.split('@')[1]?.toLowerCase();
		if (FACULTY_DOMAINS.includes(emailDomain)) {
			userRole = 'Faculty';
		}

		// Force admin role for whitelisted UIDs
		if (ADMIN_UIDS.includes(user.uid)) {
			userRole = 'Admin';
		}

		// Check if user role exists in Firestore
		try {
			const userDoc = await getDoc(doc(db, 'users', user.uid));
			if (userDoc.exists()) {
				const storedRole = userDoc.data().role;
				if (storedRole) userRole = storedRole;
			}
		} catch (fsErr) {
			console.warn('Failed to read role from Firestore', fsErr);
		}

		// Store/update role in Firestore users collection
		try {
			await setDoc(doc(db, 'users', user.uid), {
				email: user.email,
				role: userRole,
				updatedAt: serverTimestamp(),
				lastLogin: serverTimestamp()
			}, { merge: true });
		} catch (fsErr) {
			console.warn('Failed to write role to Firestore', fsErr);
		}

		const token = await user.getIdToken();
		const session = {
			uid: user.uid,
			email: user.email,
			role: userRole,
			token,
			timestamp: Date.now()
		};
		localStorage.setItem('dti_session', JSON.stringify(session));

		// Show success message
		showNotification(`Welcome back, ${userRole}!`, 'success');

		// Redirect based on role
		const redirectUrl = ROLE_REDIRECTS[userRole] || 'projects.html';
		setTimeout(() => {
			window.location.href = redirectUrl;
		}, 1000);

	} catch (err) {
		console.error('Login failed', err);
		if (errEl) {
			errEl.style.display = 'block';
			errEl.textContent = err.message || 'Login failed';
		}
		showNotification('Login failed. Please check your credentials.', 'error');
	}
}

// Exported helper for manual invocation
export async function loginWithRole(email, password, role) {
	const cred = await signInWithEmailAndPassword(auth, email, password);
	const user = cred.user;
	await setDoc(doc(db, 'users', user.uid), { email: user.email, role, updatedAt: serverTimestamp() }, { merge: true });
	const token = await user.getIdToken();
	const session = { uid: user.uid, email: user.email, role, token };
	localStorage.setItem('dti_session', JSON.stringify(session));
	return session;
}

export function signOut() {
	return auth.signOut().then(() => { localStorage.removeItem('dti_session'); });
}

// Handle Forgot Password
async function handleForgotPassword(e) {
	e.preventDefault();
	const emailEl = document.getElementById('email');
	const errEl = document.getElementById('error');
	const successEl = document.getElementById('success'); // Need a success element

	if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
	if (successEl) { successEl.style.display = 'none'; successEl.textContent = ''; }

	const email = emailEl ? emailEl.value.trim() : '';

	if (!email) {
		if (errEl) {
			errEl.style.display = 'block';
			errEl.textContent = 'Please enter your email address first.';
		}
		return;
	}

	try {
		await sendPasswordResetEmail(auth, email);
		if (successEl) {
			successEl.style.display = 'block';
			successEl.textContent = `Reset link sent to ${email}.`;
		}
	} catch (err) {
		if (errEl) {
			errEl.style.display = 'block';
			errEl.textContent = err.message || 'Failed to send reset email.';
		}
	}
}

// Auto-attach
if (typeof document !== 'undefined') {
	const form = document.getElementById('loginForm');
	if (form) { form.addEventListener('submit', handleLoginEvent); }

	const forgotBtn = document.getElementById('forgotPasswordBtn');
	if (forgotBtn) { forgotBtn.addEventListener('click', handleForgotPassword); }
}
