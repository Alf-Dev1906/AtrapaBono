 
let currentView = 'landing';
let currentUserName = null;
let currentUserIsAdmin = false;
let tokenValidated = false;
let currentAdminTab = 'pending';

const API_BASE_URL = "services/";
const appContent = document.getElementById("app-content");
 
function navigate(route) {
  console.log(`Navegando a: ${route}`);
  const landingSections = ['quienes-somos', 'registro', 'beneficios', 'soporte', 'como-funciona', 'confianza', 'testimonios', 'dudas'];

  if (landingSections.includes(route) && currentView === 'landing') {
    smoothScrollToSection(route);
    window.location.hash = route;
  } else {
    if (window.location.hash.substring(1) === route) {
      handleHashChange();
    } else {
      window.location.hash = route;
    }
  }

  initStatCounters();
}

async function handleHashChange() {
    const route = window.location.hash.substring(1) || 'landing';
    console.log(`Hash changed to: ${route}`);

    const landingSections = ['quienes-somos', 'registro', 'beneficios', 'soporte', 'como-funciona', 'confianza', 'testimonios', 'dudas'];

    if (landingSections.includes(route)) {
        const landingLoaded = !!document.getElementById(route);
        if (currentView !== 'landing' || !landingLoaded) {
            await loadView('landing_view', () => {
                attachLandingListeners();
                const savedHash = sessionStorage.getItem('restoreHash') || '';
                const savedView = sessionStorage.getItem('restoreView') || '';
                const savedScroll = sessionStorage.getItem('restoreScroll');
                const sameSection = (savedHash === `#${route}`) || (savedHash === '' && route === 'landing');
                if (savedView === 'landing' && sameSection && savedScroll != null) {
                  const y = parseInt(savedScroll, 10) || 0;
                  requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
                  sessionStorage.removeItem('restoreScroll');
                  sessionStorage.removeItem('restoreHash');
                  sessionStorage.removeItem('restoreView');
                } else {
                  smoothScrollToSection(route);
                }
            });
            currentView = 'landing';
        } else {
            const savedHash = sessionStorage.getItem('restoreHash') || '';
            const savedView = sessionStorage.getItem('restoreView') || '';
            const savedScroll = sessionStorage.getItem('restoreScroll');
            const sameSection = (savedHash === `#${route}`) || (savedHash === '' && route === 'landing');
            if (savedView === 'landing' && sameSection && savedScroll != null) {
              const y = parseInt(savedScroll, 10) || 0;
              requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
              sessionStorage.removeItem('restoreScroll');
              sessionStorage.removeItem('restoreHash');
              sessionStorage.removeItem('restoreView');
            } else {
              smoothScrollToSection(route);
            }
        }
    } else {
        switch (route) {
            case 'landing':
                await loadView('landing_view', attachLandingListeners);
                currentView = 'landing';
                try {
                  const savedHash = sessionStorage.getItem('restoreHash') || '';
                  const savedView = sessionStorage.getItem('restoreView') || '';
                  const savedScroll = sessionStorage.getItem('restoreScroll');
                  if (savedView === 'landing' && savedHash === '' && savedScroll != null) {
                    const y = parseInt(savedScroll, 10) || 0;
                    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
                    sessionStorage.removeItem('restoreScroll');
                    sessionStorage.removeItem('restoreHash');
                    sessionStorage.removeItem('restoreView');
                  }
                } catch {}
                break;
            case 'login':
                await loadView('login_view', attachLoginListeners);
                currentView = 'login';
                break;
            case 'forgot-password':
                await loadView('forgot_password_view', attachForgotPasswordListeners);
                currentView = 'forgot-password';
                break;
            case 'dashboard':
            case 'user-panel':
                if (!isAuthenticated()) return navigate('login');
                if (!tokenValidated) {
                    const ok = await handleTokenValidation();
                    if (!ok) return navigate('login');
                }
                // Si el usuario es administrador, redirigir al panel de administrador
                if (currentUserIsAdmin) {
                    return navigate('admin-panel');
                }
                await loadView('dashboard_view', attachDashboardListeners);
                // Asegurar que todos los botones del header estén visibles
                const paymentLink = document.getElementById('link-payment-data');
                const profileLink = document.getElementById('link-profile');
                if (paymentLink) {
                    paymentLink.style.display = '';
                    // Desactivar botón de Datos para reservas
                    paymentLink.classList.add('nav-item-disabled');
                    paymentLink.style.opacity = '0.5';
                    paymentLink.style.cursor = 'not-allowed';
                }
                if (profileLink) profileLink.style.display = '';
                
                currentView = 'dashboard';
                
                // Mostrar botón de Panel de Administrador si el usuario es admin (con delay para asegurar DOM)
                setTimeout(() => updatePanelNavigation(), 50);
                
                break;
            case 'admin-panel':
                if (!isAuthenticated()) return navigate('login');
                if (!currentUserIsAdmin) return navigate('dashboard'); // Solo admins
                if (!tokenValidated) {
                    const ok = await handleTokenValidation();
                    if (!ok) return navigate('login');
                }
                await loadView('admin_panel_view', attachAdminPanelListeners);
                
                currentView = 'admin-panel';
                
                // Mostrar botón de Panel de Usuario (con delay para asegurar DOM)
                setTimeout(() => updatePanelNavigation(), 50);
                
                break;
            case 'profile':
                if (!isAuthenticated()) return navigate('login');
                if (!tokenValidated) {
                    const ok = await handleTokenValidation();
                    if (!ok) return navigate('login');
                }
                // Si el usuario es administrador, redirigir al panel de administrador
                if (currentUserIsAdmin) {
                    return navigate('admin-panel');
                }
                // Cargar dashboard primero para mantener el header
                await loadView('dashboard_view', attachDashboardListeners);
                // Luego cargar solo el contenido de profile
                await loadProfileContent();
                currentView = 'profile';
                setTimeout(() => updatePanelNavigation(), 50);
                break;
            case 'payment-data':
                // Ruta desactivada - redirigir al dashboard
                if (!isAuthenticated()) return navigate('login');
                if (!tokenValidated) {
                    const ok = await handleTokenValidation();
                    if (!ok) return navigate('login');
                }
                // Redirigir al dashboard o admin-panel según el tipo de usuario
                if (currentUserIsAdmin) {
                    return navigate('admin-panel');
                } else {
                    return navigate('dashboard');
                }
                break;
            case 'security':
                if (!isAuthenticated()) return navigate('login');
                if (!tokenValidated) {
                    const ok = await handleTokenValidation();
                    if (!ok) return navigate('login');
                }
                // Si el usuario es administrador, redirigir al panel de administrador
                if (currentUserIsAdmin) {
                    return navigate('admin-panel');
                }
                // Cargar dashboard primero para mantener el header
                await loadView('dashboard_view', attachDashboardListeners);
                // Luego cargar solo el contenido de seguridad
                await loadSecurityContent();
                currentView = 'security';
                setTimeout(() => updatePanelNavigation(), 50);
                break;
            case 'setup-password':
                if (!isAuthenticated()) return navigate('login');
                if (!tokenValidated) {
                    const ok = await handleTokenValidation();
                    if (!ok) return navigate('login');
                }
                await loadView('setup_password_view', attachSetupPasswordListeners);
                currentView = 'setup-password';
                break;
            case 'logout':
                handleLogout();
                break;
            default:
                navigate('landing');
                break;
        }
    }
    updateActiveNavLinkOnScroll();
}

function smoothScrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    const headerHeight = document.getElementById("mainHeader")?.offsetHeight || 70;
    const sectionPosition = section.offsetTop - headerHeight;

    window.scrollTo({
      top: sectionPosition,
      behavior: "smooth",
    });
    console.log(`Scroll suave a: #${sectionId}`);
  } else {
    console.warn(`Sección no encontrada para scroll: #${sectionId}`);
  }

  try { initStatCounters(); } catch {}
}

function updateActiveNavLinkOnScroll() {
    const navLinks = document.querySelectorAll('.main-nav .nav-link');
    const headerHeight = document.getElementById("mainHeader")?.offsetHeight || 70;
    let currentSection = '';

    document.querySelectorAll('section[id]').forEach(section => {
        const sectionTop = section.offsetTop - headerHeight - 20;
        if (window.scrollY >= sectionTop) {
            currentSection = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href').substring(1);
        const isActive = (linkHref === currentSection);
        
        if (isActive) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function cleanUrlQuery() {
  if (window.location.search && window.location.search.length > 1) {
    const newUrl = window.location.pathname + (window.location.hash || '');
    window.history.replaceState(null, '', newUrl);
  }

  try { initStatCounters(); } catch {}
}

async function initApp() {
  console.log("Iniciando aplicación Atrapabono...");
  cleanUrlQuery();

  try {
    window.addEventListener('beforeunload', () => {
      try {
        sessionStorage.setItem('restoreScroll', String(window.scrollY || 0));
        sessionStorage.setItem('restoreHash', window.location.hash || '');
        sessionStorage.setItem('restoreView', currentView || '');
      } catch {}
    });
  } catch {}

  window.addEventListener('hashchange', handleHashChange);

  window.addEventListener('scroll', updateActiveNavLinkOnScroll);

  if (isAuthenticated()) {
    const isValid = await handleTokenValidation();
    if (isValid) {
      // Redirigir administradores al admin-panel por defecto
      let initialRoute = window.location.hash.substring(1) || 'dashboard';
      if (currentUserIsAdmin && initialRoute === 'dashboard') {
        initialRoute = 'admin-panel';
      }
      if (window.location.hash && window.location.hash.substring(1) === initialRoute) {
        await handleHashChange();
      } else {
        navigate(initialRoute);
      }
      return;
    }
  }
  
  handleHashChange();
}

async function loadView(viewName, callback = () => {}) {
  try {
    const response = await fetch(`assets/views/${viewName}.html`);
    if (!response.ok) throw new Error(`Error al cargar la vista: ${viewName}`);
    appContent.innerHTML = await response.text();
    if (callback) callback();
  } catch (error) {
    console.error("Fallo al cargar la vista:", error);
    appContent.innerHTML = `<p class="alert alert-error">Error al cargar el contenido.</p>`;
  }
}

function attachLandingListeners() {
  console.log("Adjuntando listeners de la landing page...");
  initHeaderEffects();
  initRegistrationModal();
  initAgeValidation();
  initRegistrationForm();

  try {
    if (typeof initMobileMenu === 'function') {
      initMobileMenu();
    }
    if (typeof initResponsiveFeatures === 'function') {
      initResponsiveFeatures();
    }
  } catch (e) {
    console.warn('Mobile menu init skipped:', e);
  }

  document.getElementById('mainLogo')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.history.pushState(null, null, '#');
      updateActiveNavLinkOnScroll();
  });

  document.querySelectorAll('.main-nav a.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const sectionId = this.getAttribute('href').substring(1);
      navigate(sectionId);
    });
  });

  document.getElementById('switch-to-login')?.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('login');
  });

  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  const carousel = document.getElementById('benefits-carousel');

  if (prevBtn && nextBtn && carousel) {
    const scrollAmount = 320;

    nextBtn.addEventListener('click', () => {
      carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    });

    prevBtn.addEventListener('click', () => {
      carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    });
  }

  const heroBanner = document.getElementById('heroBanner');
  const heroTrack = document.getElementById('heroBannerTrack');
  if (heroBanner && heroTrack) {
    let slides = Array.from(heroTrack.querySelectorAll('.banner-slide'));
    const total = slides.length || 0;
    if (total < 1) return;
    let timer = null;
    // En pantallas altas (>=900px de alto), usar el 100% del contenedor para evitar cortes visuales
    const calcSlidePortion = () => {
      const h = window.innerHeight || document.documentElement.clientHeight || 0;
      if (h >= 900) return 1.0;
      if (h <= 820) return 1.0;
      return 0.95; // transición suave entre 820 y 900
    };
    
    // El texto permanece fijo - NO se cambia
    const heroTitleEl = document.querySelector('.hero-main-title');
    const heroSubtitleEl = document.querySelector('.hero-subtitle');
    
    const first = slides[0].cloneNode(true);
    const last = slides[slides.length - 1].cloneNode(true);
    heroTrack.insertBefore(last, slides[0]);
    heroTrack.appendChild(first);
    slides = Array.from(heroTrack.querySelectorAll('.banner-slide'));
    let idx = 1;

    heroTrack.style.display = 'flex';
    heroTrack.style.flexDirection = 'column';
    heroBanner.style.overflow = 'hidden';
    heroTrack.style.willChange = 'transform';

    const layout = () => {
      const H = heroBanner.clientHeight || 360;
      const cs = getComputedStyle(heroTrack);
      const gap = parseFloat(cs.rowGap || cs.gap || '0') || 0;
      const portion = calcSlidePortion();
      const slideH = Math.round(H * portion);
      const pad = Math.max(0, Math.round((H - slideH) / 2));
      slides.forEach(s => { s.style.flex = `0 0 ${slideH}px`; s.style.height = `${slideH}px`; s.style.width = '100%'; });
      heroTrack.style.paddingTop = `${pad}px`;
      heroTrack.style.paddingBottom = `${pad}px`;
      return { slideH, gap };
    };

    const apply = (m) => {
      const offset = idx * (m.slideH + m.gap);
      heroTrack.style.transition = 'transform 650ms ease-in-out';
      heroTrack.style.transform = `translateY(-${offset}px)`;
    };

    const onEnd = (m) => {
      if (idx === total + 1) {
        heroTrack.style.transition = 'none';
        idx = 1;
        heroTrack.style.transform = `translateY(-${idx * (m.slideH + m.gap)}px)`;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          heroTrack.style.transition = 'transform 650ms ease-in-out';
        }));
      }
    };

    let metrics = layout();
    heroTrack.addEventListener('transitionend', () => onEnd(metrics));
    const next = () => { idx += 1; apply(metrics); };
    const start = () => { if (total < 2) return; stop(); timer = setInterval(next, 5000); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    slides.forEach((el, i) => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        const isFirstClone = (i === 0);
        const isLastClone = (i === slides.length - 1);
        let realIdx = 0;
        if (isFirstClone) realIdx = total - 1; else if (isLastClone) realIdx = 0; else realIdx = i - 1;
        idx = realIdx + 1;
        apply(metrics);
      });
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    window.addEventListener('resize', () => { metrics = layout(); heroTrack.style.transition = 'none'; apply(metrics); requestAnimationFrame(() => requestAnimationFrame(() => { heroTrack.style.transition = 'transform 650ms ease-in-out'; })); });
    apply(metrics);
    start();
  }

  initStatCounters();
  initTestimonialsReveal();
}

