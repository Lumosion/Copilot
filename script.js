// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navigation scroll effect
let lastScroll = 0;
const nav = document.querySelector('.main-nav');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll <= 0) {
        nav.style.boxShadow = 'none';
    } else {
        nav.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.8)';
    }
    
    // Parallax effect for hero
    const heroContent = document.querySelector('.hero-content');
    if (heroContent && currentScroll < window.innerHeight) {
        heroContent.style.transform = `translateY(${currentScroll * 0.4}px)`;
        heroContent.style.opacity = 1 - (currentScroll / 800);
    }
    
    lastScroll = currentScroll;
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all animated elements
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll(
        '.operator-card, .news-item, .feature-card, .gallery-item, .world-feature'
    );
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// Tab functionality for news section
const newsTabs = document.querySelectorAll('.tab-btn');
newsTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs
        newsTabs.forEach(t => t.classList.remove('active'));
        // Add active class to clicked tab
        tab.classList.add('active');
    });
});

// Tab functionality for media section
const mediaTabs = document.querySelectorAll('.media-tab-btn');
mediaTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        mediaTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
    });
});

// Particle effect for hero background
function createParticles() {
    const heroSection = document.querySelector('.hero-video-bg');
    if (!heroSection) return;
    
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        const size = Math.random() * 3 + 1;
        const duration = Math.random() * 20 + 10;
        const delay = Math.random() * 5;
        const startX = Math.random() * 100;
        const startY = Math.random() * 100;
        
        particle.style.position = 'absolute';
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.background = 'rgba(0, 212, 255, 0.4)';
        particle.style.borderRadius = '50%';
        particle.style.left = startX + '%';
        particle.style.top = startY + '%';
        particle.style.animation = `float ${duration}s infinite`;
        particle.style.animationDelay = delay + 's';
        particle.style.pointerEvents = 'none';
        
        heroSection.appendChild(particle);
    }
    
    // Add keyframes for floating animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes float {
            0%, 100% {
                transform: translate(0, 0);
                opacity: 0;
            }
            25% {
                opacity: 0.8;
            }
            50% {
                transform: translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px);
                opacity: 1;
            }
            75% {
                opacity: 0.8;
            }
        }
    `;
    document.head.appendChild(style);
}

// Initialize particles
createParticles();

// Update footer year
const updateFooterYear = () => {
    const yearElements = document.querySelectorAll('.footer-copyright p');
    const currentYear = new Date().getFullYear();
    yearElements.forEach(el => {
        el.innerHTML = el.innerHTML.replace(/2024/g, currentYear);
    });
};

updateFooterYear();

// Loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
    document.body.style.transition = 'opacity 0.5s ease';
});

// Mobile menu (placeholder for future implementation)
const handleResize = () => {
    if (window.innerWidth <= 768) {
        console.log('Mobile view active');
    }
};

window.addEventListener('resize', handleResize);
handleResize();

console.log('Arknights official website loaded successfully!');
