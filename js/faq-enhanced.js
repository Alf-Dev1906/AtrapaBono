// FAQ Accordion - Animaciones y funcionalidades mejoradas

document.addEventListener('DOMContentLoaded', function() {
    initFAQAccordion();
});

function initFAQAccordion() {
    const accordionItems = document.querySelectorAll('.faq-accordion details');
    
    if (!accordionItems.length) return;
    
    accordionItems.forEach((item, index) => {
        const summary = item.querySelector('summary');
        const answer = item.querySelector('.answer');
        
        if (!summary || !answer) return;
        
        // Mejorar la altura dinámica
        setupDynamicHeight(item, answer);
        
        // Usar el comportamiento nativo del details/summary con mejoras mínimas
        summary.addEventListener('click', function() {
            // Permitir que el navegador maneje el toggle nativo
            // Solo añadir efectos visuales menores
        });
        
        // Efecto de entrada escalonada
        item.style.animationDelay = `${(index + 1) * 0.1}s`;
        
        // Añadir atributos de accesibilidad
        enhanceAccessibility(item, summary, answer);
    });
    
    // Accordion exclusivo desactivado para evitar conflictos
    // enableExclusiveAccordion();
    
    // Intersection Observer para animaciones de entrada
    observeAccordionEntrance();
}

function setupDynamicHeight(item, answer) {
    // Calcular altura real del contenido
    const calculateHeight = () => {
        const clone = answer.cloneNode(true);
        clone.style.cssText = `
            position: absolute;
            visibility: hidden;
            height: auto;
            max-height: none;
            padding: 0 22px 22px;
            width: ${answer.offsetWidth}px;
        `;
        document.body.appendChild(clone);
        const height = clone.offsetHeight;
        document.body.removeChild(clone);
        return height;
    };
    
    // Actualizar altura cuando se redimensiona la ventana
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (item.hasAttribute('open')) {
                const height = calculateHeight();
                answer.style.maxHeight = `${height}px`;
            }
        }, 150);
    });
    
    // Almacenar función para uso posterior
    item._calculateHeight = calculateHeight;
}

function toggleAccordionItem(item, answer) {
    const isOpening = !item.hasAttribute('open');
    
    if (isOpening) {
        // Abrir con animación suave
        item.setAttribute('open', '');
        
        // Calcular altura real
        const height = item._calculateHeight();
        
        // Animar desde 0 hasta la altura real
        answer.style.maxHeight = '0px';
        answer.style.opacity = '0';
        answer.style.transform = 'translateY(-10px)';
        
        // Forzar repaint
        answer.offsetHeight;
        
        // Aplicar valores finales
        answer.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        answer.style.maxHeight = `${height}px`;
        answer.style.opacity = '1';
        answer.style.transform = 'translateY(0)';
        
        // Añadir efecto de resplandor sutil al abrir
        setTimeout(() => {
            item.style.boxShadow = '0 8px 25px rgba(253, 190, 2, 0.1), 0 0 0 1px rgba(253, 190, 2, 0.1)';
        }, 50);
        
        // Scroll suave al elemento si está fuera de vista
        setTimeout(() => {
            const rect = item.getBoundingClientRect();
            const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
            
            if (!isVisible) {
                item.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                });
            }
        }, 250);
        
    } else {
        // Cerrar con animación suave
        answer.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        answer.style.maxHeight = '0px';
        answer.style.opacity = '0';
        answer.style.transform = 'translateY(-10px)';
        
        // Restaurar sombra normal
        item.style.boxShadow = '';
        item.style.borderColor = '';
        item.style.background = '';
        
        // Remover el atributo open después de la animación
        setTimeout(() => {
            item.removeAttribute('open');
        }, 400);
    }
    
    // Efecto de retroalimentación háptica (si está disponible)
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
    
    // Anunciar cambio para lectores de pantalla
    announceStateChange(item, isOpening);
}

