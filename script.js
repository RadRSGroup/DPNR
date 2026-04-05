// ===================================
// Smooth Scrolling for Navigation
// ===================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const navHeight = document.querySelector('.nav-bar').offsetHeight;
            const targetPosition = target.offsetTop - navHeight;
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===================================
// Intersection Observer for Fade-In Animations
// ===================================

const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const fadeInObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Add fade-in class to all glass cards and apply observer
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.glass-card, .section-header, .philosophy-quote');
    cards.forEach(card => {
        card.classList.add('fade-in');
        fadeInObserver.observe(card);
    });
});

// ===================================
// Counter Animation for Metrics
// ===================================

function animateCounter(element, target, duration = 2000, decimals = 0) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = decimals > 0 ? current.toFixed(decimals) : Math.floor(current).toLocaleString();
    }, 16);
}

// Counter observer
const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const element = entry.target;
            const target = parseFloat(element.dataset.target);
            const decimals = target % 1 !== 0 ? 1 : 0;
            animateCounter(element, target, 2000, decimals);
            observer.unobserve(element);
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    const counters = document.querySelectorAll('[data-target]');
    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
});

// ===================================
// Navbar Scroll Effect
// ===================================

let lastScroll = 0;
const navbar = document.querySelector('.nav-bar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    // Add shadow when scrolled
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    } else {
        navbar.style.boxShadow = 'none';
    }

    lastScroll = currentScroll;
});

// ===================================
// Parallax Effect for Gradient Background
// ===================================

const gradientBg = document.querySelector('.gradient-bg');

window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const rate = scrolled * 0.3;
    if (gradientBg) {
        gradientBg.style.transform = `translate(-50%, -${50 + rate * 0.05}%)`;
    }
});

// ===================================
// Mobile Menu Toggle (if needed in future)
// ===================================

// Placeholder for mobile menu functionality
// Can be expanded if hamburger menu is added

// ===================================
// Stagger Animation for Grids
// ===================================

const staggerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const children = entry.target.children;
            Array.from(children).forEach((child, index) => {
                setTimeout(() => {
                    child.classList.add('visible');
                }, index * 100);
            });
            staggerObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    const grids = document.querySelectorAll('.features-grid, .pricing-grid, .problem-grid');
    grids.forEach(grid => {
        const children = grid.children;
        Array.from(children).forEach(child => {
            child.classList.add('fade-in');
        });
        staggerObserver.observe(grid);
    });
});

// ===================================
// Enhanced Hover Effects for Cards
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.glass-card');

    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.borderColor = 'rgba(99, 102, 241, 0.5)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        });
    });
});

// ===================================
// Active Section Indicator in Nav
// ===================================

const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');

function setActiveNav() {
    let current = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.pageYOffset >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
            link.style.color = 'var(--accent-primary)';
        } else {
            link.style.color = '';
        }
    });
}

window.addEventListener('scroll', setActiveNav);

// ===================================
// Scroll Progress Indicator (Optional Enhancement)
// ===================================

function updateScrollProgress() {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight - windowHeight;
    const scrolled = window.pageYOffset;
    const progress = (scrolled / documentHeight) * 100;

    // Could add a progress bar at top if desired
    // For now, just calculating for future use
}

window.addEventListener('scroll', updateScrollProgress);

// ===================================
// Performance Optimization
// ===================================

// Debounce function for scroll events
function debounce(func, wait = 10) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply debounce to scroll-heavy functions
const debouncedScrollProgress = debounce(updateScrollProgress, 10);
window.addEventListener('scroll', debouncedScrollProgress);

// ===================================
// Initialize All Features
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DPNR Investor Pitch Website Loaded');

    // Add any initialization code here
    // All animations and interactions are set up above

    // Preload images if any are added later
    // Performance monitoring could be added here
});

// ===================================
// Accessibility Enhancements
// ===================================

// Add keyboard navigation support
document.addEventListener('keydown', (e) => {
    // Support for keyboard navigation can be added here
    // For example: Tab through sections, etc.
});

// Reduced motion preference
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (prefersReducedMotion.matches) {
    // Disable animations for users who prefer reduced motion
    document.querySelectorAll('.fade-in').forEach(el => {
        el.style.transition = 'none';
        el.classList.add('visible');
    });
}

// ===================================
// Analytics Placeholder
// ===================================

// Track section views (for analytics)
function trackSectionView(sectionId) {
    // Placeholder for analytics tracking
    // Could integrate with Google Analytics, Plausible, etc.
    // console.log(`Section viewed: ${sectionId}`);
}

// ===================================
// Easter Egg: Konami Code
// ===================================

let konamiCode = [];
const konamiPattern = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.key);
    konamiCode = konamiCode.slice(-10);

    if (konamiCode.join(',') === konamiPattern.join(',')) {
        // Easter egg activated
        document.body.style.background = 'linear-gradient(45deg, #6366f1, #8b5cf6, #fbbf24)';
        setTimeout(() => {
            document.body.style.background = '';
        }, 3000);
    }
});