function initStatCounters() {
  const section = document.querySelector('#confianza .security-section');
  if (!section) return;
  const counters = section.querySelectorAll('.stat-number[data-target]');
  if (!counters.length) return;

  const run = () => {
    counters.forEach(el => {
      if (el.dataset.counted === 'true') return;
      const target = Number(el.dataset.target || '0');
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      animateCount(el, target, 1600, prefix, suffix);
      el.dataset.counted = 'true';
    });
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        run();
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  io.observe(section);
}

function animateCount(el, target, duration, prefix, suffix) {
  const start = performance.now();
  const from = 0;
  const easeOut = t => 1 - Math.pow(1 - t, 3); 

  function format(n) {
    const rounded = Math.round(n);
    if (target >= 1000 && target !== 2025) return rounded.toLocaleString('en-US');
    return String(rounded);
  }

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(1, elapsed / duration);
    const value = from + (target - from) * easeOut(progress);
    el.textContent = `${prefix || ''}${format(value)}${suffix || ''}`;
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = `${prefix || ''}${format(target)}${suffix || ''}`;
    }
  }

  requestAnimationFrame(step);
}

function initTestimonialsReveal() {
  const section = document.querySelector('#testimonios');
  if (!section) return;
  const cards = section.querySelectorAll('.testimonial-card');
  if (!cards.length) return;

  cards.forEach(c => c.classList.remove('in-view'));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        cards.forEach((card, i) => {
          setTimeout(() => card.classList.add('in-view'), i * 120);
        });
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  io.observe(section);
}

function displayMessage(containerId, message, type) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => (container.innerHTML = ""), 5000);
  }
}

async function handleTokenValidation() {
  const token = getAuthToken();
  if (!token) return false;
  try {
    const response = await fetch(API_BASE_URL + "validate_token.php", {
      method: "GET",
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const result = await response.json();
    if (result.success && result.data) {
      currentUserName = result.data.name || result.data.username || result.data.email || '';
      const isAdminRaw = result.data.is_admin;
      currentUserIsAdmin = (isAdminRaw === true) || (isAdminRaw === 1) || (isAdminRaw === '1') || (isAdminRaw === 'true');
      tokenValidated = true;
      return true;
    } else {
      clearAuthToken();
      return false;
    }
  } catch (error) {
    clearAuthToken();
    return false;
  }
}

async function handleLogout() {
  const token = getAuthToken();
  if (token) {
    try {
      await fetch(API_BASE_URL + "logout.php", {
        method: "POST",
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch (error) {
      console.error("Error en logout:", error);
    }
  }
  currentUserName = null;
  currentUserIsAdmin = false;
  clearAuthToken();
  currentView = 'landing';
  window.location.hash = 'landing';
  // Forzar la recarga para asegurar un estado limpio
  location.reload();
}

function attachLoginListeners() {
  const form = document.getElementById("login-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Detectar si el campo de contraseña está vacío para enviar only_email flag
    if (!data.password || data.password.trim() === '') {
      data.only_email = true;
      delete data.password; // Eliminar el campo vacío
    }
    
    try {
      const response = await fetch(API_BASE_URL + "login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (result.success) {
        setAuthToken(result.token);
        
        // Verificar si el usuario necesita configurar su contraseña
        if (result.needs_setup) {
          await handleTokenValidation();
          navigate("setup-password");
        } else {
          await handleTokenValidation();
          navigate("dashboard");
        }
      } else {
        displayMessage("auth-message-area", result.message, "error");
      }
    } catch (error) {
      displayMessage("auth-message-area", "Error de conexión.", "error");
    }
  });
  document.getElementById("go-to-landing")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("landing");
  });

  document.getElementById("forgot-password-link")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("forgot-password");
  });

  // Toggle mostrar/ocultar contraseña
  const togglePassword = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('login-password');
  const eyeIcon = document.getElementById('eyeIcon');
  const eyeSlashIcon = document.getElementById('eyeSlashIcon');

  if (togglePassword && passwordInput && eyeIcon && eyeSlashIcon) {
    togglePassword.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      
      // Cambiar iconos
      if (type === 'text') {
        eyeIcon.style.display = 'none';
        eyeSlashIcon.style.display = 'block';
        togglePassword.setAttribute('aria-label', 'Ocultar contraseña');
      } else {
        eyeIcon.style.display = 'block';
        eyeSlashIcon.style.display = 'none';
        togglePassword.setAttribute('aria-label', 'Mostrar contraseña');
      }
    });
  }

  // Inicializar carrusel de login
  initLoginCarousel();
}

function initLoginCarousel() {
  const loginBanner = document.getElementById('loginBanner');
  const loginTrack = document.getElementById('loginBannerTrack');
  if (loginBanner && loginTrack) {
    let slides = Array.from(loginTrack.querySelectorAll('.login-banner-slide'));
    const total = slides.length || 0;
    if (total < 1) return;
    let timer = null;
    
    const calcSlidePortion = () => {
      const h = window.innerHeight || document.documentElement.clientHeight || 0;
      if (h >= 900) return 1.0;
      if (h <= 820) return 1.0;
      return 0.95;
    };
    
    const first = slides[0].cloneNode(true);
    const last = slides[slides.length - 1].cloneNode(true);
    loginTrack.insertBefore(last, slides[0]);
    loginTrack.appendChild(first);
    slides = Array.from(loginTrack.querySelectorAll('.login-banner-slide'));
    let idx = 1;

    loginTrack.style.display = 'flex';
    loginTrack.style.flexDirection = 'column';
    loginBanner.style.overflow = 'hidden';
    loginTrack.style.willChange = 'transform';

    const layout = () => {
      const H = loginBanner.clientHeight || 360;
      const cs = getComputedStyle(loginTrack);
      const gap = parseFloat(cs.rowGap || cs.gap || '0') || 0;
      const portion = calcSlidePortion();
      const slideH = Math.round(H * portion);
      const pad = Math.max(0, Math.round((H - slideH) / 2));
      slides.forEach(s => { 
        s.style.flex = `0 0 ${slideH}px`; 
        s.style.height = `${slideH}px`; 
        s.style.width = '100%'; 
      });
      loginTrack.style.paddingTop = `${pad}px`;
      loginTrack.style.paddingBottom = `${pad}px`;
      return { slideH, gap };
    };

    const apply = (m) => {
      const offset = idx * (m.slideH + m.gap);
      loginTrack.style.transition = 'transform 650ms ease-in-out';
      loginTrack.style.transform = `translateY(-${offset}px)`;
    };

    const onEnd = (m) => {
      if (idx === total + 1) {
        loginTrack.style.transition = 'none';
        idx = 1;
        loginTrack.style.transform = `translateY(-${idx * (m.slideH + m.gap)}px)`;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          loginTrack.style.transition = 'transform 650ms ease-in-out';
        }));
      }
    };

    let metrics = layout();
    loginTrack.addEventListener('transitionend', () => onEnd(metrics));
    const next = () => { idx += 1; apply(metrics); };
    const start = () => { if (total < 2) return; stop(); timer = setInterval(next, 5000); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    
    slides.forEach((el, i) => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        const isFirstClone = (i === 0);
        const isLastClone = (i === slides.length - 1);
        let realIdx = 0;
        if (isFirstClone) realIdx = total - 1; 
        else if (isLastClone) realIdx = 0; 
        else realIdx = i - 1;
        idx = realIdx + 1;
        apply(metrics);
      });
    });
    
    document.addEventListener('visibilitychange', () => { 
      if (document.hidden) stop(); 
      else start(); 
    });
    
    window.addEventListener('resize', () => { 
      metrics = layout(); 
      loginTrack.style.transition = 'none'; 
      apply(metrics); 
      requestAnimationFrame(() => requestAnimationFrame(() => { 
        loginTrack.style.transition = 'transform 650ms ease-in-out'; 
      })); 
    });
    
    apply(metrics);
    start();
  }
}

function attachForgotPasswordListeners() {
  const form = document.getElementById("forgot-password-form");
  const submitBtn = document.getElementById("forgot-submit-btn");
  
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Deshabilitar botón durante el envío
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';
    }
    
    try {
      const response = await fetch(API_BASE_URL + "forgot_password.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      
      if (result.success) {
        displayMessage("forgot-message-area", result.message || "Te hemos enviado un correo con instrucciones para restablecer tu contraseña. Por favor revisa tu bandeja de entrada.", "success");
        form.reset();
        
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          navigate("login");
        }, 3000);
      } else {
        displayMessage("forgot-message-area", result.message || "Error al procesar la solicitud. Por favor intenta nuevamente.", "error");
      }
    } catch (error) {
      console.error("Error en forgot password:", error);
      displayMessage("forgot-message-area", "Error de conexión. Por favor intenta nuevamente.", "error");
    } finally {
      // Rehabilitar botón
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Continuar';
      }
    }
  });
  
  document.getElementById("back-to-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("login");
  });

  document.getElementById("go-to-landing-forgot")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("landing");
  });
}

// Funciones para el menú móvil del dashboard
function initDashboardMobileMenu() {
    const menuToggle = document.getElementById('dashboardMenuToggle');
    const dashboardHeader = document.querySelector('.dashboard-header');
    
    if (!menuToggle || !dashboardHeader) return;
    
    menuToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleDashboardMenu();
    });
    
    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (dashboardHeader.classList.contains('menu-open') &&
            !e.target.closest('.user-nav') &&
            !e.target.closest('.dashboard-menu-toggle')) {
            closeDashboardMenu();
        }
    });
    
    // Cerrar menú con tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && dashboardHeader.classList.contains('menu-open')) {
            closeDashboardMenu();
        }
    });
    
    // Limpiar menú móvil cuando se cambia a desktop
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const isMobile = window.innerWidth <= 768;
            const userNav = document.querySelector('.user-nav');
            
            if (!isMobile && userNav) {
                // Remover elementos del menú móvil si está en desktop
                const mobileHeader = userNav.querySelector('.menu-header');
                const panelTitleItem = userNav.querySelector('.panel-title-item');
                const menuFooter = userNav.querySelector('.menu-footer');
                
                if (mobileHeader) mobileHeader.remove();
                if (panelTitleItem) panelTitleItem.remove();
                
                // Si hay menu-footer, sacar el botón de logout y agregarlo directamente al userNav
                if (menuFooter) {
                    const logoutBtn = menuFooter.querySelector('.btn');
                    if (logoutBtn) {
                        userNav.appendChild(logoutBtn);
                    }
                    menuFooter.remove();
                }
                
                // Cerrar menú si está abierto
                if (dashboardHeader.classList.contains('menu-open')) {
                    closeDashboardMenu();
                }
            }
        }, 250);
    });
}

