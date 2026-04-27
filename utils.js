// Utility functions for QR codes, certificates, and advanced features
import { db, storage } from './firebase.js';
import { doc, updateDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// QR Code Generation
export function generateQRCode(projectId) {
    // Using a simple QR code service - in production, use a proper QR library
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/project.html?id=' + projectId)}`;
    return qrUrl;
}

// Certificate Generation
export function generateCertificate(projectData) {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');

    // Certificate background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 600);

    // Border
    ctx.strokeStyle = '#003366';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, 760, 560);

    // Header
    ctx.fillStyle = '#003366';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Lendi Institute of Engineering & Technology', 400, 80);

    ctx.font = 'bold 28px Arial';
    ctx.fillText('Certificate of Project Completion', 400, 120);

    // Certificate text
    ctx.fillStyle = '#000000';
    ctx.font = '24px Arial';
    ctx.fillText('This is to certify that', 400, 200);

    ctx.font = 'bold 32px Arial';
    ctx.fillText(projectData.teamLead || 'Student Name', 400, 250);

    ctx.font = '20px Arial';
    ctx.fillText('has successfully completed the project entitled', 400, 300);

    ctx.font = 'bold 24px Arial';
    ctx.fillText(`"${projectData.projectName}"`, 400, 340);

    ctx.font = '18px Arial';
    ctx.fillText(`Domain: ${projectData.domain}`, 400, 380);
    ctx.fillText(`Guide: ${projectData.guideName || 'Faculty Guide'}`, 400, 410);

    // Date
    const date = new Date().toLocaleDateString();
    ctx.fillText(`Date: ${date}`, 400, 450);

    // Signatures
    ctx.font = '16px Arial';
    ctx.fillText('Project Guide', 150, 520);
    ctx.fillText('HOD, ECE Department', 550, 520);

    return canvas.toDataURL('image/png');
}

// Auto-categorize project
export function categorizeProject(projectData) {
    const text = `${projectData.projectName} ${projectData.description || ''}`.toLowerCase();
    const categories = [];

    const categoryKeywords = {
        'AI': ['artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'ai'],
        'IoT': ['internet of things', 'iot', 'sensors', 'embedded systems', 'raspberry pi', 'arduino'],
        'Web Development': ['web', 'website', 'html', 'css', 'javascript', 'react', 'angular', 'vue', 'node.js'],
        'Mobile Development': ['mobile', 'android', 'ios', 'app', 'flutter', 'react native'],
        'Robotics': ['robot', 'automation', 'control system', 'plc', 'drone'],
        'Cybersecurity': ['security', 'encryption', 'hacking', 'cyber', 'blockchain', 'cryptography'],
        'Cloud Computing': ['cloud', 'aws', 'azure', 'firebase', 'docker', 'kubernetes'],
        'Data Science': ['data', 'analytics', 'big data', 'visualization', 'python', 'pandas', 'machine learning'],
        'Signal Processing': ['signal', 'processing', 'dsp', 'fft', 'filter'],
        'Wireless Communication': ['wireless', 'communication', 'rf', 'bluetooth', 'wifi', 'gsm']
    };

    Object.entries(categoryKeywords).forEach(([category, keywords]) => {
        if (keywords.some(keyword => text.includes(keyword))) {
            categories.push(category);
        }
    });

    return categories.length > 0 ? categories : ['Other'];
}

// Project recommendations based on branch
export function getBranchRecommendations(branch) {
    const recommendations = {
        'ECE': [
            { title: 'IoT Smart Home System', domain: 'IoT', description: 'Build a comprehensive smart home automation system' },
            { title: 'Wireless Communication Network', domain: 'Wireless Communication', description: 'Design and implement a wireless sensor network' },
            { title: 'Signal Processing for Audio', domain: 'Signal Processing', description: 'Develop audio processing algorithms' },
            { title: 'Embedded Robotics Controller', domain: 'Robotics', description: 'Create an embedded system for robotic control' }
        ],
        'CSE': [
            { title: 'AI-Powered Chatbot', domain: 'AI', description: 'Build an intelligent conversational AI system' },
            { title: 'Web Application Platform', domain: 'Web Development', description: 'Develop a full-stack web application' },
            { title: 'Mobile Health App', domain: 'Mobile Development', description: 'Create a healthcare mobile application' },
            { title: 'Data Analytics Dashboard', domain: 'Data Science', description: 'Build a real-time data visualization platform' }
        ]
    };

    return recommendations[branch] || recommendations['ECE'];
}

// Rating system
export async function submitRating(projectId, rating, comment, userEmail) {
    try {
        await addDoc(collection(db, 'ratings'), {
            projectId,
            rating: parseInt(rating),
            comment,
            userEmail,
            createdAt: new Date()
        });

        // Update project average rating
        await updateProjectRating(projectId);

        return { success: true };
    } catch (error) {
        console.error('Error submitting rating:', error);
        return { success: false, error: error.message };
    }
}

async function updateProjectRating(projectId) {
    // This would calculate and update the average rating for a project
    // Implementation depends on how ratings are stored and displayed
}

// Notification system
export class NotificationManager {
    constructor() {
        this.notifications = [];
    }

    show(message, type = 'info', duration = 5000) {
        const notification = {
            id: Date.now(),
            message,
            type,
            duration
        };

        this.notifications.push(notification);
        this.render(notification);

        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification.id);
            }, duration);
        }
    }

    render(notification) {
        const container = this.getContainer();
        const element = document.createElement('div');
        element.className = `notification notification-${notification.type}`;
        element.id = `notification-${notification.id}`;

        element.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getIcon(notification.type)}</span>
                <span class="notification-message">${notification.message}</span>
            </div>
            <button class="notification-close" onclick="notificationManager.remove(${notification.id})">×</button>
        `;

        container.appendChild(element);

        // Animate in
        setTimeout(() => {
            element.style.transform = 'translateX(0)';
            element.style.opacity = '1';
        }, 10);
    }

    remove(id) {
        const element = document.getElementById(`notification-${id}`);
        if (element) {
            element.style.transform = 'translateX(100%)';
            element.style.opacity = '0';
            setTimeout(() => {
                element.remove();
            }, 300);
        }

        this.notifications = this.notifications.filter(n => n.id !== id);
    }

    getContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'notifications-container';
            document.body.appendChild(container);
        }
        return container;
    }

    getIcon(type) {
        switch(type) {
            case 'success': return '✓';
            case 'error': return '✕';
            case 'warning': return '⚠';
            default: return 'ℹ';
        }
    }
}

// Global notification manager
export const notificationManager = new NotificationManager();

// PWA features
export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker registered:', registration);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    }
}

export function requestNotificationPermission() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('Notification permission granted');
            }
        });
    }
}