function enableExclusiveAccordion() {
    const accordionItems = document.querySelectorAll('.faq-accordion details');
    
    accordionItems.forEach(item => {
        const summary = item.querySelector('summary');
        
        summary.addEventListener('click', function() {
            // Cerrar otros elementos abiertos con animación
            accordionItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.hasAttribute('open')) {
                    const otherAnswer = otherItem.querySelector('.answer');
                    if (otherAnswer) {
                        otherAnswer.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                        otherAnswer.style.maxHeight = '0px';
                        otherAnswer.style.opacity = '0';
                        otherAnswer.style.transform = 'translateY(-10px)';
                        
                        setTimeout(() => {
                            otherItem.removeAttribute('open');
                        }, 300);
                    }
                }
            });
        });
    });
}

function observeAccordionEntrance() {
    const accordion = document.querySelector('.faq-accordion');
    if (!accordion) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Trigger de animaciones de entrada
                entry.target.classList.add('faq-visible');
                
                // Animación escalonada mejorada
                const items = entry.target.querySelectorAll('details');
                items.forEach((item, index) => {
                    setTimeout(() => {
                        item.style.opacity = '1';
                        item.style.transform = 'translateY(0)';
                        
                        // Efecto de onda sutil
                        item.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                    }, index * 100);
                });
                
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    });
    
    observer.observe(accordion);
}

function enhanceAccessibility(item, summary, answer) {
    // Añadir IDs únicos
    const id = `faq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    summary.id = `${id}-summary`;
    answer.id = `${id}-content`;
    
    // Mejorar atributos ARIA
    summary.setAttribute('aria-expanded', item.hasAttribute('open') ? 'true' : 'false');
    summary.setAttribute('aria-controls', answer.id);
    answer.setAttribute('aria-labelledby', summary.id);
    
    // Actualizar aria-expanded cuando cambia el estado
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'open') {
                const isOpen = item.hasAttribute('open');
                summary.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            }
        });
    });
    
    observer.observe(item, { attributes: true });
    
    // Navegación con teclado mejorada
    summary.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            summary.click();
        }
        
        // Navegación con flechas
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const allSummaries = Array.from(document.querySelectorAll('.faq-accordion summary'));
            const currentIndex = allSummaries.indexOf(summary);
            let nextIndex;
            
            if (e.key === 'ArrowDown') {
                nextIndex = (currentIndex + 1) % allSummaries.length;
            } else {
                nextIndex = (currentIndex - 1 + allSummaries.length) % allSummaries.length;
            }
            
            allSummaries[nextIndex].focus();
        }
    });
}

function announceStateChange(item, isOpening) {
    // Crear anuncio para lectores de pantalla
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        border: 0;
    `;
    
    const summaryText = item.querySelector('summary').textContent.trim();
    announcement.textContent = `${summaryText} ${isOpening ? 'expandido' : 'colapsado'}`;
    
    document.body.appendChild(announcement);
    
    // Limpiar después de 1 segundo
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// Función para añadir nuevas preguntas dinámicamente
window.addFAQItem = function(question, answer) {
    const accordion = document.querySelector('.faq-accordion');
    if (!accordion) return;
    
    const detailsElement = document.createElement('details');
    detailsElement.innerHTML = `
        <summary>${question}<span class="chevron">⌄</span></summary>
        <div class="answer">${answer}</div>
    `;
    
    accordion.appendChild(detailsElement);
    
    // Re-inicializar funcionalidades para el nuevo elemento
    const answerElement = detailsElement.querySelector('.answer');
    setupDynamicHeight(detailsElement, answerElement);
    enhanceAccessibility(detailsElement, detailsElement.querySelector('summary'), answerElement);
    
    // Animar entrada
    detailsElement.style.opacity = '0';
    detailsElement.style.transform = 'translateY(20px)';
    
    requestAnimationFrame(() => {
        detailsElement.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        detailsElement.style.opacity = '1';
        detailsElement.style.transform = 'translateY(0)';
    });
};

// Función para cerrar todos los acordeones
window.closeAllFAQ = function() {
    const openItems = document.querySelectorAll('.faq-accordion details[open]');
    openItems.forEach(item => {
        item.querySelector('summary').click();
    });
};

// Función para abrir un FAQ específico por índice
window.openFAQByIndex = function(index) {
    const items = document.querySelectorAll('.faq-accordion details');
    if (items[index] && !items[index].hasAttribute('open')) {
        items[index].querySelector('summary').click();
    }
};