function toggleDashboardMenu() {
    const dashboardHeader = document.querySelector('.dashboard-header');
    const menuToggle = document.getElementById('dashboardMenuToggle');
    const userNav = document.querySelector('.user-nav');
    
    if (!dashboardHeader || !menuToggle) return;
    
    if (dashboardHeader.classList.contains('menu-open')) {
        closeDashboardMenu();
    } else {
        dashboardHeader.classList.add('menu-open');
        menuToggle.classList.add('active');
        // Bloquear scroll del documento mientras el menú esté abierto
        document.documentElement.classList.add('no-scroll');
        document.body.classList.add('no-scroll');
        
        // SIEMPRE reorganizar menú (forzar regeneración)
        if (userNav) {
            // Guardar items originales antes de limpiar (excluir panel-title-item generado)
            const navItems = Array.from(userNav.querySelectorAll('.nav-item:not(.panel-title-item)'));
            const logoutBtn = userNav.querySelector('.btn');
            
            // LIMPIAR TODO el contenido del menú SIEMPRE
            userNav.innerHTML = '';
            
            // 1. Crear header con logo estilo Freepik
            const menuHeader = document.createElement('div');
            menuHeader.className = 'menu-header';
            menuHeader.style.cssText = 'padding: 20px !important; display: flex !important; align-items: center !important; justify-content: flex-start !important; border-bottom: 1px solid #f0f0f0 !important;';
            menuHeader.innerHTML = `
                <div class="menu-header-logo" style="height: 60px !important; max-height: 60px !important; min-height: 60px !important; margin: 0 !important; padding: 0 !important; display: block !important;">
                    <img src="assets/img/logos/LOGOTIPO_para-fondoblanco.png" alt="AtrapaBono" style="height: 60px !important; max-height: 60px !important; width: auto !important; object-fit: contain !important; display: block !important;">
                </div>
            `;
            userNav.appendChild(menuHeader);
            
            // 2. Agregar título del panel como primer item del menú
            const panelTitle = document.createElement('a');
            panelTitle.className = 'nav-item panel-title-item';
            panelTitle.href = '#';
            panelTitle.style.cssText = 'font-weight: 600 !important;';
            panelTitle.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                ${currentUserIsAdmin ? 'Panel de Administrador' : 'Panel de Usuario'}
            `;
            panelTitle.addEventListener('click', (e) => {
                e.preventDefault();
                // Cerrar menú y hacer scroll al inicio
                closeDashboardMenu();
                window.scrollTo({top: 0, behavior: 'smooth'});
            });
            userNav.appendChild(panelTitle);
            
            // 3. Agregar items del menú (sin duplicados)
            navItems.forEach(item => {
                const itemId = item.id;
                // Ocultar panel links que son duplicados del título
                if (itemId === 'link-admin-panel' && currentUserIsAdmin) return;
                if (itemId === 'link-user-panel' && !currentUserIsAdmin) return;
                userNav.appendChild(item);
            });
            
            // 4. Crear footer y agregar botón Salir
            if (logoutBtn) {
                const menuFooter = document.createElement('div');
                menuFooter.className = 'menu-footer';
                menuFooter.appendChild(logoutBtn);
                userNav.appendChild(menuFooter);
            }
        }
    }
}

function closeDashboardMenu() {
    const dashboardHeader = document.querySelector('.dashboard-header');
    const menuToggle = document.getElementById('dashboardMenuToggle');
    
    if (!dashboardHeader || !menuToggle) return;
    
    dashboardHeader.classList.remove('menu-open');
    menuToggle.classList.remove('active');
    // Rehabilitar scroll del documento al cerrar menú
    document.documentElement.classList.remove('no-scroll');
    document.body.classList.remove('no-scroll');
}

function attachDashboardListeners() {
    initHeaderEffects();
    initDashboardMobileMenu();
    
    // Desactivar botón de Datos para reservas
    const paymentDataBtn = document.getElementById("link-payment-data");
    if (paymentDataBtn) {
        paymentDataBtn.classList.add('nav-item-disabled');
        paymentDataBtn.style.opacity = '0.5';
        paymentDataBtn.style.cursor = 'not-allowed';
        paymentDataBtn.addEventListener("click", (e) => { e.preventDefault(); });
    }
    
    document.getElementById("link-profile")?.addEventListener("click", (e) => { e.preventDefault(); navigate("profile"); closeDashboardMenu(); });
    document.getElementById("link-security")?.addEventListener("click", (e) => { e.preventDefault(); navigate("security"); closeDashboardMenu(); });
    document.getElementById("link-admin-panel")?.addEventListener("click", (e) => { e.preventDefault(); navigate("admin-panel"); closeDashboardMenu(); });
    document.getElementById("link-user-panel")?.addEventListener("click", (e) => { e.preventDefault(); navigate("dashboard"); closeDashboardMenu(); });
    document.getElementById("link-logout-dashboard")?.addEventListener("click", (e) => { e.preventDefault(); handleLogout(); });
    
    // Detectar scroll en tablas para ocultar indicador de flecha
    document.querySelectorAll('.table-responsive').forEach(table => {
        const checkScroll = () => {
            // Verificar si la tabla tiene contenido que hacer scroll
            const hasScrollContent = table.scrollWidth > table.clientWidth + 1;
            
            if (hasScrollContent) {
                table.classList.add('has-scroll');
                
                // Verificar si está al final del scroll
                const isAtEnd = table.scrollLeft + table.clientWidth >= table.scrollWidth - 5;
                if (isAtEnd) {
                    table.classList.add('scrolled-end');
                } else {
                    table.classList.remove('scrolled-end');
                }
            } else {
                // No hay scroll, remover ambas clases
                table.classList.remove('has-scroll');
                table.classList.remove('scrolled-end');
            }
        };
        table.addEventListener('scroll', checkScroll);
        checkScroll(); // Check inicial
        
        // Re-check cuando cambie el tamaño de la ventana
        window.addEventListener('resize', checkScroll);
    });
    
    loadDashboardData();
    initVouchersSection();
    loadUserLimits();
    
    // Actualizar navegación de paneles después de cargar
    setTimeout(() => updatePanelNavigation(), 100);
}

function attachAdminPanelListeners() {
    initHeaderEffects();
    initDashboardMobileMenu();
    loadAdminRequests('pending');
    // loadAdminStats(); // TODO: Implementar función de estadísticas del admin
    // Ocultar opciones de usuario común si el usuario es administrador
    if (currentUserIsAdmin) {
        const paymentDataLink = document.getElementById("link-payment-data");
        const profileLink = document.getElementById("link-profile");
        const userPanelLink = document.getElementById("link-user-panel");
        
        if (paymentDataLink) paymentDataLink.style.display = 'none';
        if (profileLink) profileLink.style.display = 'none';
        if (userPanelLink) userPanelLink.style.display = 'none';
        
        // Mostrar el botón de admin panel para dar contexto
        const adminPanelLink = document.getElementById("link-admin-panel");
        if (adminPanelLink) adminPanelLink.style.display = '';
    } else {
        // Mostrar opciones de usuario común para usuarios no-admin
        const paymentDataLink = document.getElementById("link-payment-data");
        const profileLink = document.getElementById("link-profile");
        const userPanelLink = document.getElementById("link-user-panel");
        
        if (paymentDataLink) {
            paymentDataLink.style.display = '';
            // Desactivar el botón de Datos para reservas
            paymentDataLink.classList.add('nav-item-disabled');
            paymentDataLink.style.opacity = '0.5';
            paymentDataLink.style.cursor = 'not-allowed';
            paymentDataLink.addEventListener("click", (e) => { e.preventDefault(); });
        }
        if (profileLink) {
            profileLink.style.display = '';
            profileLink.addEventListener("click", (e) => { e.preventDefault(); navigate("profile"); });
        }
        if (userPanelLink) {
            userPanelLink.style.display = '';
            userPanelLink.addEventListener("click", (e) => { e.preventDefault(); navigate("user-panel"); });
        }
    }
    
    document.getElementById("link-logout-dashboard")?.addEventListener("click", (e) => { e.preventDefault(); navigate("logout"); });
    document.getElementById("link-admin-panel")?.addEventListener("click", (e) => { e.preventDefault(); navigate("admin-panel"); });
    
    // Detectar scroll en tablas para ocultar indicador de flecha
    document.querySelectorAll('.table-responsive').forEach(table => {
        const checkScroll = () => {
            // Verificar si la tabla tiene contenido que hacer scroll
            const hasScrollContent = table.scrollWidth > table.clientWidth + 1;
            
            if (hasScrollContent) {
                table.classList.add('has-scroll');
                
                // Verificar si está al final del scroll
                const isAtEnd = table.scrollLeft + table.clientWidth >= table.scrollWidth - 5;
                if (isAtEnd) {
                    table.classList.add('scrolled-end');
                } else {
                    table.classList.remove('scrolled-end');
                }
            } else {
                // No hay scroll, remover ambas clases
                table.classList.remove('has-scroll');
                table.classList.remove('scrolled-end');
            }
        };
        table.addEventListener('scroll', checkScroll);
        checkScroll(); // Check inicial
        
        // Re-check cuando cambie el tamaño de la ventana
        window.addEventListener('resize', checkScroll);
    });
    
    loadAdminPanelData();
    
    // Actualizar navegación de paneles después de cargar
    setTimeout(() => updatePanelNavigation(), 100);
}

// Función para mostrar/ocultar botones de navegación entre paneles según contexto
function updatePanelNavigation() {
    const adminPanelBtn = document.getElementById('link-admin-panel');
    const userPanelBtn = document.getElementById('link-user-panel');
    
    if (!adminPanelBtn || !userPanelBtn) {
        console.log('⚠️ Botones de panel no encontrados en el DOM');
        return;
    }
    
    console.log('🔄 updatePanelNavigation - currentView:', currentView, 'isAdmin:', currentUserIsAdmin);
    
    if (currentView === 'dashboard' || currentView === 'profile' || currentView === 'payment-data') {
        // Estamos en Panel de Usuario
        if (currentUserIsAdmin) {
            adminPanelBtn.style.display = ''; // Mostrar botón para ir a admin panel
            console.log('✅ Mostrando botón Panel de Administrador');
        } else {
            adminPanelBtn.style.display = 'none';
        }
        userPanelBtn.style.display = 'none'; // Ocultar botón de user panel (ya estamos aquí)
    } else if (currentView === 'admin-panel') {
        // Estamos en Panel de Administrador
        
        // Si el usuario es admin, mostrar botón de admin panel para dar contexto (no clickeable)
        if (currentUserIsAdmin) {
            userPanelBtn.style.display = 'none';
            adminPanelBtn.style.display = ''; // Mostrar para dar contexto
            console.log('❌ Ocultando botón Panel de Usuario (usuario es admin)');
            console.log('✅ Mostrando botón Panel de Administrador como contexto');
        } else {
            adminPanelBtn.style.display = 'none';
            userPanelBtn.style.display = ''; // Mostrar botón para ir a user panel
            console.log('✅ Mostrando botón Panel de Usuario');
        }
    } else {
        // Vista desconocida, ocultar ambos
        adminPanelBtn.style.display = 'none';
        userPanelBtn.style.display = 'none';
    }
}

async function loadDashboardData() {
    try {
        const nameEl = document.getElementById('user-display-name');
        if (nameEl) nameEl.textContent = currentUserName || '';
        const headers = { 'Authorization': `Bearer ${getAuthToken()}` };
        
        // Llamada a Happier API - Endpoint /me
        try {
            console.log('🔄 Llamando a Happier API: /me');
            const meResp = await fetch(`${API_BASE_URL}happier_proxy.php?path=me`, { headers });
            const me = await meResp.json();
            console.log('✅ Respuesta de Happier /me:', me);
            
            if (me && me.success && me.data) {
                const n = me.data.name || me.data.full_name || me.data.username || me.data.email;
                if (nameEl && n) {
                    nameEl.textContent = n;
                    console.log('✅ Nombre de usuario actualizado desde Happier:', n);
                }
            } else {
                console.warn('⚠️ Happier /me no retornó datos válidos');
            }
        } catch (err) {
            console.error('❌ Error llamando a Happier /me:', err);
        }
        
        // Llamada a Happier API - Endpoint /dashboard/summary
        try {
            console.log('🔄 Llamando a Happier API: /dashboard/summary');
            const sumResp = await fetch(`${API_BASE_URL}happier_proxy.php?path=dashboard/summary`, { headers });
            const sumJson = await sumResp.json();
            console.log('✅ Respuesta de Happier /dashboard/summary:', sumJson);
            
            const d = (sumJson && (sumJson.data || sumJson)) || {};
            const el1 = document.getElementById('stat-total-bonos');
            const el2 = document.getElementById('stat-bonos-redeemed');
            const el3 = document.getElementById('stat-avg-campaign-value');
            const el4 = document.getElementById('stat-conversion-rate');
            const v1 = d.total_bonos ?? d.totalBonos ?? d.total_points ?? d.total;
            const v2 = d.bonos_redeemed ?? d.redeemed ?? d.canjeados;
            const v3 = d.avg_campaign_value ?? d.avgValue ?? d.average_campaign_value;
            const v4 = d.conversion_rate ?? d.conversion ?? d.rate;
            
            if (el1 && v1 != null) {
                el1.textContent = String(v1);
                console.log('✅ Total bonos actualizado:', v1);
            }
            if (el2 && v2 != null) {
                el2.textContent = String(v2);
                console.log('✅ Bonos canjeados actualizado:', v2);
            }
            if (el3 && v3 != null) {
                el3.textContent = String(v3);
                console.log('✅ Valor promedio actualizado:', v3);
            }
            if (el4 && v4 != null) {
                el4.textContent = String(v4);
                console.log('✅ Tasa de conversión actualizada:', v4);
            }
        } catch (err) {
            console.error('❌ Error llamando a Happier /dashboard/summary:', err);
        }
        
        // Actualizar Atrapapuntos (por ahora con valores en 0)
        updateAtrapapuntos(0, 0);
        
        // Verificar y controlar visibilidad de tabla de movimientos
        toggleTransactionsDisplay();
    } catch (e) {
        console.error('Error cargando dashboard:', e);
    }
}

// Función para mostrar/ocultar tabla de movimientos según contenido
function toggleTransactionsDisplay() {
    const transactionsBody = document.getElementById('transactions-body');
    const tableContainer = document.getElementById('transactions-table-container');
    const emptyMessage = document.getElementById('no-transactions-message');
    
    console.log('🔄 toggleTransactionsDisplay llamado');
    console.log('   - transactionsBody:', transactionsBody);
    console.log('   - tableContainer:', tableContainer);
    console.log('   - emptyMessage:', emptyMessage);
    
    if (!transactionsBody || !tableContainer || !emptyMessage) {
        console.error('❌ Faltan elementos del DOM');
        return;
    }
    
    const hasTransactions = transactionsBody.children.length > 0;
    
    console.log('   - Cantidad de transacciones:', transactionsBody.children.length);
    console.log('   - Tiene transacciones:', hasTransactions);
    
    if (hasTransactions) {
        // Mostrar tabla, ocultar mensaje
        tableContainer.style.display = 'block';
        emptyMessage.style.display = 'none';
        console.log('✅ Mostrando tabla de transacciones');
    } else {
        // Ocultar tabla, mostrar mensaje
        tableContainer.style.display = 'none';
        emptyMessage.style.display = 'flex';
        console.log('✅ Mostrando mensaje vacío - display: flex aplicado');
        console.log('   - Estado final emptyMessage.style.display:', emptyMessage.style.display);
    }
}

// Exponer función globalmente
window.toggleTransactionsDisplay = toggleTransactionsDisplay;

// =====================
// ATRAPAPUNTOS
// =====================

function updateAtrapapuntos(waitingPoints, accumulatedPoints) {
    // Actualizar valores de puntos
    const waitingEl = document.getElementById('points-waiting');
    const accumulatedEl = document.getElementById('points-accumulated');
    
    if (waitingEl) waitingEl.textContent = waitingPoints || 0;
    if (accumulatedEl) accumulatedEl.textContent = accumulatedPoints || 0;
    
    // Actualizar barra de progreso
    updateProgressBar(accumulatedPoints || 0);
    
    // Verificar límites de juego responsable
    if (typeof checkLimitStatus === 'function') {
        checkLimitStatus();
    }
}

function updateProgressBar(points) {
    const progressFill = document.getElementById('progress-fill');
    const indicator = document.querySelector('.progress-indicator');
    const checkpoints = document.querySelectorAll('.checkpoint');
    
    // Definir los niveles de checkpoints
    const levels = [
        { points: 200, reward: '5 ARS' },
        { points: 700, reward: '20 ARS' },
        { points: 1500, reward: '50 ARS' },
        { points: 3000, reward: '120 ARS' }
    ];
    
    const maxPoints = 3000;
    const percentage = Math.min((points / maxPoints) * 100, 100);
    
    // Posicionar el indicador "¡ESTÁS AQUÍ!" inmediatamente sin delay
    if (indicator) {
        // Si no hay puntos, mantener posición inicial en -1px (CSS)
        if (points === 0) {
            // Ya está en left: -1px por CSS
            indicator.style.left = '-1px';
            indicator.style.transform = 'translateX(0)';
        } else {
            // Calcular posición dentro del rango de 15% a 88% (por el nuevo padding)
            const adjustedPercentage = 15 + (percentage * 0.73);
            indicator.style.left = `${adjustedPercentage}%`;
            indicator.style.transform = 'translateX(-50%)';
        }
    }
    
    // Animar la barra de progreso
    if (progressFill) {
        setTimeout(() => {
            progressFill.style.width = `${percentage}%`;
        }, 300);
    }
    
    // Marcar checkpoints alcanzados
    checkpoints.forEach((checkpoint, index) => {
        const checkpointPoints = parseInt(checkpoint.dataset.points);
        if (points >= checkpointPoints) {
            checkpoint.classList.add('active');
        } else {
            checkpoint.classList.remove('active');
        }
    });
    
    // Actualizar el texto de puntos faltantes y las tarjetas de vales
    // Solo si estamos en el dashboard (si existen los elementos de vales)
    if (document.getElementById('vouchers-title')) {
        initVouchersSection();
    }
}

// Exponer función globalmente para uso futuro
window.updateAtrapapuntos = updateAtrapapuntos;

// =====================
// ADMIN PANEL: Cargar datos
// =====================
async function loadAdminPanelData() {
    try {
        // Actualizar contadores de solicitudes
        await updateAdminStatsCounters();
        
        // Cargar tab actual de solicitudes
        showAdminTab(currentAdminTab || 'pending');
        
        // Cargar usuarios aprobados
        await loadApprovedUsers();
    } catch (e) {
        console.error('Error cargando panel de administración:', e);
    }
}

async function updateAdminStatsCounters() {
    try {
        const headers = { 'Authorization': `Bearer ${getAuthToken()}` };
        const resp = await fetch(`${API_BASE_URL}admin_stats.php`, { headers });
        const data = await resp.json();
        
        if (data.success && data.stats) {
            const pendingEl = document.getElementById('stat-pending-requests');
            const approvedEl = document.getElementById('stat-approved-requests');
            const rejectedEl = document.getElementById('stat-rejected-requests');
            
            if (pendingEl) pendingEl.textContent = data.stats.pending || 0;
            if (approvedEl) approvedEl.textContent = data.stats.approved || 0;
            if (rejectedEl) rejectedEl.textContent = data.stats.rejected || 0;
        }
    } catch (e) {
        console.error('Error al cargar estadísticas admin:', e);
    }
}

async function loadApprovedUsers() {
    try {
        const headers = { 'Authorization': `Bearer ${getAuthToken()}` };
        const resp = await fetch(`${API_BASE_URL}approved_users.php`, { headers });
        const data = await resp.json();
        
        const tbody = document.getElementById('approved-users-body');
        const emptyMessage = document.getElementById('no-users-message');
        const tableContainer = tbody?.closest('.table-responsive');
        
        if (!tbody || !emptyMessage) return;
        
        tbody.innerHTML = '';
        
        if (!data.success || !data.users || data.users.length === 0) {
            emptyMessage.style.display = 'flex';
            if (tableContainer) tableContainer.style.display = 'none';
            return;
        }
        
        emptyMessage.style.display = 'none';
        if (tableContainer) tableContainer.style.display = 'block';
        
        data.users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(user.nombre || user.name || '-')}</td>
                <td>${escapeHtml(user.email || '-')}</td>
                <td>${escapeHtml(user.pais || user.country || '-')}</td>
                <td style="text-align: center; font-weight: 600; color: #fdbe02;">${user.saldo || user.balance || 0}</td>
                <td class="actions-cell">
                    <button class="btn-assign-points" onclick="openAssignPointsModal(${user.id}, '${escapeHtml(user.nombre || user.name || 'Usuario')}')" title="Asignar puntos">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Asignar Puntos
                    </button>
                </td>`;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error('Error al cargar usuarios aprobados:', e);
    }
}

// Variables para el modal de asignación de puntos
let currentAssignUserId = null;
let currentAssignUserName = '';

function openAssignPointsModal(userId, userName) {
    currentAssignUserId = userId;
    currentAssignUserName = userName;
    
    const modal = document.getElementById('assign-points-modal');
    const userNameEl = document.getElementById('assign-user-name');
    const amountInput = document.getElementById('points-amount');
    const descInput = document.getElementById('points-description');
    
    if (userNameEl) userNameEl.textContent = userName;
    if (amountInput) amountInput.value = '';
    if (descInput) descInput.value = '';
    if (modal) modal.style.display = 'flex';
}

function closeAssignPointsModal() {
    const modal = document.getElementById('assign-points-modal');
    if (modal) modal.style.display = 'none';
    currentAssignUserId = null;
    currentAssignUserName = '';
}

async function submitAssignPoints() {
    const amountInput = document.getElementById('points-amount');
    const descInput = document.getElementById('points-description');
    
    if (!amountInput || !currentAssignUserId) return;
    
    const amount = parseInt(amountInput.value);
    if (!amount || amount < 1) {
        alert('Por favor ingresa una cantidad válida de puntos');
        return;
    }
    
    const description = descInput ? descInput.value.trim() : '';
    
    try {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
        };
        
        const resp = await fetch(`${API_BASE_URL}assign_points.php`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                user_id: currentAssignUserId,
                points: amount,
                description: description || 'Asignación manual de puntos'
            })
        });
        
        const data = await resp.json();
        
        if (data.success) {
            alert(`¡Puntos asignados exitosamente a ${currentAssignUserName}!`);
            closeAssignPointsModal();
            // Recargar usuarios para actualizar saldos
            await loadApprovedUsers();
        } else {
            alert(data.message || 'Error al asignar puntos');
        }
    } catch (e) {
        console.error('Error al asignar puntos:', e);
        alert('Error de conexión al asignar puntos');
    }
}

