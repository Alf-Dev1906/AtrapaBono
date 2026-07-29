
document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
    initResponsiveFeatures();
});

function initMobileMenu() {
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const mainNav = document.querySelector('.main-nav');
    const mainHeader = document.querySelector('.main-header');
    const body = document.body;
    
    if (!mobileToggle || !mainNav || !mainHeader) return;
    
    // Toggle del menú
    mobileToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const isOpen = mainHeader.classList.contains('nav-open');
        
        if (isOpen) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    });
    
    // Cerrar menú al hacer clic en un enlace
    const navLinks = mainNav.querySelectorAll('.nav-link, .cta-button');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            const windowWidth = window.innerWidth;
            // Cerrar menú solo si está en modo móvil/tablet con hamburguesa
            if (windowWidth <= 1280 || (windowWidth <= 1440 && mainHeader.classList.contains('nav-open'))) {
                closeMobileMenu();
            }
        });
    });
    
    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (mainHeader.classList.contains('nav-open') && 
            !mainNav.contains(e.target) && 
            !mobileToggle.contains(e.target)) {
            closeMobileMenu();
        }
    });
    
    // Cerrar menú con tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mainHeader.classList.contains('nav-open')) {
            closeMobileMenu();
        }
    });
    
    // Ajustar menú al redimensionar
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const windowWidth = window.innerWidth;
            // Cerrar menú automáticamente en resoluciones desktop grandes
            if (windowWidth > 1440 && mainHeader.classList.contains('nav-open')) {
                closeMobileMenu();
            }
        }, 150);
    });
    
    function openMobileMenu() {
        mainHeader.classList.add('nav-open');
        mobileToggle.classList.add('active');
        body.style.overflow = 'hidden';
        
        mobileToggle.setAttribute('aria-expanded', 'true');
        mobileToggle.setAttribute('aria-label', 'Cerrar menú');
        mainNav.setAttribute('aria-hidden', 'false');
    }
    
    function closeMobileMenu() {
        mainHeader.classList.remove('nav-open');
        mobileToggle.classList.remove('active');
        body.style.overflow = '';
        
        mobileToggle.setAttribute('aria-expanded', 'false');
        mobileToggle.setAttribute('aria-label', 'Abrir menú');
        mainNav.setAttribute('aria-hidden', 'true');
    }
}

function initResponsiveFeatures() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (isTouchDevice) {
        document.body.classList.add('touch-device');
        
        const buttons = document.querySelectorAll('.cta-button, .btn');
        buttons.forEach(button => {
            button.addEventListener('touchstart', function() {
                this.classList.add('touch-active');
            });
            
            button.addEventListener('touchend', function() {
                setTimeout(() => {
                    this.classList.remove('touch-active');
                }, 150);
            });
        });
    }
    
    optimizeImages();
    
    improveMobileForms();
    
    implementLazyLoading();
}



function optimizeImages() {
    const images = document.querySelectorAll('img[data-src]');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
    } else {
        images.forEach(img => {
            img.src = img.dataset.src;
            img.classList.remove('lazy');
        });
    }
}

function improveMobileForms() {
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            input.addEventListener('focus', function() {
                if (this.type !== 'file') {
                    const fontSize = window.getComputedStyle(this).fontSize;
                    if (parseInt(fontSize) < 16) {
                        this.style.fontSize = '16px';
                    }
                }
            });
        }
        
        input.addEventListener('blur', function() {
            if (this.checkValidity()) {
                this.classList.remove('invalid');
                this.classList.add('valid');
            } else {
                this.classList.remove('valid');
                this.classList.add('invalid');
            }
        });
    });
}

function implementLazyLoading() {
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    
    if ('loading' in HTMLImageElement.prototype) {
        lazyImages.forEach(img => {
            img.src = img.dataset.src || img.src;
        });
    } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/lazysizes@5.3.2/lazysizes.min.js';
        document.head.appendChild(script);
    }
}

window.ResponsiveUtils = {
    isMobile: () => window.innerWidth <= 768,
    isTablet: () => window.innerWidth > 768 && window.innerWidth <= 1024,
    isDesktop: () => window.innerWidth > 1024,
    
    isPortrait: () => window.innerHeight > window.innerWidth,
    isLandscape: () => window.innerWidth > window.innerHeight,
    
    hasTouch: () => 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    hasHover: () => window.matchMedia('(hover: hover)').matches,
    
    onMobile: (callback) => {
        if (window.ResponsiveUtils.isMobile()) {
            callback();
        }
    },
    
    onTablet: (callback) => {
        if (window.ResponsiveUtils.isTablet()) {
            callback();
        }
    },
    
    onDesktop: (callback) => {
        if (window.ResponsiveUtils.isDesktop()) {
            callback();
        }
    }
};

window.addEventListener('orientationchange', function() {
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
});

document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
});

let ticking = false;

function updateOnScroll() {
    
    ticking = false;
}

window.addEventListener('scroll', function() {
    if (!ticking) {
        requestAnimationFrame(updateOnScroll);
        ticking = true;
    }
});

console.log('✅ Mobile menu and responsive features initialized');