// Exponer funciones globalmente
window.openAssignPointsModal = openAssignPointsModal;
window.closeAssignPointsModal = closeAssignPointsModal;
window.submitAssignPoints = submitAssignPoints;

// =====================
// ADMIN: Tabs y datos
// =====================
function showAdminTab(tabName) {
    // Botones activos
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    const btn = document.querySelector(`.tab-button[onclick="showAdminTab('${tabName}')"]`);
    btn?.classList.add('active');

    // Contenidos
    document.querySelectorAll('.admin-tab-content').forEach(tab => tab.style.display = 'none');
    const panel = document.getElementById(`tab-${tabName}`);
    if (panel) panel.style.display = 'block';

    currentAdminTab = tabName;
    loadAdminRequests(tabName);
}

// Variable global para almacenar todas las solicitudes
let allAdminRequests = { pending: [], approved: [], rejected: [] };

async function loadAdminRequests(tabName) {
    if (!currentUserIsAdmin) return;
    const url = `${API_BASE_URL}admin_requests.php?tab=${encodeURIComponent(tabName)}`;
    try {
        const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${getAuthToken()}` } });
        const data = await resp.json();
        if (!data.success) {
            console.error('Error al cargar solicitudes:', data.message);
            renderAdminLists(tabName, []);
            return;
        }
        // Obtener las solicitudes del tab actual
        const items = Array.isArray(data.solicitudes) ? data.solicitudes : [];
        
        // Guardar en el objeto global por tab
        if (!allAdminRequests) allAdminRequests = { pending: [], approved: [], rejected: [] };
        allAdminRequests[tabName] = items;
        
        renderAdminLists(tabName, items);
    } catch (e) {
        console.error('Error de red al cargar solicitudes:', e);
        renderAdminLists(tabName, []);
    }
}

function renderAdminLists(tabName, items) {
    if (tabName === 'pending') {
        const tbody = document.getElementById('solicitudes-pendientes-body');
        const empty = document.getElementById('no-pending-message');
        const tableContainer = tbody?.closest('.table-responsive');
        if (tbody) tbody.innerHTML = '';
        if (!items.length) {
            if (empty) empty.style.display = 'flex';
            if (tableContainer) tableContainer.style.display = 'none';
            return;
        }
        if (empty) empty.style.display = 'none';
        if (tableContainer) tableContainer.style.display = 'block';
        items.forEach(it => {
            const tr = document.createElement('tr');
            // Guardar datos completos en data attribute
            tr.dataset.solicitud = JSON.stringify(it);
            tr.innerHTML = `
                <td>${escapeHtml(it.nombre || '')}</td>
                <td>${escapeHtml(it.email || '-')}</td>
                <td>${it.edad ?? '-'}</td>
                <td>${escapeHtml(it.dni || '')}</td>
                <td>${escapeHtml(it.pais || '')}</td>
                <td>${escapeHtml(it.provincia || '')}</td>
                <td>${escapeHtml(it.telefono || '')}</td>
                <td>${formatDateTime(it.created_at)}</td>
                <td class="actions-cell">
                    <button class="btn-icon approve" onclick="adminApprove(${Number(it.id)})" title="Aprobar">✓</button>
                    <button class="btn-icon reject" onclick="adminReject(${Number(it.id)})" title="Rechazar">✕</button>
                </td>
                <td class="export-cell">
                    <button class="btn-export" onclick="showExportMenu(this)" title="Exportar datos">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                        </svg>
                    </button>
                </td>`;
            tbody?.appendChild(tr);
        });
    } else if (tabName === 'approved') {
        const tbody = document.getElementById('solicitudes-aprobadas-body');
        const empty = document.getElementById('no-approved-message');
        const tableContainer = tbody?.closest('.table-responsive');
        if (tbody) tbody.innerHTML = '';
        if (!items.length) {
            if (empty) empty.style.display = 'flex';
            if (tableContainer) tableContainer.style.display = 'none';
            return;
        }
        if (empty) empty.style.display = 'none';
        if (tableContainer) tableContainer.style.display = 'block';
        items.forEach(it => {
            const tr = document.createElement('tr');
            tr.dataset.solicitud = JSON.stringify(it);
            tr.innerHTML = `
                <td>${escapeHtml(it.nombre || '')}</td>
                <td>${escapeHtml(it.email || '-')}</td>
                <td>${escapeHtml(it.telefono || '')}</td>
                <td>${formatDateTime(it.processed_at)}</td>
                <td>Aprobada</td>
                <td class="export-cell">
                    <button class="btn-export" onclick="showExportMenu(this)" title="Exportar datos">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                        </svg>
                    </button>
                </td>`;
            tbody?.appendChild(tr);
        });
    } else if (tabName === 'rejected') {
        const tbody = document.getElementById('solicitudes-rechazadas-body');
        const empty = document.getElementById('no-rejected-message');
        const tableContainer = tbody?.closest('.table-responsive');
        if (tbody) tbody.innerHTML = '';
        if (!items.length) {
            if (empty) empty.style.display = 'flex';
            if (tableContainer) tableContainer.style.display = 'none';
            return;
        }
        if (empty) empty.style.display = 'none';
        if (tableContainer) tableContainer.style.display = 'block';
        items.forEach(it => {
            const tr = document.createElement('tr');
            tr.dataset.solicitud = JSON.stringify(it);
            tr.innerHTML = `
                <td>${escapeHtml(it.nombre || '')}</td>
                <td>${escapeHtml(it.email || '-')}</td>
                <td>${escapeHtml(it.motivo_rechazo || '-')}</td>
                <td>${escapeHtml(it.telefono || '')}</td>
                <td>${formatDateTime(it.processed_at)}</td>
                <td>Rechazada</td>
                <td class="export-cell">
                    <button class="btn-export" onclick="showExportMenu(this)" title="Exportar datos">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                        </svg>
                    </button>
                </td>`;
            tbody?.appendChild(tr);
        });
    }
}

async function adminApprove(id) {
    await adminAction('approve', id);
}
async function adminReject(id) {
    const motivo = prompt('Motivo de rechazo (opcional):') || '';
    await adminAction('reject', id, motivo);
}
async function adminAction(action, solicitud_id, motivo = '') {
    try {
        const resp = await fetch(`${API_BASE_URL}admin_actions.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify({ action, solicitud_id, motivo })
        });
        const data = await resp.json();
        if (!data.success) {
            alert(data.message || 'Acción no completada.');
        }
        // refrescar lista actual
        loadAdminRequests(currentAdminTab || 'pending');
    } catch (e) {
        alert('Error de red al procesar la acción.');
    }
}

function formatDateTime(s) {
    if (!s) return '-';
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleString();
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

// Función para exportar datos de solicitud en diferentes formatos
function exportDataFromRow(button, format = 'json') {
    try {
        // Encontrar la fila (tr) que contiene el botón
        const tr = button.closest('tr');
        if (!tr || !tr.dataset.solicitud) {
            alert('No se encontraron datos para exportar');
            return;
        }
        
        // Obtener los datos de la solicitud desde el data attribute
        const solicitud = JSON.parse(tr.dataset.solicitud);
        
        // Datos públicos base a exportar (sin información sensible)
        const exportData = {
            id: solicitud.id,
            nombre: solicitud.nombre,
            email: solicitud.email || '-',
            edad: solicitud.edad,
            genero: solicitud.genero || '-',
            dni: solicitud.dni || '-',
            pais: solicitud.pais || '-',
            provincia: solicitud.provincia || '-',
            telefono: solicitud.telefono || '-',
            fecha_solicitud: solicitud.created_at
        };
        
        // Agregar campos específicos según el estado
        const status = solicitud.status || 'pending';
        
        if (status === 'pending') {
            // Para solicitudes pendientes: mostrar estado y que no hay procesamiento
            exportData.estado = 'pending';
            exportData.fecha_procesamiento = null;
            exportData.motivo_rechazo = null;
        } else if (status === 'approved') {
            // Para solicitudes aprobadas: NO mostrar estado ni motivo_rechazo
            exportData.fecha_aprobacion = solicitud.processed_at;
        } else if (status === 'rejected') {
            // Para solicitudes rechazadas: NO mostrar estado, mostrar motivo y fecha de procesamiento
            exportData.fecha_procesamiento = solicitud.processed_at;
            exportData.motivo_rechazo = solicitud.motivo_rechazo || 'No especificado';
        }
        
        let content, mimeType, extension;
        const fileName = `solicitud_${solicitud.id}_${new Date().toISOString().split('T')[0]}`;
        
        switch(format.toLowerCase()) {
            case 'csv':
                // Crear CSV
                const headers = Object.keys(exportData).join(',');
                const values = Object.values(exportData).map(v => {
                    // Escapar valores que contengan comas
                    const str = String(v === null ? '' : v);
                    return str.includes(',') ? `"${str}"` : str;
                }).join(',');
                content = `${headers}\n${values}`;
                mimeType = 'text/csv;charset=utf-8;';
                extension = 'csv';
                break;
                
            case 'txt':
                // Crear TXT
                content = Object.entries(exportData).map(([key, value]) => {
                    return `${key}: ${value === null ? '-' : value}`;
                }).join('\n');
                mimeType = 'text/plain;charset=utf-8;';
                extension = 'txt';
                break;
                
            case 'json':
            default:
                // Crear JSON
                content = JSON.stringify(exportData, null, 2);
                mimeType = 'application/json';
                extension = 'json';
                break;
        }
        
        // Crear y descargar archivo
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        alert('Error al exportar datos: ' + e.message);
        console.error('Error en exportDataFromRow:', e);
    }
}

// Función para mostrar menú de opciones de exportación
function showExportMenu(button) {
    // Cerrar cualquier menú abierto
    document.querySelectorAll('.export-menu').forEach(menu => menu.remove());
    
    // Crear menú de opciones
    const menu = document.createElement('div');
    menu.className = 'export-menu';
    menu.innerHTML = `
        <button onclick="exportDataFromRow(this.closest('.export-menu').previousButton, 'json'); this.closest('.export-menu').remove();">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            Exportar como JSON
        </button>
        <button onclick="exportDataFromRow(this.closest('.export-menu').previousButton, 'csv'); this.closest('.export-menu').remove();">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            Exportar como CSV
        </button>
        <button onclick="exportDataFromRow(this.closest('.export-menu').previousButton, 'txt'); this.closest('.export-menu').remove();">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            Exportar como TXT
        </button>
    `;
    
    menu.previousButton = button;
    
    // Agregar el menú al body primero para poder medir sus dimensiones
    document.body.appendChild(menu);
    
    // Posicionar el menú
    const rect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    
    menu.style.position = 'fixed';
    
    // Siempre debajo del botón
    const top = rect.bottom + 5;
    
    // Alinear el menú con el borde izquierdo del botón y moverlo 10% a la izquierda
    const offset = menuRect.width * 0.10;
    let left = rect.left - offset;
    
    // En móviles, ajustar para que siempre sea visible
    if (viewportWidth <= 480) {
        // Asegurar que el menú no se salga por la derecha
        if (left + menuRect.width > viewportWidth - 10) {
            left = viewportWidth - menuRect.width - 10;
        }
        // Asegurar que el menú no se salga por la izquierda
        if (left < 10) {
            left = 10;
        }
    }
    
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
    
    // Cerrar menú al hacer clic fuera
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && e.target !== button) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
                window.removeEventListener('scroll', closeMenuOnScroll, true);
            }
        });
    }, 100);
    
    // Cerrar menú al hacer scroll
    function closeMenuOnScroll() {
        menu.remove();
        window.removeEventListener('scroll', closeMenuOnScroll, true);
    }
    window.addEventListener('scroll', closeMenuOnScroll, true);
}

// ========================================
// FILTROS POR FECHA
// ========================================

// Variables globales para el filtro
let currentDateFilter = null;
let filteredRequests = [];

// Toggle del panel de filtros
function toggleFilters() {
    const filtersContent = document.getElementById('filters-content');
    const toggleBtn = document.querySelector('.btn-toggle-filters');
    
    if (filtersContent && toggleBtn) {
        const isActive = filtersContent.classList.contains('active');
        if (isActive) {
            filtersContent.classList.remove('active');
            toggleBtn.classList.remove('active');
        } else {
            filtersContent.classList.add('active');
            toggleBtn.classList.add('active');
        }
    }
}

// Cambiar tipo de filtro
function handleFilterTypeChange() {
    const filterType = document.getElementById('filter-type').value;
    
    // Ocultar todos los grupos de filtro
    document.getElementById('filter-day').style.display = 'none';
    document.getElementById('filter-range').style.display = 'none';
    document.getElementById('filter-range-end').style.display = 'none';
    document.getElementById('filter-week-year').style.display = 'none';
    document.getElementById('filter-week-number').style.display = 'none';
    document.getElementById('filter-biweekly').style.display = 'none';
    document.getElementById('filter-biweekly-part').style.display = 'none';
    document.getElementById('filter-month').style.display = 'none';
    document.getElementById('filter-month-range-start').style.display = 'none';
    document.getElementById('filter-month-range-end').style.display = 'none';
    
    // Mostrar el grupo correspondiente
    switch(filterType) {
        case 'day':
            document.getElementById('filter-day').style.display = 'flex';
            break;
        case 'range':
            document.getElementById('filter-range').style.display = 'flex';
            document.getElementById('filter-range-end').style.display = 'flex';
            break;
        case 'week':
            document.getElementById('filter-week-year').style.display = 'flex';
            document.getElementById('filter-week-number').style.display = 'flex';
            break;
        case 'biweekly':
            document.getElementById('filter-biweekly').style.display = 'flex';
            document.getElementById('filter-biweekly-part').style.display = 'flex';
            break;
        case 'month':
            document.getElementById('filter-month').style.display = 'flex';
            break;
        case 'month-range':
            document.getElementById('filter-month-range-start').style.display = 'flex';
            document.getElementById('filter-month-range-end').style.display = 'flex';
            break;
    }
}

// Aplicar filtro de fecha
function applyDateFilter() {
    const filterType = document.getElementById('filter-type').value;
    let startDate, endDate, description;
    
    try {
        switch(filterType) {
            case 'day':
                const singleDate = document.getElementById('single-date').value;
                if (!singleDate) {
                    alert('Por favor selecciona una fecha');
                    return;
                }
                startDate = new Date(singleDate);
                endDate = new Date(singleDate);
                endDate.setHours(23, 59, 59, 999);
                description = `Día: ${formatDateForDisplay(singleDate)}`;
                break;
                
            case 'range':
                const start = document.getElementById('start-date').value;
                const end = document.getElementById('end-date').value;
                if (!start || !end) {
                    alert('Por favor selecciona ambas fechas');
                    return;
                }
                startDate = new Date(start);
                endDate = new Date(end);
                endDate.setHours(23, 59, 59, 999);
                description = `${formatDateForDisplay(start)} - ${formatDateForDisplay(end)}`;
                break;
                
            case 'week':
                const weekYear = document.getElementById('week-year').value;
                const weekNumber = document.getElementById('week-number').value;
                if (!weekYear || !weekNumber) {
                    alert('Por favor selecciona el año y número de semana');
                    return;
                }
                const week = parseInt(weekNumber);
                if (week < 1 || week > 52) {
                    alert('El número de semana debe estar entre 1 y 52');
                    return;
                }
                const dates = getWeekDates(parseInt(weekYear), week);
                startDate = dates.start;
                endDate = dates.end;
                description = `Semana ${week}, ${weekYear}`;
                break;
                
            case 'biweekly':
                const biweeklyMonth = document.getElementById('biweekly-month').value;
                const biweeklyPart = document.getElementById('biweekly-part').value;
                if (!biweeklyMonth) {
                    alert('Por favor selecciona un mes');
                    return;
                }
                const [bYear, bMonth] = biweeklyMonth.split('-');
                if (biweeklyPart === 'first') {
                    startDate = new Date(parseInt(bYear), parseInt(bMonth) - 1, 1);
                    endDate = new Date(parseInt(bYear), parseInt(bMonth) - 1, 15, 23, 59, 59, 999);
                    description = `Primera quincena de ${getMonthName(parseInt(bMonth) - 1)}, ${bYear}`;
                } else {
                    startDate = new Date(parseInt(bYear), parseInt(bMonth) - 1, 16);
                    endDate = new Date(parseInt(bYear), parseInt(bMonth), 0, 23, 59, 59, 999);
                    description = `Segunda quincena de ${getMonthName(parseInt(bMonth) - 1)}, ${bYear}`;
                }
                break;
                
            case 'month':
                const monthValue = document.getElementById('single-month').value;
                if (!monthValue) {
                    alert('Por favor selecciona un mes');
                    return;
                }
                const [mYear, mMonth] = monthValue.split('-');
                startDate = new Date(parseInt(mYear), parseInt(mMonth) - 1, 1);
                endDate = new Date(parseInt(mYear), parseInt(mMonth), 0, 23, 59, 59, 999);
                description = `${getMonthName(parseInt(mMonth) - 1)}, ${mYear}`;
                break;
                
            case 'month-range':
                const startMonth = document.getElementById('start-month').value;
                const endMonth = document.getElementById('end-month').value;
                if (!startMonth || !endMonth) {
                    alert('Por favor selecciona ambos meses');
                    return;
                }
                const [sYear, sMonth] = startMonth.split('-');
                const [eYear, eMonth] = endMonth.split('-');
                startDate = new Date(parseInt(sYear), parseInt(sMonth) - 1, 1);
                endDate = new Date(parseInt(eYear), parseInt(eMonth), 0, 23, 59, 59, 999);
                description = `${getMonthName(parseInt(sMonth) - 1)} ${sYear} - ${getMonthName(parseInt(eMonth) - 1)} ${eYear}`;
                break;
        }
        
        // Guardar filtro actual
        currentDateFilter = { startDate, endDate, description };
        
        // Aplicar filtro a los datos actuales
        filterCurrentRequests();
        
        // Mostrar indicador de filtro activo
        const filterActive = document.getElementById('filter-active');
        const filterDescription = document.getElementById('filter-description');
        if (filterActive && filterDescription) {
            filterActive.style.display = 'flex';
            filterDescription.textContent = `Filtro activo: ${description}`;
        }
        
        alert(`Filtro aplicado: ${description}`);
        
    } catch (error) {
        console.error('Error al aplicar filtro:', error);
        alert('Error al aplicar el filtro. Por favor intenta nuevamente.');
    }
}

// Filtrar las solicitudes actuales
function filterCurrentRequests() {
    if (!currentDateFilter) return;
    
    const currentTab = currentAdminTab || 'pending';
    const allData = allAdminRequests[currentTab] || [];
    
    filteredRequests = allData.filter(item => {
        const itemDate = new Date(item.created_at || item.fecha_solicitud);
        return itemDate >= currentDateFilter.startDate && itemDate <= currentDateFilter.endDate;
    });
    
    // Renderizar los datos filtrados
    renderAdminLists(currentTab, filteredRequests);
}

// Limpiar filtros
function clearDateFilter() {
    currentDateFilter = null;
    filteredRequests = [];
    
    // Limpiar todos los inputs
    document.getElementById('single-date').value = '';
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
    document.getElementById('week-year').value = '2025';
    document.getElementById('week-number').value = '';
    document.getElementById('biweekly-month').value = '';
    document.getElementById('single-month').value = '';
    document.getElementById('start-month').value = '';
    document.getElementById('end-month').value = '';
    
    // Ocultar indicador de filtro activo
    const filterActive = document.getElementById('filter-active');
    if (filterActive) {
        filterActive.style.display = 'none';
    }
    
    // Recargar datos sin filtro
    loadAdminRequests(currentAdminTab || 'pending');
    
    alert('Filtros limpiados');
}

// Exportar datos filtrados
function exportFilteredData() {
    const dataToExport = currentDateFilter ? filteredRequests : (allAdminRequests[currentAdminTab || 'pending'] || []);
    
    if (dataToExport.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    // Crear CSV
    const headers = ['ID', 'Nombre', 'Email', 'DNI', 'País', 'Provincia', 'Teléfono', 'Fecha', 'Estado'];
    const csvRows = [headers.join(',')];
    
    dataToExport.forEach(item => {
        const row = [
            item.id || '',
            `"${item.nombre || ''}"`,
            item.email || '',
            item.dni || '',
            item.pais || '',
            item.provincia || '',
            item.telefono || '',
            item.created_at || item.fecha_solicitud || '',
            item.status || ''
        ];
        csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const filterText = currentDateFilter ? `_filtrado_${currentDateFilter.description.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
    a.download = `solicitudes_${currentAdminTab || 'pending'}${filterText}_${new Date().toISOString().split('T')[0]}.csv`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(`Exportados ${dataToExport.length} registros`);
}

// Funciones auxiliares
function formatDateForDisplay(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function getWeekDates(year, week) {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dayOfWeek = simple.getDay();
    const ISOweekStart = simple;
    if (dayOfWeek <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    
    const start = new Date(ISOweekStart);
    const end = new Date(ISOweekStart);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
}

function getMonthName(monthIndex) {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[monthIndex];
}

// Exponer funciones para los onclick del HTML
window.showAdminTab = showAdminTab;
window.adminApprove = adminApprove;
window.adminReject = adminReject;
window.exportDataFromRow = exportDataFromRow;
window.showExportMenu = showExportMenu;
window.toggleFilters = toggleFilters;
window.handleFilterTypeChange = handleFilterTypeChange;
window.applyDateFilter = applyDateFilter;
window.clearDateFilter = clearDateFilter;
window.exportFilteredData = exportFilteredData;
window.closeDashboardMenu = closeDashboardMenu;

async function loadProfileContent() {
    try {
        const response = await fetch('assets/views/profile_content.html');
        const html = await response.text();
        const main = document.querySelector('.dashboard-main');
        if (main) {
            main.outerHTML = html;
        }
        
        // Reemplazar el botón "Mi Perfil" con "Volver al dashboard"
        const profileLink = document.getElementById('link-profile');
        if (profileLink) {
            profileLink.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-dashboard"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="17" rx="1"/></svg>
                Volver al dashboard
            `;
            // Cambiar el evento para que vaya al dashboard
            const newProfileLink = profileLink.cloneNode(true);
            profileLink.parentNode.replaceChild(newProfileLink, profileLink);
            newProfileLink.addEventListener('click', (e) => { e.preventDefault(); navigate('dashboard'); });
        }
        
        attachProfileListeners();
    } catch (error) {
        console.error('Error loading profile content:', error);
    }
}

async function loadPaymentDataContent() {
    try {
        const response = await fetch('assets/views/payment_data_content.html');
        const html = await response.text();
        const main = document.querySelector('.dashboard-main');
        if (main) {
            main.outerHTML = html;
        }
        
        // Reemplazar el botón "Datos para reservas" con "Volver al dashboard"
        const paymentLink = document.getElementById('link-payment-data');
        if (paymentLink) {
            paymentLink.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-dashboard"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="17" rx="1"/></svg>
                Volver al dashboard
            `;
            // Cambiar el evento para que vaya al dashboard
            const newPaymentLink = paymentLink.cloneNode(true);
            paymentLink.parentNode.replaceChild(newPaymentLink, paymentLink);
            newPaymentLink.addEventListener('click', (e) => { e.preventDefault(); navigate('dashboard'); });
        }
        
        attachPaymentDataListeners();
    } catch (error) {
        console.error('Error loading payment data content:', error);
    }
}

async function loadSecurityContent() {
    try {
        const response = await fetch('assets/views/security_view.html');
        const html = await response.text();
        const main = document.querySelector('.dashboard-main');
        if (main) {
            main.outerHTML = `<main class="dashboard-main container">${html}</main>`;
        }
        
        // Reemplazar el botón "Seguridad" con "Volver al dashboard"
        const securityLink = document.getElementById('link-security');
        if (securityLink) {
            securityLink.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-dashboard"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="17" rx="1"/></svg>
                Volver al dashboard
            `;
            // Cambiar el evento para que vaya al dashboard
            const newSecurityLink = securityLink.cloneNode(true);
            securityLink.parentNode.replaceChild(newSecurityLink, securityLink);
            newSecurityLink.addEventListener('click', (e) => { e.preventDefault(); navigate('dashboard'); });
        }
        
        attachSecurityListeners();
    } catch (error) {
        console.error('Error loading security content:', error);
    }
}

function attachSecurityListeners() {
    initHeaderEffects();
    
    // Cargar email actual del usuario
    loadSecurityData();
    
    // Form handler para cambiar contraseña
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(changePasswordForm);
            const data = Object.fromEntries(formData.entries());
            
            // Validar que las contraseñas coincidan
            if (data.new_password !== data.confirm_password) {
                displayMessage('security-message-area', 'Las contraseñas nuevas no coinciden', 'error');
                return;
            }
            
            // Validar longitud mínima
            if (data.new_password.length < 6) {
                displayMessage('security-message-area', 'La nueva contraseña debe tener al menos 6 caracteres', 'error');
                return;
            }
            
            try {
                const response = await fetch(API_BASE_URL + 'change_password.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getAuthToken()}`
                    },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                
                if (result.success) {
                    displayMessage('security-message-area', result.message, 'success');
                    changePasswordForm.reset();
                } else {
                    displayMessage('security-message-area', result.message || 'Error al cambiar la contraseña', 'error');
                }
            } catch (error) {
                displayMessage('security-message-area', 'Error de conexión', 'error');
            }
        });
    }
    
    // Form handler para cambiar email
    const changeEmailForm = document.getElementById('change-email-form');
    if (changeEmailForm) {
        changeEmailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(changeEmailForm);
            const data = Object.fromEntries(formData.entries());
            
            // Validar formato de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.new_email)) {
                displayMessage('security-message-area', 'El email ingresado no es válido', 'error');
                return;
            }
            
            try {
                const response = await fetch(API_BASE_URL + 'change_email.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getAuthToken()}`
                    },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                
                if (result.success) {
                    displayMessage('security-message-area', result.message, 'success');
                    // Cerrar sesión después de 3 segundos
                    setTimeout(() => {
                        handleLogout();
                    }, 3000);
                } else {
                    displayMessage('security-message-area', result.message || 'Error al cambiar el email', 'error');
                }
            } catch (error) {
                displayMessage('security-message-area', 'Error de conexión', 'error');
            }
        });
    }
}

async function loadSecurityData() {
    try {
        const headers = { 'Authorization': `Bearer ${getAuthToken()}` };
        const response = await fetch(`${API_BASE_URL}profile.php`, { headers, method: 'GET' });
        const result = await response.json();
        
        if (result && result.success && result.data) {
            const email = result.data.profile?.email || '';
            const emailInput = document.getElementById('current-email');
            if (emailInput && email) {
                emailInput.value = email;
            }
        }
    } catch (error) {
        console.error('Error al cargar datos de seguridad:', error);
    }
}

function attachProfileListeners() {
    initHeaderEffects();
    initDashboardMobileMenu();
    
    // Desactivar botón de Datos para reservas
    const paymentDataBtn = document.getElementById("link-payment-data");
    if (paymentDataBtn) {
        paymentDataBtn.classList.add('nav-item-disabled');
        paymentDataBtn.style.opacity = '0.5';
        paymentDataBtn.style.cursor = 'not-allowed';
        paymentDataBtn.addEventListener("click", (e) => { e.preventDefault(); });
    }
    
    // Los listeners del header siguen siendo del dashboard, no necesitamos cambiarlos
    loadProfileData();
    
    // Form submit handler
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(profileForm);
            const data = Object.fromEntries(formData.entries());
            
            try {
                const response = await fetch(API_BASE_URL + 'profile.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getAuthToken()}`
                    },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                
                if (result.success) {
                    displayMessage('profile-message-area', 'Perfil actualizado correctamente', 'success');
                    // Recargar datos desde la DB para reflejar inmediatamente los cambios
                    try { await loadProfileData(); } catch {}
                } else {
                    displayMessage('profile-message-area', result.message || 'Error al actualizar el perfil', 'error');
                }
            } catch (error) {
                displayMessage('profile-message-area', 'Error de conexión', 'error');
            }
        });
    }
}

// ========== SETUP PASSWORD LISTENERS ==========
function attachSetupPasswordListeners() {
    initHeaderEffects();
    
    // Cargar el email del usuario actual
    loadSetupPasswordData();
    
    // Form submit handler
    const setupForm = document.getElementById('setup-password-form');
    if (setupForm) {
        setupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(setupForm);
            const data = Object.fromEntries(formData.entries());
            
            // Validar que las contraseñas coincidan
            if (data.password !== data.confirm_password) {
                displayMessage('setup-message-area', 'Las contraseñas no coinciden', 'error');
                return;
            }
            
            // Validar longitud mínima
            if (data.password.length < 6) {
                displayMessage('setup-message-area', 'La contraseña debe tener al menos 6 caracteres', 'error');
                return;
            }
            
            try {
                const response = await fetch(API_BASE_URL + 'setup_password.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getAuthToken()}`
                    },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                
                if (result.success) {
                    displayMessage('setup-message-area', result.message, 'success');
                    // Esperar 2 segundos y redirigir al login
                    setTimeout(() => {
                        handleLogout();
                    }, 2000);
                } else {
                    displayMessage('setup-message-area', result.message || 'Error al configurar la contraseña', 'error');
                }
            } catch (error) {
                displayMessage('setup-message-area', 'Error de conexión', 'error');
            }
        });
    }
}

async function loadSetupPasswordData() {
    try {
        const headers = { 'Authorization': `Bearer ${getAuthToken()}` };
        const response = await fetch(`${API_BASE_URL}profile.php`, { headers, method: 'GET' });
        const result = await response.json();
        
        if (result && result.success && result.data) {
            const email = result.data.profile?.email || '';
            const emailInput = document.getElementById('setup-email');
            if (emailInput && email) {
                emailInput.value = email;
            }
        }
    } catch (error) {
        console.error('Error al cargar datos de configuración:', error);
    }
}

async function loadProfileData() {
    try {
        const headers = { 'Authorization': `Bearer ${getAuthToken()}` };
        
        // 1) Intentar primero obtener datos desde nuestra base de datos
        try {
            const dbResp = await fetch(`${API_BASE_URL}profile.php`, { headers, method: 'GET' });
            const dbJson = await dbResp.json();
            if (dbJson && dbJson.success && dbJson.data) {
                const d = dbJson.data || {};
                const profile = d.profile || {};
                const nameInput = document.getElementById('profile-name');
                const emailInput = document.getElementById('profile-email');
                const companyInput = document.getElementById('profile-company');
                const phoneInput = document.getElementById('profile-phone');
                const countryInput = document.getElementById('profile-country');
                if (nameInput) nameInput.value = d.name || '';
                if (emailInput) emailInput.value = d.email || '';
                if (companyInput) companyInput.value = profile.company_name || '';
                if (phoneInput) phoneInput.value = profile.phone_number || '';
                if (countryInput) countryInput.value = profile.country || '';
                return; // Datos cargados desde nuestra DB, no hace falta fallback
            }
        } catch (e) {
            console.warn('Perfil DB no disponible, se intenta fallback a Happier /me');
        }
        
        // 2) Segundo fallback: obtener nombre/email desde nuestro backend (validate_token)
        try {
            const vtResp = await fetch(`${API_BASE_URL}validate_token.php`, { headers });
            const vtJson = await vtResp.json();
            if (vtJson && vtJson.success && vtJson.data) {
                const d = vtJson.data || {};
                const nameInput = document.getElementById('profile-name');
                const emailInput = document.getElementById('profile-email');
                if (nameInput) nameInput.value = d.name || d.username || d.email || '';
                if (emailInput) emailInput.value = d.email || '';
            }
        } catch (e) {
            // Continúa a fallback Happier
        }

        // 3) Fallback final: Obtener datos del usuario desde Happier API
        const meResp = await fetch(`${API_BASE_URL}happier_proxy.php?path=me`, { headers });
        const meData = await meResp.json();
        
        console.log('Datos de perfil (fallback):', meData);
        
        if (meData && meData.success && meData.data) {
            const userData = meData.data;
            
            // Llenar campos de solo lectura
            const nameInput = document.getElementById('profile-name');
            const emailInput = document.getElementById('profile-email');
            
            if (nameInput) {
                nameInput.value = userData.name || userData.full_name || userData.username || '';
            }
            
            if (emailInput) {
                emailInput.value = userData.email || '';
            }
            
            // Llenar campos editables si existen en la respuesta
            const companyInput = document.getElementById('profile-company');
            const phoneInput = document.getElementById('profile-phone');
            const countryInput = document.getElementById('profile-country');
            
            if (companyInput && userData.company_name) {
                companyInput.value = userData.company_name;
            }
            
            if (phoneInput && userData.phone_number) {
                phoneInput.value = userData.phone_number;
            }
            
            if (countryInput && userData.country) {
                countryInput.value = userData.country;
            }
        }
    } catch (error) {
        console.error('Error cargando datos de perfil:', error);
        displayMessage('profile-message-area', 'Error al cargar los datos del perfil', 'error');
    }
}

// Payment Data Listeners y funcionalidad
function attachPaymentDataListeners() {
    initHeaderEffects();
    // Los listeners del header ya están configurados por el dashboard
    
    const cardNumberInput = document.getElementById('card-number');
    const expiryDateInput = document.getElementById('expiry-date');
    const cvvInput = document.getElementById('cvv');
    const cardBrandIcon = document.getElementById('card-brand-icon');
    const paymentForm = document.getElementById('payment-form');
    
    // Detección del tipo de tarjeta y mostrar logo
    function detectCardBrand(cardNumber) {
        const cleaned = cardNumber.replace(/\s/g, '');
        
        // Visa: empieza con 4
        if (/^4/.test(cleaned)) {
            return { brand: 'visa', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/04/Visa.svg' };
        }
        // Mastercard: empieza con 51-55 o 2221-2720
        if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) {
            return { brand: 'mastercard', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg' };
        }
        // American Express: empieza con 34 o 37
        if (/^3[47]/.test(cleaned)) {
            return { brand: 'amex', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg' };
        }
        
        return null;
    }
    
    // Formatear número de tarjeta con espacios cada 4 dígitos
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
            let formatted = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formatted;
            
            const cardBrand = detectCardBrand(value);
            if (cardBrand && cardBrandIcon) {
                cardBrandIcon.src = cardBrand.logo;
                cardBrandIcon.alt = cardBrand.brand;
                cardBrandIcon.style.display = 'block';
            } else if (cardBrandIcon) {
                cardBrandIcon.style.display = 'none';
            }
        });
    }
    
    // Formatear fecha de expiración MM/AA
    if (expiryDateInput) {
        expiryDateInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4);
            }
            e.target.value = value;
        });
    }
    
    // Solo números en CVV
    if (cvvInput) {
        cvvInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }
    
    // Manejar envío del formulario
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(paymentForm);
            const data = {
                cardNumber: formData.get('card-number'),
                expiryDate: formData.get('expiry-date'),
                cvv: formData.get('cvv'),
                cardholderName: formData.get('cardholder-name'),
                billingAddress: formData.get('billing-address')
            };
            
            try {
                // Aquí iría la llamada al backend para guardar los datos
                // Por ahora solo mostramos un mensaje de éxito
                console.log('Datos de pago a guardar:', data);
                
                // Simulación de guardado exitoso
                alert('✅ Datos de pago guardados correctamente');
                paymentForm.reset();
                if (cardBrandIcon) cardBrandIcon.style.display = 'none';
                
            } catch (error) {
                console.error('Error guardando datos de pago:', error);
                alert('❌ Error al guardar los datos de pago. Intenta nuevamente.');
            }
        });
    }
}

function initHeaderEffects() {
  const header = document.getElementById("mainHeader");
  if (!header) return;
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const mainNav = document.querySelector(".main-nav");

  let cachedLogoHeight = 0;
  let cachedLogoWidth = 0;
  // Altura del header no se fuerza por JS

  function measureDefaultLogoSize() {
    try {
      const defaultImg = header.querySelector('.logo-default');
      if (!defaultImg) return;
      const wasScrolled = header.classList.contains('scrolled');
      // Asegurar que el default esté visible para medir
      if (wasScrolled) header.classList.remove('scrolled');
      // Medir tamaño CSS ignorando transform (getComputedStyle) y calcular ratio con natural sizes
      const cs = getComputedStyle(defaultImg);
      const cssH = parseFloat(cs.height) || 28; // 28px base en CSS
      const nh = defaultImg.naturalHeight || 1;
      const nw = defaultImg.naturalWidth || 3; // evita div/0, y mantiene ratio aproximado
      const ratio = nw / nh;
      cachedLogoHeight = Math.round(cssH);
      cachedLogoWidth = Math.round(cssH * ratio);
      // Restaurar estado
      if (wasScrolled) header.classList.add('scrolled');
    } catch {}
  }

  function applyScrolledLogoSize() {
    try {
      const colored = header.querySelector('.logo-colored');
      if (!colored) return;
      // Fallbacks si aún no hay medidas
      const h = cachedLogoHeight || 28;
      const w = cachedLogoWidth || 120;
      colored.style.height = `${h}px`;
      colored.style.width = `${w}px`;
    } catch {}
  }


  function handleScroll() {
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    const shouldScroll = scrollY > 10;
    const isScrolled = header.classList.contains("scrolled");
    
    if (shouldScroll && !isScrolled) {
      header.classList.add("scrolled");
    } else if (!shouldScroll && isScrolled) {
      header.classList.remove("scrolled");
    }
    
    // Alinear tamaño cada vez que cambia el estado
    applyScrolledLogoSize();
  }
  
  // Remover clase scrolled al iniciar para asegurar estado inicial correcto
  header.classList.remove("scrolled");
  
  // Forzar estado inicial inmediatamente
  setTimeout(() => {
    handleScroll();
    console.log('Header: Inicialización forzada, scrollY:', window.scrollY);
  }, 100);
  
  window.addEventListener("scroll", handleScroll);
  // Medir y aplicar una vez al cargar y en resize
  const defaultImg = header.querySelector('.logo-default');
  if (defaultImg) {
    if (!defaultImg.complete) {
      defaultImg.addEventListener('load', () => { measureDefaultLogoSize(); applyScrolledLogoSize(); });
    }
  }
  measureDefaultLogoSize();
  applyScrolledLogoSize();
  handleScroll();
  window.addEventListener('resize', () => {
    measureDefaultLogoSize();
    applyScrolledLogoSize();
    handleScroll();
  });
}

// Valida edad y aplica estilos de menor de 18: bordes grises y aviso resaltado
function initAgeValidation() {
  const ageInput = document.getElementById('edad');
  const formEl = document.getElementById('registrationForm');
  const warningEl = document.getElementById('ageWarningText');
  if (!ageInput || !formEl || !warningEl) return;

  const apply = () => {
    const val = parseInt(ageInput.value, 10);
    const isUnderage = Number.isFinite(val) && val < 18;
    formEl.classList.toggle('underage', !!isUnderage);
    warningEl.classList.toggle('age-alert', !!isUnderage);
  };

  ageInput.addEventListener('input', apply);
  ageInput.addEventListener('change', apply);
  apply();
}

function initRegistrationModal() {
    // Inicializa modal de Términos/Privacidad en la landing
    const termsLink = document.getElementById("termsLink");
    const privacyLink = document.getElementById("privacyLink");
    const safeGamingBtn = document.getElementById("safeGamingBtn");
    const minorsProtectionBtn = document.getElementById("minorsProtectionBtn");
    const privacyModal = document.getElementById("privacyModal");
    const modalClose = document.getElementById("modalClose");
    const modalAccept = document.getElementById("modalAccept");
    const legalTitle = document.getElementById("legalModalTitle");
    const legalContent = document.getElementById("legalModalContent");

    if (!privacyModal) {
      return; // No hay modal en esta vista
    }

    function openModal(type) {
      if (legalTitle && legalContent) {
        if (type === 'privacy') {
          legalTitle.textContent = 'Aviso de Privacidad';
          legalContent.innerHTML = `
            <h4>Tratamiento de datos personales</h4>
            <p>Recopilamos y tratamos datos personales con fines de registro de cuenta, validación de identidad, seguridad, comunicación operativa y cumplimiento normativo. No vendemos tu información.</p>
            <h4>Tus derechos</h4>
            <ul>
              <li>Acceder, rectificar y actualizar tus datos.</li>
              <li>Solicitar la eliminación cuando sea legalmente posible.</li>
              <li>Oponerte a ciertos tratamientos y retirar consentimientos.</li>
            </ul>
            <h4>Conservación y seguridad</h4>
            <p>Conservamos la información el tiempo necesario para los fines declarados y aplicamos medidas de seguridad técnicas y organizativas razonables.</p>
          `;
        } else if (type === 'terms') {
          legalTitle.textContent = 'Términos y Condiciones';
          legalContent.innerHTML = `
            <h4>Uso de la plataforma</h4>
            <p>El uso implica aceptar estas condiciones. El servicio es para mayores de 18 años. Nos reservamos el derecho de cambiar funciones, beneficios y promociones.</p>
            <h4>Cuenta y comportamiento</h4>
            <ul>
              <li>La cuenta es personal e intransferible.</li>
              <li>Está prohibido el uso fraudulento o que infrinja la ley aplicable.</li>
              <li>Podremos suspender cuentas ante actividad sospechosa.</li>
            </ul>
            <h4>Limitación de responsabilidad</h4>
            <p>El servicio se ofrece “tal cual”. No garantizamos disponibilidad continua. En ningún caso seremos responsables por daños indirectos o pérdida de beneficios.</p>
          `;
        } else if (type === 'safe') {
          legalTitle.textContent = 'Promesa de juego más seguro';
          legalContent.innerHTML = `
            <h4>Nuestra promesa</h4>
            <p>Promovemos el juego responsable. Te brindamos herramientas para fijar límites, recordatorios y pausas de actividad para proteger tu bienestar.</p>
            <h4>Herramientas disponibles</h4>
            <ul>
              <li>Configuración de límites diarios, semanales y mensuales de depósito.</li>
              <li>Recordatorios de sesión y pausas programadas.</li>
              <li>Asistencia 24/7 para configurar tus límites y resolver dudas.</li>
            </ul>
            <h4>Ayuda y soporte</h4>
            <p>Si necesitás ayuda adicional, nuestro equipo de soporte puede orientarte con recursos y asesoramiento de juego responsable.</p>
          `;
        } else if (type === 'minors') {
          legalTitle.textContent = 'Protección de menores';
          legalContent.innerHTML = `
            <h4>Acceso restringido</h4>
            <p>El uso de la plataforma es exclusivamente para mayores de 18 años. Implementamos controles para prevenir el acceso de menores.</p>
            <h4>Recomendaciones para familias</h4>
            <ul>
              <li>Utilizá controles parentales y contraseñas en dispositivos.</li>
              <li>No compartas credenciales de acceso con menores.</li>
              <li>Supervisá el uso de dispositivos y métodos de pago.</li>
            </ul>
            <h4>Reportes</h4>
            <p>Si sospechás del uso por parte de un menor, contactanos de inmediato para tomar medidas y resguardar la cuenta.</p>
          `;
        }
      }
      privacyModal.classList.add("active");
      privacyModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = "hidden";
    }

    function closeModal() {
      privacyModal.classList.remove("active");
      privacyModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = "";
    }

    // Evitar navegación por defecto y abrir modal
    if (termsLink) termsLink.addEventListener("click", function (e) { e.preventDefault(); openModal('terms'); });
    if (privacyLink) privacyLink.addEventListener("click", function (e) { e.preventDefault(); openModal('privacy'); });
    if (safeGamingBtn) safeGamingBtn.addEventListener("click", function (e) { e.preventDefault(); openModal('safe'); });
    if (minorsProtectionBtn) minorsProtectionBtn.addEventListener("click", function (e) { e.preventDefault(); openModal('minors'); });

    // Cerrar con botón
    if (modalClose) modalClose.addEventListener("click", closeModal);
    if (modalAccept) modalAccept.addEventListener("click", closeModal);

    // Cerrar al hacer clic fuera del contenido
    privacyModal.addEventListener("click", function (e) {
      if (e.target === privacyModal) closeModal();
    });

    // Cerrar con ESC
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && privacyModal.classList.contains("active")) closeModal();
    });
}
function initAgeValidation() {
    // ... (código existente)
}
function initRegistrationForm() {
  const form = document.getElementById('registrationForm');
  if (!form) return;
  // Utilidad: modal de confirmación con confeti
  function showAccountConfirmation(message) {
    // Crear overlay si no existe
    let overlay = document.querySelector('.modal-overlay.account-confirm');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay account-confirm active';
      const content = document.createElement('div');
      content.className = 'modal-content confirmation-modal';
      // Asegurar contexto para el modal
      content.style.position = 'relative';
      // Confetti container a nivel overlay (pantalla completa)
      const confetti = document.createElement('div');
      confetti.className = 'confetti-container';
      overlay.appendChild(confetti);
      // Mensaje
      const inner = document.createElement('div');
      inner.className = 'confirmation-content';
      inner.innerHTML = `
        <h4 style="font-family:'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-weight:400;">¡Solicitud enviada!</h4>
        <p style="font-family:'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; font-weight:400;">${message}</p>
        <div style="margin-top:10px;"><button id="closeConfirm" class="cta-button secondary">Cerrar</button></div>
      `;
      content.appendChild(inner);
      overlay.appendChild(content);
      document.body.appendChild(overlay);

      // Función de cierre unificada
      const closeOverlay = () => {
        overlay.setAttribute('aria-hidden', 'true');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      };

      // Cerrar: click fuera
      overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
      // Cerrar: botón
      content.querySelector('#closeConfirm')?.addEventListener('click', closeOverlay);
      // Cerrar: ESC (una sola vez por apertura)
      document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape' && overlay.getAttribute('aria-hidden') === 'false') closeOverlay();
      }, { once: true });
    } else {
      const p = overlay.querySelector('.confirmation-content p');
      if (p) p.textContent = message;
      const content = overlay.querySelector('.modal-content');
      if (content) content.style.position = 'relative';
      // Reasignar cierre del botón por si el DOM fue recreado previamente
      const btn = overlay.querySelector('#closeConfirm');
      if (btn) {
        btn.onclick = null;
        btn.addEventListener('click', () => {
          overlay.setAttribute('aria-hidden', 'true');
          overlay.classList.remove('active');
          document.body.style.overflow = '';
        }, { once: true });
      }
    }

    // Llenar confeti
    const confettiContainer = overlay.querySelector('.confetti-container');
    if (confettiContainer) {
      confettiContainer.innerHTML = '';
      const colors = ['#fdbe02', '#7f00ff', '#9d4edd', '#ff6b6b', '#4dabf7', '#51cf66'];
      const pieces = 180;
      for (let i = 0; i < pieces; i++) {
        const c = document.createElement('div');
        c.className = 'confetti';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.top = (-Math.random() * 15) + 'vh';
        c.style.background = colors[Math.floor(Math.random() * colors.length)];
        // Variar tamaño por pieza
        const w = (8 + Math.random() * 8).toFixed(0);
        const h = (12 + Math.random() * 12).toFixed(0);
        c.style.width = w + 'px';
        c.style.height = h + 'px';
        const fall = (5.5 + Math.random() * 4.5).toFixed(2) + 's';
        const spin = (0.9 + Math.random() * 2.2).toFixed(2) + 's';
        // Usar shorthand para asegurar ejecución y fill-mode
        c.style.animation = `confettiFall ${fall} linear 0s 1 forwards, confettiSpin ${spin} ease-in-out 0s infinite`;
        confettiContainer.appendChild(c);
      }
    }

    // Mostrar
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // Auto-cierre seguro
    setTimeout(() => {
      if (overlay && overlay.getAttribute('aria-hidden') === 'false') {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    }, 6000);
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Evitar que el navegador agregue parámetros a la URL
    cleanUrlQuery();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    try {
      const resp = await fetch(API_BASE_URL + 'account_request.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await resp.json();
      // Crear/actualizar mensaje
      const msg = document.createElement('div');
      msg.className = `alert ${result.success ? 'alert-success' : 'alert-error'}`;
      msg.textContent = result.message || (result.success ? 'Solicitud enviada correctamente.' : 'No se pudo procesar la solicitud.');
      form.parentNode.insertBefore(msg, form);
      if (result.success) {
        form.reset();
        form.style.display = 'none';
        // Mostrar modal de confirmación con confeti y mensaje solicitado
        showAccountConfirmation('Le damos la bienvenida al programa de recompensas legales, en breve te contactamos para activar tus beneficios.');
      }
      // Limpia cualquier query residual
      cleanUrlQuery();
    } catch (error) {
      const msg = document.createElement('div');
      msg.className = 'alert alert-error';
      msg.textContent = 'Error de conexión. Intenta nuevamente.';
      form.parentNode.insertBefore(msg, form);
    }
  });
}

// ===== SECCIÓN VOUCHERS =====
function initVouchersSection() {
    const pointsAccumulated = parseInt(document.getElementById('points-accumulated')?.textContent || '0');
    const pointsNeededEl = document.getElementById('points-needed');
    const voucherTitle = document.getElementById('vouchers-title');
    
    // Array de checkpoints en orden
    const checkpoints = [200, 700, 1500, 3000];
    
    // Encontrar el siguiente checkpoint alcanzable
    let nextCheckpoint = checkpoints.find(cp => cp > pointsAccumulated);
    
    if (!nextCheckpoint) {
        // Ya alcanzó todos los checkpoints
        if (voucherTitle) {
            voucherTitle.innerHTML = '¡Felicitaciones! Has alcanzado todos los niveles de recompensa';
        }
    } else {
        // Calcular puntos faltantes
        const pointsNeeded = nextCheckpoint - pointsAccumulated;
        if (pointsNeededEl) {
            pointsNeededEl.textContent = pointsNeeded;
        }
    }
    
    // Activar/desactivar botones y tarjetas según puntos disponibles
    const voucherCards = document.querySelectorAll('.voucher-card');
    voucherCards.forEach(card => {
        const btn = card.querySelector('.voucher-btn');
        if (!btn) return;
        
        const requiredPoints = parseInt(btn.dataset.points);
        const voucherValue = btn.dataset.value;
        
        if (pointsAccumulated >= requiredPoints) {
            // Tarjeta canjeable
            card.classList.remove('disabled');
            btn.classList.add('active');
            btn.style.cursor = 'pointer';
            btn.addEventListener('click', () => redeemVoucher(requiredPoints, voucherValue));
        } else {
            // Tarjeta no canjeable - aplicar estilo gris
            card.classList.add('disabled');
            btn.classList.remove('active');
            btn.style.cursor = 'not-allowed';
        }
    });
}

function redeemVoucher(points, value) {
    const pointsAccumulated = parseInt(document.getElementById('points-accumulated')?.textContent || '0');
    
    if (pointsAccumulated < points) {
        alert(`No tienes suficientes puntos. Necesitas ${points} puntos y tienes ${pointsAccumulated}.`);
        return;
    }
    
    // Confirmar canje
    const confirmed = confirm(`¿Deseas canjear ${points} puntos por un vale de ${value}?`);
    if (!confirmed) return;
    
    // Aquí iría la llamada al backend para procesar el canje
    // Por ahora simulamos el canje
    alert(`¡Felicitaciones! Has canjeado ${points} puntos por un vale de ${value}. Te enviaremos el código a tu email.`);
    
    // Restar puntos (esto debería venir del backend)
    const newPoints = pointsAccumulated - points;
    const pointsEl = document.getElementById('points-accumulated');
    if (pointsEl) pointsEl.textContent = newPoints;
    
    // Re-inicializar la sección
    initVouchersSection();
}

// ===== SECCIÓN JUEGO RESPONSABLE =====
let userLimits = {
    period: 'weekly',
    value: 0,
    enabled: false
};

// Cargar límites guardados
function loadUserLimits() {
    const saved = localStorage.getItem('gamingLimits');
    if (saved) {
        userLimits = JSON.parse(saved);
        updateLimitDisplay();
    }
    initResponsibleGaming();
}

// Actualizar display de límites
function updateLimitDisplay() {
    const statusText = document.getElementById('limit-status-text');
    const limitDetails = document.getElementById('limit-details');
    const limitValueDisplay = document.getElementById('limit-value-display');
    const limitPeriodDisplay = document.getElementById('limit-period-display');
    
    if (userLimits.enabled && userLimits.value > 0) {
        statusText.textContent = 'Límite activo';
        limitDetails.style.display = 'block';
        limitValueDisplay.textContent = userLimits.value;
        
        const periodText = {
            'daily': 'diarios',
            'weekly': 'semanales',
            'monthly': 'mensuales'
        };
        limitPeriodDisplay.textContent = periodText[userLimits.period] || 'semanales';
    } else {
        statusText.textContent = 'Sin límite establecido';
        limitDetails.style.display = 'none';
    }
}

// Inicializar sección de juego responsable
function initResponsibleGaming() {
    const btnSetLimits = document.getElementById('btn-set-limits');
    const limitsModal = document.getElementById('limits-modal');
    const closeLimitsModal = document.getElementById('close-limits-modal');
    const cancelLimits = document.getElementById('cancel-limits');
    const saveLimits = document.getElementById('save-limits');
    const limitPeriod = document.getElementById('limit-period');
    const periodHint = document.getElementById('period-hint');
    
    if (!btnSetLimits) return;
    
    // Abrir modal
    btnSetLimits.addEventListener('click', () => {
        limitsModal.style.display = 'flex';
        if (userLimits.enabled) {
            document.getElementById('limit-period').value = userLimits.period;
            document.getElementById('limit-value').value = userLimits.value;
        }
    });
    
    // Cerrar modal
    const closeModal = () => {
        limitsModal.style.display = 'none';
    };
    
    closeLimitsModal.addEventListener('click', closeModal);
    cancelLimits.addEventListener('click', closeModal);
    
    limitsModal.addEventListener('click', (e) => {
        if (e.target === limitsModal) closeModal();
    });
    
    // Actualizar hint del período
    limitPeriod.addEventListener('change', (e) => {
        const periodTexts = {
            'daily': 'día',
            'weekly': 'semana',
            'monthly': 'mes'
        };
        periodHint.textContent = periodTexts[e.target.value] || 'semana';
    });
    
    // Guardar límites
    saveLimits.addEventListener('click', () => {
        const period = document.getElementById('limit-period').value;
        const value = parseInt(document.getElementById('limit-value').value);
        
        if (!value || value <= 0) {
            alert('Por favor ingresa un valor válido mayor a 0');
            return;
        }
        
        userLimits = {
            period: period,
            value: value,
            enabled: true
        };
        
        localStorage.setItem('gamingLimits', JSON.stringify(userLimits));
        updateLimitDisplay();
        renderPointsChart();
        closeModal();
        
        alert('✅ Límite guardado correctamente. Te notificaremos cuando te acerques al límite.');
    });
    
    // Renderizar gráfico inicial
    renderPointsChart();
}

// Renderizar gráfico de puntos
function renderPointsChart() {
    const canvas = document.getElementById('points-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);
    
    // Datos de ejemplo (últimos 7 días)
    const pointsData = [50, 120, 80, 200, 150, 90, 180]; // Simulated data
    const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
    
    // Configuración
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = chartWidth / pointsData.length;
    
    // Calcular máximo
    const maxValue = userLimits.enabled ? Math.max(...pointsData, userLimits.value) : Math.max(...pointsData);
    const scale = chartHeight / maxValue;
    
    // Dibujar línea de límite si está activo
    if (userLimits.enabled && userLimits.value > 0) {
        const limitY = padding + chartHeight - (userLimits.value * scale);
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, limitY);
        ctx.lineTo(width - padding, limitY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Texto del límite
        ctx.fillStyle = '#dc2626';
        ctx.font = '12px Arial';
        ctx.fillText(`Límite: ${userLimits.value}`, width - padding - 80, limitY - 5);
    }
    
    // Dibujar barras
    pointsData.forEach((value, index) => {
        const x = padding + (index * barWidth) + barWidth * 0.2;
        const barHeight = value * scale;
        const y = padding + chartHeight - barHeight;
        const actualBarWidth = barWidth * 0.6;
        
        // Color de la barra (verde o rojo si excede límite)
        const isOverLimit = userLimits.enabled && value > userLimits.value;
        ctx.fillStyle = isOverLimit ? '#dc2626' : '#16a34a';
        
        // Dibujar barra con bordes redondeados
        ctx.beginPath();
        ctx.roundRect(x, y, actualBarWidth, barHeight, [4, 4, 0, 0]);
        ctx.fill();
        
        // Etiqueta del día
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(days[index], x + actualBarWidth / 2, height - padding + 20);
        
        // Valor
        ctx.fillStyle = '#333';
        ctx.font = 'bold 11px Arial';
        ctx.fillText(value, x + actualBarWidth / 2, y - 5);
    });
    
    // Eje Y
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.stroke();
    
    // Eje X
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
}

// Verificar si el usuario está cerca del límite
function checkLimitStatus() {
    if (!userLimits.enabled) return;
    
    const pointsAccumulated = parseInt(document.getElementById('points-accumulated')?.textContent || '0');
    const percentage = (pointsAccumulated / userLimits.value) * 100;
    
    if (percentage >= 100) {
        // Bloqueo automático al alcanzar el límite
        applyAutoBlock();
        alert('⚠️ Has alcanzado tu límite de puntos. Por favor, toma un descanso y vuelve en el próximo período.');
    } else if (percentage >= 90) {
        alert('⚠️ Estás cerca de tu límite de puntos (90%). Te recomendamos tomar un descanso.');
    }
}

// Aplicar bloqueo automático cuando se alcanza el límite
function applyAutoBlock() {
    const blockData = {
        type: 'auto',
        reason: 'Límite de puntos alcanzado',
        timestamp: Date.now(),
        period: userLimits.period
    };
    localStorage.setItem('userBlocked', JSON.stringify(blockData));
    
    // Notificar al sistema que el usuario está bloqueado
    console.log('🚫 Usuario bloqueado automáticamente por alcanzar límite');
}

// Verificar si el usuario está bloqueado
function isUserBlocked() {
    const blockData = localStorage.getItem('userBlocked');
    if (!blockData) return false;
    
    const block = JSON.parse(blockData);
    
    // Si es bloqueo permanente
    if (block.type === 'permanent') return true;
    
    // Si es bloqueo temporal, verificar si ya expiró
    if (block.type === 'temporary') {
        const expirationTime = block.timestamp + (block.days * 24 * 60 * 60 * 1000);
        if (Date.now() < expirationTime) return true;
        
        // Si ya expiró, remover el bloqueo
        localStorage.removeItem('userBlocked');
        return false;
    }
    
    // Si es bloqueo automático, verificar el período
    if (block.type === 'auto') {
        const periodMs = {
            'daily': 24 * 60 * 60 * 1000,
            'weekly': 7 * 24 * 60 * 60 * 1000,
            'monthly': 30 * 24 * 60 * 60 * 1000
        };
        const expirationTime = block.timestamp + (periodMs[block.period] || periodMs.weekly);
        if (Date.now() < expirationTime) return true;
        
        localStorage.removeItem('userBlocked');
        return false;
    }
    
    return false;
}

// ===== ADMIN: GESTIÓN DE USUARIOS EN LÍMITE =====
let currentUserForModal = null;

// Cargar usuarios cerca del límite
function loadUsersAtLimit() {
    // Datos simulados - en producción vendría del backend
    const usersAtLimit = [
        {
            id: 1,
            name: 'Juan Pérez',
            email: 'juan@example.com',
            limit: 1000,
            currentPoints: 950,
            period: 'weekly',
            favoriteCasino: 'Casino Royal',
            casinoVisits: 45,
            status: 'active',
            registrationDate: '2024-01-15'
        },
        {
            id: 2,
            name: 'María González',
            email: 'maria@example.com',
            limit: 500,
            currentPoints: 500,
            period: 'daily',
            favoriteCasino: 'Spin Palace',
            casinoVisits: 32,
            status: 'at-limit',
            registrationDate: '2024-02-20'
        },
        {
            id: 3,
            name: 'Carlos Ruiz',
            email: 'carlos@example.com',
            limit: 2000,
            currentPoints: 1850,
            period: 'monthly',
            favoriteCasino: 'Lucky Strike',
            casinoVisits: 67,
            status: 'warning',
            registrationDate: '2024-03-10'
        }
    ];
    
    const tbody = document.getElementById('users-at-limit-body');
    const noDataMsg = document.getElementById('no-users-at-limit-message');
    
    if (!tbody) return;
    
    if (usersAtLimit.length === 0) {
        tbody.innerHTML = '';
        if (noDataMsg) noDataMsg.style.display = 'flex';
        return;
    }
    
    if (noDataMsg) noDataMsg.style.display = 'none';
    
    tbody.innerHTML = usersAtLimit.map(user => {
        const percentage = ((user.currentPoints / user.limit) * 100).toFixed(1);
        const statusClass = percentage >= 100 ? 'danger' : percentage >= 90 ? 'warning' : 'warning';
        const statusText = percentage >= 100 ? 'En Límite' : percentage >= 90 ? 'Cerca' : 'Advertencia';
        
        return `
            <tr onclick="showUserDetails(${user.id})" data-user='${JSON.stringify(user)}'>
                <td><strong>${user.name}</strong></td>
                <td>${user.email}</td>
                <td>${user.limit} pts</td>
                <td>${user.currentPoints} pts</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 80px; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${percentage}%; height: 100%; background: ${percentage >= 100 ? '#dc2626' : percentage >= 90 ? '#f59e0b' : '#16a34a'}; transition: width 0.3s;"></div>
                        </div>
                        <strong style="color: ${percentage >= 100 ? '#dc2626' : percentage >= 90 ? '#f59e0b' : '#16a34a'};">${percentage}%</strong>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span>🎰</span>
                        <span>${user.favoriteCasino}</span>
                    </div>
                </td>
                <td>
                    <button class="btn-icon" onclick="event.stopPropagation(); showUserDetails(${user.id})" title="Ver detalles">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Mostrar detalles del usuario
function showUserDetails(userId) {
    // Buscar usuario en la tabla
    const row = document.querySelector(`tr[data-user]`);
    if (!row) return;
    
    const users = Array.from(document.querySelectorAll('tr[data-user]')).map(tr => JSON.parse(tr.dataset.user));
    const user = users.find(u => u.id === userId);
    
    if (!user) return;
    
    currentUserForModal = user;
    
    // Llenar modal con datos del usuario
    document.getElementById('detail-user-name').textContent = user.name;
    document.getElementById('detail-user-email').textContent = user.email;
    document.getElementById('detail-user-status').textContent = user.status === 'active' ? 'Activo' : user.status === 'at-limit' ? 'En Límite' : 'Advertencia';
    document.getElementById('detail-user-registration').textContent = user.registrationDate;
    
    // Estadísticas
    document.getElementById('detail-points-current').textContent = user.currentPoints;
    document.getElementById('detail-points-limit').textContent = user.limit + ' pts';
    
    const percentage = ((user.currentPoints / user.limit) * 100).toFixed(1);
    document.getElementById('detail-points-percentage').textContent = percentage + '%';
    
    const periodText = {
        'daily': 'Diario',
        'weekly': 'Semanal',
        'monthly': 'Mensual'
    };
    document.getElementById('detail-points-period').textContent = periodText[user.period] || '-';
    
    // Barra de progreso
    document.getElementById('detail-progress-text').textContent = `${user.currentPoints} / ${user.limit} puntos`;
    const progressFill = document.getElementById('detail-progress-fill');
    progressFill.style.width = percentage + '%';
    progressFill.setAttribute('data-warning', percentage >= 90 && percentage < 100);
    progressFill.setAttribute('data-danger', percentage >= 100);
    
    // Casino favorito
    document.getElementById('detail-favorite-casino').textContent = user.favoriteCasino;
    document.getElementById('detail-casino-visits').textContent = user.casinoVisits + ' visitas';
    
    // Verificar si el usuario tiene restricción activa
    const userRestriction = localStorage.getItem(`userRestriction_${userId}`);
    const restrictionDiv = document.getElementById('current-restriction');
    
    if (userRestriction) {
        const restriction = JSON.parse(userRestriction);
        restrictionDiv.style.display = 'flex';
        
        let restrictionText = '';
        if (restriction.type === 'permanent') {
            restrictionText = `Usuario baneado permanentemente. Motivo: ${restriction.reason}`;
        } else if (restriction.type === 'temporary') {
            const endDate = new Date(restriction.timestamp + (restriction.days * 24 * 60 * 60 * 1000));
            restrictionText = `Bloqueado temporalmente hasta ${endDate.toLocaleDateString()}`;
        }
        
        document.getElementById('restriction-info').textContent = restrictionText;
    } else {
        restrictionDiv.style.display = 'none';
    }
    
    // Mostrar modal
    document.getElementById('user-details-modal').style.display = 'flex';
}

// Cerrar modal de detalles
function closeUserDetailsModal() {
    document.getElementById('user-details-modal').style.display = 'none';
    currentUserForModal = null;
}

// Aplicar baneo temporal
function applyTempBan() {
    if (!currentUserForModal) return;
    
    const days = parseInt(document.getElementById('temp-ban-duration').value);
    
    if (!confirm(`¿Estás seguro de bloquear temporalmente a ${currentUserForModal.name} por ${days} días?`)) {
        return;
    }
    
    const banData = {
        type: 'temporary',
        days: days,
        timestamp: Date.now(),
        reason: 'Bloqueo temporal por administrador',
        userId: currentUserForModal.id
    };
    
    localStorage.setItem(`userRestriction_${currentUserForModal.id}`, JSON.stringify(banData));
    
    alert(`✅ Usuario bloqueado temporalmente por ${days} días`);
    showUserDetails(currentUserForModal.id); // Recargar modal
}

// Aplicar baneo permanente
function applyPermanentBan() {
    if (!currentUserForModal) return;
    
    const reason = document.getElementById('ban-reason').value.trim();
    
    if (!reason) {
        alert('❌ Debes especificar un motivo para el baneo permanente');
        return;
    }
    
    if (!confirm(`¿Estás COMPLETAMENTE SEGURO de banear permanentemente a ${currentUserForModal.name}?\n\nEsta acción es irreversible.`)) {
        return;
    }
    
    const banData = {
        type: 'permanent',
        reason: reason,
        timestamp: Date.now(),
        userId: currentUserForModal.id
    };
    
    localStorage.setItem(`userRestriction_${currentUserForModal.id}`, JSON.stringify(banData));
    
    alert(`✅ Usuario baneado permanentemente`);
    document.getElementById('ban-reason').value = '';
    showUserDetails(currentUserForModal.id); // Recargar modal
}

// Remover restricción
function removeRestriction() {
    if (!currentUserForModal) return;
    
    if (!confirm(`¿Estás seguro de remover la restricción de ${currentUserForModal.name}?`)) {
        return;
    }
    
    localStorage.removeItem(`userRestriction_${currentUserForModal.id}`);
    
    alert(`✅ Restricción removida correctamente`);
    showUserDetails(currentUserForModal.id); // Recargar modal
}

// Modificar función showAdminTab para incluir la nueva pestaña
const originalShowAdminTab = window.showAdminTab;
window.showAdminTab = function(tab) {
    if (tab === 'users-at-limit') {
        // Ocultar todas las pestañas
        document.querySelectorAll('.admin-tab-content').forEach(t => t.style.display = 'none');
        
        // Mostrar pestaña de usuarios en límite
        const limitTab = document.getElementById('tab-users-at-limit');
        if (limitTab) {
            limitTab.style.display = 'block';
            loadUsersAtLimit();
        }
        
        // Actualizar botones activos
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        event?.target?.classList?.add('active');
    } else if (originalShowAdminTab) {
        originalShowAdminTab(tab);
    }
};

// Funciones de autenticación básicas
function isAuthenticated() { return !!localStorage.getItem('authToken'); }
function getAuthToken() { return localStorage.getItem('authToken'); }
function setAuthToken(token) { localStorage.setItem('authToken', token); }
function clearAuthToken() { localStorage.removeItem('authToken'); }

// Inicialización de la aplicación
document.addEventListener("DOMContentLoaded", initApp);
