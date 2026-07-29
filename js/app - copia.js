/**
 * js/app.js
 * * Lógica principal de la Single Page Application (SPA).
 * * Gestiona la navegación, autenticación y la interacción con los endpoints de la API.
 * * Depende de js/funciones.js para el manejo del token.
 */

// ✅ FUNCIÓN DE DEBUG TEMPORAL
function debugRouting() {
  console.log("🔍 DEBUG ROUTING:");
  console.log("- Hash actual:", window.location.hash);
  console.log("- Ruta actual:", window.location.hash.substring(1));
  console.log("- Autenticado:", isAuthenticated());
  console.log("- currentUserName:", currentUserName);
  console.log("- currentUserIsAdmin:", currentUserIsAdmin);
}

// Llamar esta función cuando necesites debuggear
// debugRouting();

// Estado global de la aplicación
const AppState = {
  currentView: 'landing',
  isAuthenticated: false,
  user: null
}

// URL base de la API
const API_BASE_URL = "services/";

// Contenedor principal de la aplicación
const appContent = document.getElementById("app-content");

// Estado global para el nombre del usuario (se carga al iniciar sesión o validar token)

// Estado global para el nombre del usuario
let currentUserName = null;

// ✅ NUEVO: Estado global para saber si el usuario es administrador
let currentUserIsAdmin = false;

// ✅ AGREGAR ESTA VARIABLE FALTANTE
let currentView = 'landing';

// ==========================================================
// 1. UTILIDADES DE VISTA (LOADER)
// ==========================================================

/**
 * Carga el contenido de una vista HTML en el contenedor principal.
 * @param {string} viewName - El nombre de la vista (ej: 'landing_view').
 * @param {function} callback - Función a ejecutar después de cargar la vista.
 */
async function loadView(viewName, callback = () => { }) {
  try {
    const response = await fetch(`assets/views/${viewName}.html`);
    if (!response.ok) {
      throw new Error(`Error al cargar la vista: ${viewName}`);
    }
    const html = await response.text();
    appContent.innerHTML = html;
    callback();
  } catch (error) {
    console.error("Fallo al cargar la vista:", error);
    appContent.innerHTML = `<div class="auth-container"><div class="card"><h2 class="card-title">Error</h2><p class="alert alert-error">No se pudo cargar la vista ${viewName}.</p><a href="#" id="go-to-landing" class="link-secondary card-footer">Volver a inicio</a></div></div>`;
    document
      .getElementById("go-to-landing")
      ?.addEventListener("click", () => navigate("landing"));
  }
}


/**
 * Muestra un mensaje de alerta en un contenedor específico.
 * @param {string} containerId - ID del contenedor (ej: 'auth-message-area').
 * @param {string} message - El mensaje a mostrar.
 * @param {string} type - Tipo de mensaje ('success' o 'error').
 */
function displayMessage(containerId, message, type) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    // Opcional: limpiar el mensaje después de 5 segundos
    setTimeout(() => (container.innerHTML = ""), 5000);
  }
}

// ==========================================================
// 2. LÓGICA DE NAVEGACIÓN Y ENRUTAMIENTO (SPA)
// ==========================================================


/**
 * Inicializa la aplicación verificando la autenticación y el hash actual.
 */

async function initApp() {
  console.log("\n==================================");
  console.log("🚀 Iniciando aplicación Atrapabono...");
  console.log("==================================");

  // ✅ MEJORAR: Manejar hash changes y hash actual
  window.addEventListener('hashchange', function() {
    const route = window.location.hash.substring(1) || 'landing';
    console.log("🔀 Hash cambiado a:", route); // ← BREAKPOINT AQUÍ
    navigate(route);
});

  // ✅ CORREGIR: Verificar el hash actual al cargar la página
  const currentHash = window.location.hash.substring(1);
  console.log("📍 Hash actual al iniciar:", currentHash);
  console.log("📍 Hash completo al iniciar:", window.location.hash);

  // Verificar si hay un token almacenado
  if (isAuthenticated()) {
    console.log("🔑 Token encontrado en localStorage");
    console.log("🔍 Validando token con el servidor...");

    // Validar el token con el servidor
    const isTokenValid = await handleTokenValidation();

    if (isTokenValid) {
      console.log("✅ Sesión válida.");

      // ✅ SI HAY HASH, RESPETARLO, SINO IR AL DASHBOARD
      if (currentHash && currentHash !== 'landing') {
        console.log(`🎯 Navegando a hash existente: ${currentHash}`);
        navigate(currentHash);
      } else {
        console.log("🔀 Redirigiendo al dashboard...");
        navigate("dashboard");
      }
      return;
    } else {
      console.log("❌ Token inválido.");
      // Continuar con lógica de no autenticado
    }
  } else {
    console.log("🆕 No hay sesión activa.");
  }

  // ✅ PARA USUARIOS NO AUTENTICADOS: RESPETAR EL HASH O IR A LANDING
  if (currentHash && currentHash !== 'landing') {
    console.log(`🎯 Navegando a hash existente: ${currentHash}`);
    navigate(currentHash);
  } else {
    console.log("🏠 Mostrando landing page...");
    navigate("landing");
  }
}

// ==========================================================
// 3. HANDLERS DE AUTENTICACIÓN
// ==========================================================

/**
 * Intenta validar el token almacenado con el servidor.
 * @returns {boolean} True si el token es válido y actualiza el nombre de usuario.
 */

// En handleTokenValidation, guardar el estado de admin
async function handleTokenValidation() {
  const token = getAuthToken();
  console.log("🔑 Validando token almacenado...");

  if (!token) {
    console.log("❌ No hay token almacenado");
    return false;
  }

  try {
    const response = await fetch(API_BASE_URL + "validate_token.php", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error(`❌ Error HTTP al validar token: ${response.status}`);
      clearAuthToken();
      return false;
    }

    const result = await response.json();
    console.log("📦 Respuesta de validación:", result);

    if (result.success && result.data) {
      // Éxito: Token válido
      currentUserName = result.data.name;
      currentUserIsAdmin = result.data.is_admin; // ✅ GUARDAR ESTADO ADMIN

      console.log(`✅ Token válido. Usuario: ${currentUserName}`);
      console.log(`👑 Es admin: ${currentUserIsAdmin}`);
      return true;
    } else {
      // Falla: Token inválido/expirado
      console.log("❌ Token inválido o expirado");
      clearAuthToken();
      return false;
    }
  } catch (error) {
    console.error("❌ Error de conexión al validar token:", error);
    clearAuthToken();
    return false;
  }
}

/**
 * Maneja el cierre de sesión.
 */
async function handleLogout() {
  console.log("🚪 Cerrando sesión...");

  const token = getAuthToken();
  console.log(
    "🔑 Token a enviar:",
    token ? "SÍ (" + token.substring(0, 10) + "...)" : "NO"
  );

  if (token) {
    try {
      console.log("📤 Enviando logout request...");
      const response = await fetch(API_BASE_URL + "logout.php", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      console.log("📥 Respuesta recibida:", response.status);
      const result = await response.json();
      console.log("📦 Resultado:", result);
    } catch (error) {
      console.error("❌ Error en logout:", error);
      // Limpiar datos locales
      currentUserName = null;
      currentUserIsAdmin = false; // ✅ LIMPIAR ESTADO DE ADMIN TAMBIÉN
      clearAuthToken();

      console.log("✅ Sesión cerrada correctamente. Redirigiendo a landing...");
      navigate("landing");
    }
  }
  // ... resto del código

  // Limpiar datos locales
  currentUserName = null;
  clearAuthToken();

  console.log("✅ Sesión cerrada correctamente. Redirigiendo a landing...");

  // Redireccionar a la landing page
  navigate("landing");
}

// ----------------------------------------------------------
// LOGIN
// ----------------------------------------------------------

function attachLoginListeners() {
  const form = document.getElementById("login-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      try {
        const response = await fetch(API_BASE_URL + "login.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.success) {
          // Guardar el token en localStorage
          setAuthToken(result.token);
          currentUserName = result.name;

          // ✅ ACTUALIZAR: Validar token para obtener estado de admin
          const isTokenValid = await handleTokenValidation();

          if (isTokenValid) {
            console.log("✅ Login exitoso. Sesión guardada.");
            console.log(`👤 Bienvenido, ${currentUserName}!`);
            console.log(`👑 Es admin: ${currentUserIsAdmin}`);

            // Redireccionar al dashboard
            navigate("dashboard");
          }
        } else {
          displayMessage("auth-message-area", result.message, "error");
        }
      } catch (error) {
        console.error("Error en login:", error);
        displayMessage(
          "auth-message-area",
          `Error de conexión: ${error.message}. Verifica que XAMPP esté corriendo.`,
          "error"
        );
      }
    });
  }

  document.getElementById("go-to-landing")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("landing");
  });
}

// ----------------------------------------------------------
// REGISTER
// ----------------------------------------------------------

// ==========================================================
// 4. LÓGICA DEL DASHBOARD (NUEVA FUNCIÓN)
// ==========================================================

function attachDashboardListeners() {
  // Inicializar efectos del header para dashboard
  setTimeout(initHeaderEffects, 100);

  // 1. Asignar listeners de navegación
  document.getElementById("link-profile")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("profile");
  });
  document
    .getElementById("link-logout-dashboard")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      navigate("logout");
    });
  // Link de campañas (funcionalidad futura)
  document.getElementById("link-campaigns")?.addEventListener("click", (e) => {
    e.preventDefault();
    displayMessage(
      "transactions-body",
      "Funcionalidad de Campañas en desarrollo...",
      "info"
    );
  });

  // 2. Cargar datos del dashboard
  loadDashboardData();
}

/**
 * Llama al endpoint api/dashboard.php y actualiza el DOM con las estadísticas y transacciones.
 */
async function loadDashboardData() {
  const token = getAuthToken();
  if (!token) return navigate("login");

  // Mostrar el nombre de usuario
  document.getElementById("user-display-name").textContent =
    currentUserName || "Usuario";

  // ✅ MOSTRAR SECCIÓN ADMIN SI CORRESPONDE
  if (currentUserIsAdmin) {
    console.log("👑 Usuario es admin, mostrando sección administrativa");
    document.getElementById("admin-section").style.display = "block";
    await loadAdminSection();
  } else {
    console.log("👤 Usuario no es admin, ocultando sección administrativa");
    document.getElementById("admin-section").style.display = "none";
  }

  // Resto del código para cargar datos normales del dashboard...
  const transactionsBody = document.getElementById("transactions-body");
  transactionsBody.innerHTML =
    '<tr><td colspan="4" style="text-align: center;">Cargando datos del dashboard...</td></tr>';

  try {
    const response = await fetch("api/dashboard.php", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (result.success) {
      const data = result.data;
      // ... (código existente para llenar estadísticas y transacciones)
    }
  } catch (error) {
    console.error("Error al cargar datos del dashboard:", error);
  }
}

// ==========================================================
// 5. LÓGICA DEL PERFIL
// ==========================================================

function attachProfileListeners() {
  // 1. Asignar listeners de navegación
  document.getElementById("link-dashboard")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("dashboard");
  });
  document
    .getElementById("link-logout-profile")
    ?.addEventListener("click", (e) => {
      e.preventDefault();
      navigate("logout");
    });

  // 2. Cargar datos del perfil
  loadProfileData();

  // 3. Asignar listener del formulario de guardado
  const form = document.getElementById("profile-form");
  if (form) {
    form.addEventListener("submit", handleProfileSubmit);
  }
}

/**
 * Llama al endpoint services/profile.php (GET) y rellena el formulario.
 */
async function loadProfileData() {
  const token = getAuthToken();
  if (!token) return navigate("login");

  console.log("📄 Cargando datos del perfil...");

  // Mostrar nombre y email
  document.getElementById("profile-name").value =
    currentUserName || "Cargando...";

  try {
    const response = await fetch(API_BASE_URL + "profile.php", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("Respuesta del servidor (perfil):", response);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Datos del perfil recibidos:", result);

    if (result.success && result.data) {
      const data = result.data;

      // Actualizar datos básicos (email ya viene de la sesión)
      const profileName = document.getElementById("profile-name");
      const profileEmail = document.getElementById("profile-email");
      const profileCompany = document.getElementById("profile-company");
      const profilePhone = document.getElementById("profile-phone");
      const profileCountry = document.getElementById("profile-country");

      if (profileName) profileName.value = data.name;
      if (profileEmail) profileEmail.value = data.email;

      // Rellenar datos de perfil (tabla 'profiles')
      if (profileCompany) profileCompany.value = data.profile.company_name || "";
      if (profilePhone) profilePhone.value = data.profile.phone_number || "";
      if (profileCountry) profileCountry.value = data.profile.country || "";

      // Aseguramos que el nombre global esté actualizado
      currentUserName = data.name;

      console.log("✅ Datos del perfil cargados correctamente");
    } else {
      console.error("❌ Error en la respuesta:", result.message);
      displayMessage("profile-message-area", result.message, "error");
    }
  } catch (error) {
    console.error("❌ Error al cargar datos del perfil:", error);
    displayMessage(
      "profile-message-area",
      `Error de conexión: ${error.message}. Verifica que XAMPP esté corriendo.`,
      "error"
    );
  }
}

/**
 * Maneja el envío del formulario de perfil (services/profile.php POST).
 */
async function handleProfileSubmit(e) {
  e.preventDefault();
  const token = getAuthToken();
  if (!token) return navigate("login");

  const form = document.getElementById("profile-form");
  const formData = new FormData(form);
  const data = {
    company_name: formData.get("company_name"),
    phone_number: formData.get("phone_number"),
    country: formData.get("country"),
  };

  try {
    const response = await fetch(API_BASE_URL + "profile.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.success) {
      displayMessage(
        "profile-message-area",
        "¡Perfil actualizado con éxito!",
        "success"
      );
      // Opcional: Recargar los datos para confirmar
      loadProfileData();
    } else {
      displayMessage("profile-message-area", result.message, "error");
    }
  } catch (error) {
    console.error("Error al guardar el perfil:", error);
    displayMessage(
      "profile-message-area",
      "Error de conexión al intentar guardar el perfil.",
      "error"
    );
  }
}

// ----------------------------------------------------------
// LANDING PAGE LISTENERS
// ----------------------------------------------------------

// ===== HEADER SCROLL Y MENÚ MÓVIL - VERSIÓN FINAL =====
function initHeaderEffects() {
  console.log("🎯 Inicializando efectos del header...");

  const header = document.getElementById("mainHeader");
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const mainNav = document.querySelector(".main-nav");

  console.log("🔍 Header encontrado:", header);
  console.log("🔍 Mobile toggle:", mobileMenuToggle);
  console.log("🔍 Main nav:", mainNav);

  // Efecto de scroll - solo si existe el header
  if (header) {
    console.log("✅ Configurando efecto scroll para header");

    function handleScroll() {
      console.log("📏 Scroll position:", window.scrollY);
      if (window.scrollY > 50) {
        header.classList.add("scrolled");
        console.log("🎨 Header cambió a BLANCO");
      } else {
        header.classList.remove("scrolled");
        console.log("🎨 Header cambió a VIOLETA");
      }
    }

    // Configurar el evento de scroll
    window.removeEventListener("scroll", handleScroll); // Limpiar primero
    window.addEventListener("scroll", handleScroll);

    // Ejecutar una vez al inicializar
    setTimeout(handleScroll, 100);
  } else {
    console.log("❌ Header no encontrado con ID mainHeader");
  }

  // Menú móvil - VERSIÓN CON MÁS DEBUG
  if (mobileMenuToggle && mainNav) {
    console.log("✅ Configurando menú móvil");
    console.log("📍 Mobile toggle element:", mobileMenuToggle);
    console.log("📍 Main nav element:", mainNav);

    mobileMenuToggle.addEventListener("click", function () {
      console.log("🔄 Click en menú móvil");
      console.log(
        "📱 Estado anterior del menú:",
        mainNav.classList.contains("active")
      );

      mainNav.classList.toggle("active");
      this.classList.toggle("active");

      console.log(
        "📱 Estado nuevo del menú:",
        mainNav.classList.contains("active")
      );
      console.log("📱 Clases del menú:", mainNav.className);
    });

    // Cerrar menú al hacer clic en enlaces
    const navLinks = document.querySelectorAll(".main-nav a");
    navLinks.forEach((link) => {
      link.addEventListener("click", function () {
        console.log("🔒 Cerrando menú móvil por click en enlace");
        mainNav.classList.remove("active");
        mobileMenuToggle.classList.remove("active");
      });
    });
  }
}

// ==========================================================
// 6. PROTECCIÓN CONTRA NAVEGACIÓN CON BOTONES DEL NAVEGADOR
// ==========================================================

/**
 * Prevenir que el usuario use el botón "Atrás" del navegador
 * para salir del dashboard sin cerrar sesión
 */
window.addEventListener("popstate", function (event) {
  console.log("Evento popstate detectado");
  if (isAuthenticated()) {
    console.log("🔒 Usuario autenticado. Previniendo navegación hacia atrás.");
    event.preventDefault();
    // Forzar a quedarse en el dashboard
    navigate("dashboard");
  }
});

/**
 * Agregar estado al historial para controlar la navegación
 */
function updateHistory(route) {
  // Actualizar el hash de la URL sin recargar la página
  window.history.pushState({ route: route }, "", `#${route}`);
}

// ==========================================================
// 7. INICIALIZACIÓN
// ==========================================================
document.addEventListener("DOMContentLoaded", initApp);

// ===== HEADER SCROLL Y MENÚ MÓVIL =====
document.addEventListener("DOMContentLoaded", function () {
  initHeaderEffects();
});

function initHeaderEffects() {
  const header = document.getElementById("mainHeader");
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const mainNav = document.querySelector(".main-nav");

  console.log("🎯 Inicializando efectos del header...");

  // Efecto de scroll - VERSIÓN MEJORADA
  if (header) {
    console.log("Header encontrado:", header);

    function updateHeaderOnScroll() {
      const scrolled = window.scrollY > 50;
      const hasScrolledClass = header.classList.contains("scrolled");

      if (scrolled && !hasScrolledClass) {
        header.classList.add("scrolled");
        console.log("🎨 Header cambió a BLANCO");
      } else if (!scrolled && hasScrolledClass) {
        header.classList.remove("scrolled");
        console.log("🎨 Header cambió a VIOLETA");
      }
    }

    // Ejecutar al cargar por si ya hay scroll
    updateHeaderOnScroll();

    // Ejecutar al hacer scroll
    window.addEventListener("scroll", updateHeaderOnScroll);
  } else {
    console.log("ERROR: No se encontró el header con ID mainHeader");
  }

  // Menú móvil
  if (mobileMenuToggle && mainNav) {
    mobileMenuToggle.addEventListener("click", function () {
      mainNav.classList.toggle("active");
      this.classList.toggle("active");
    });

    // Cerrar menú al hacer clic en enlaces
    const navLinks = document.querySelectorAll(".main-nav a");
    navLinks.forEach((link) => {
      link.addEventListener("click", function () {
        mainNav.classList.remove("active");
        mobileMenuToggle.classList.remove("active");
      });
    });
  }
}

// ===== MODAL DE TÉRMINOS Y CONDICIONES - VERSIÓN SIN CHECKBOX =====

function initRegistrationModal() {
  console.log("🎯 Inicializando modal de términos...");

  // Buscar elementos (sin termsCheckbox)
  const termsLink = document.getElementById("termsLink");
  const privacyLink = document.getElementById("privacyLink");
  const privacyModal = document.getElementById("privacyModal");
  const modalClose = document.getElementById("modalClose");
  const modalAccept = document.getElementById("modalAccept");

  console.log("🔍 Elementos del modal encontrados:", {
    termsLink: termsLink ? "✅" : "❌",
    privacyLink: privacyLink ? "✅" : "❌",
    privacyModal: privacyModal ? "✅" : "❌",
    modalClose: modalClose ? "✅" : "❌",
    modalAccept: modalAccept ? "✅" : "❌",
  });

  // Verificar elementos críticos
  if (!termsLink || !privacyLink || !privacyModal) {
    console.log("ℹ️  Modal de términos no disponible en esta vista (elementos faltantes)");
    return;
  }

  console.log("✅ Todos los elementos encontrados, configurando eventos...");

  // Función para abrir modal
  function openModal() {
    console.log("📝 Abriendo modal de términos");
    privacyModal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  // Función para cerrar modal
  function closeModal() {
    console.log("🔒 Cerrando modal");
    privacyModal.classList.remove("active");
    document.body.style.overflow = "";
  }

  // Configurar eventos para términos y privacidad
  termsLink.addEventListener("click", function (e) {
    e.preventDefault();
    openModal();
  });

  privacyLink.addEventListener("click", function (e) {
    e.preventDefault();
    openModal();
  });

  // Configurar cierre del modal
  if (modalClose) {
    modalClose.addEventListener("click", closeModal);
  }

  // Configurar aceptación (solo cerrar modal, sin checkbox)
  if (modalAccept) {
    modalAccept.addEventListener("click", function () {
      console.log("✅ Términos visualizados");
      closeModal();
    });
  }

  // Cerrar al hacer clic fuera del modal
  privacyModal.addEventListener("click", function (e) {
    if (e.target === privacyModal) {
      closeModal();
    }
  });

  // Cerrar con tecla ESC
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && privacyModal.classList.contains("active")) {
      closeModal();
    }
  });

  console.log("🎉 Modal de términos inicializado correctamente");
}

// ===== FORMULARIO DE REGISTRO Y CONFIRMACIÓN =====

// ===== FUNCIÓN ÚNICA initRegistrationForm =====

function initRegistrationForm() {
  console.log("🎯 initRegistrationForm ejecutándose...");

  const registrationForm = document.getElementById("registrationForm");
  const confirmationMessage = document.getElementById("confirmationMessage");
  const confettiContainer = document.getElementById("confettiContainer");

  console.log("🔍 Elementos del formulario:");
  console.log("- registrationForm:", registrationForm ? "✅" : "❌");
  console.log("- confirmationMessage:", confirmationMessage ? "✅" : "❌");
  console.log("- confettiContainer:", confettiContainer ? "✅" : "❌");

  if (registrationForm && confirmationMessage) {
    console.log("✅ Agregando listener al formulario de registro");
    registrationForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      console.log("🚀 Formulario enviado - procesando...");

      // Validar que todos los campos estén completos
      const inputs = registrationForm.querySelectorAll(
        "input[required], select[required]"
      );
      let allValid = true;

      inputs.forEach((input) => {
        if (!input.value.trim()) {
          allValid = false;
          input.style.borderColor = "#ff4444";
        } else {
          input.style.borderColor = "#e0e0e0";
        }
      });

      if (allValid) {
        try {
          // Preparar datos para el backend (SOLICITUD, no registro)
          const data = {
            nombre: document.getElementById("nombre").value,
            email: document.getElementById("email").value,
            edad: document.getElementById("edad").value,
            genero: document.getElementById("genero").value,
            dni: document.getElementById("dni").value,
            pais: document.getElementById("pais").value,
            provincia: document.getElementById("provincia").value,
            telefono: document.getElementById("telefono").value,
          };

          console.log("📤 Datos que se van a enviar:");
          console.log("- nombre:", data.nombre);
          console.log("- email:", data.email);
          console.log("- edad:", data.edad);
          console.log("- genero:", data.genero);
          console.log("- dni:", data.dni);
          console.log("- pais:", data.pais);
          console.log("- provincia:", data.provincia);
          console.log("- telefono:", data.telefono);
          console.log("📦 Objeto completo:", data);

          // Enviar a NUEVO endpoint de solicitudes
          const response = await fetch("services/account_request.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });

          console.log("📥 Status de respuesta:", response.status);
          console.log("📥 Headers:", response.headers.get('content-type'));

          const responseText = await response.text();
          console.log("📥 Respuesta cruda del servidor:", responseText);

          let result;
          try {
            result = JSON.parse(responseText);
            console.log("✅ JSON parseado correctamente:", result);
          } catch (parseError) {
            console.error("❌ Error parseando JSON:", parseError);
            console.log("🔍 Respuesta que causó el error:", responseText.substring(0, 500));
            throw new Error("El servidor devolvió HTML en lugar de JSON. Revisa los errores PHP.");
          }

          if (result.success) {
            console.log("✅ Solicitud exitosa, mostrando confirmación...");
            // Ocultar formulario
            registrationForm.style.display = "none";

            // Mostrar mensaje de confirmación
            confirmationMessage.classList.add("active");

            // Crear efecto confetti
            createConfetti(confettiContainer);

            // Animación del ticket
            const ticketIcon =
              confirmationMessage.querySelector(".ticket-icon");
            ticketIcon.style.animation = "none";
            setTimeout(() => {
              ticketIcon.style.animation = "ticketBounce 0.8s ease-out";
            }, 10);

            // Actualizar mensaje de confirmación
            document.querySelector(".confirmation-text").textContent =
              result.message;
          } else {
            // Mostrar error
            displayMessage("confirmationMessage", result.message, "error");
          }
        } catch (error) {
          console.error("Error en solicitud:", error);
          displayMessage(
            "confirmationMessage",
            "Error de conexión. Intenta nuevamente.",
            "error"
          );
        }
      }
    });
  }
}

// Función para crear efecto confetti simple
function createConfetti(container) {
  const colors = ["#7F00FF", "#9D4EDD", "#FF6B6B", "#4ECDC4", "#FFE66D"];
  const confettiCount = 50;

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement("div");
    confetti.className = "confetti";
    confetti.style.cssText = `
      position: absolute;
      width: 8px;
      height: 8px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      border-radius: 1px;
      top: -10px;
      left: ${Math.random() * 100}%;
      animation: confettiFall ${1 + Math.random() * 2}s ease-in forwards;
      opacity: 0;
    `;

    container.appendChild(confetti);

    // Remover confetti después de la animación
    setTimeout(() => {
      confetti.remove();
    }, 3000);
  }
}

// Agregar animación CSS para confetti
const confettiStyle = document.createElement("style");
confettiStyle.textContent = `
  @keyframes confettiFall {
    0% {
      transform: translateY(0) rotate(0deg);
      opacity: 1;
    }
    100% {
      transform: translateY(100vh) rotate(360deg);
      opacity: 0;
    }
  }
`;
document.head.appendChild(confettiStyle);

// Inicializar formulario cuando se carga la landing page
// ===== FUNCIÓN ÚNICA attachLandingListeners =====

// Al inicio de attachLandingListeners

function attachLandingListeners() {
  console.log("🎯 attachLandingListeners ejecutándose");

  // Inicializar efectos del header para landing page
  setTimeout(initHeaderEffects, 100);

  // ✅ AGREGAR LISTENER PARA EL BOTÓN BENEFICIOS EN LANDING
  const benefitsBtn = document.querySelector('a[href="#benefits"]');
  if (benefitsBtn) {
    console.log("✅ Botón beneficios encontrado en landing, agregando listener...");
    benefitsBtn.addEventListener('click', function (e) {
      e.preventDefault();
      console.log("🎁 Click en beneficios - Navegando...");
      navigate("benefits");
    });
  }

  // ✅ AGREGAR LISTENER PARA EL BOTÓN LOGIN
  const loginBtn = document.getElementById("switch-to-login");
  if (loginBtn) {
    console.log("✅ Botón login encontrado, agregando listener...");
    loginBtn.addEventListener('click', function (e) {
      e.preventDefault();
      console.log("👤 Click en login - Navegando...");
      navigate("login");
    });
  }

  // Inicializar modal de términos y condiciones
  setTimeout(initRegistrationModal, 100);

  // ✅ NUEVO: Inicializar validación de edad
  setTimeout(initAgeValidation, 100);

  // Inicializar formulario de SOLICITUD (no registro)
  setTimeout(initRegistrationForm, 100);

  console.log("✅ Landing page inicializada correctamente");
}

// BOTONES "COMENZAR AHORA" - SCROLL SUAVE AL FORMULARIO (Se inicializa en attachLandingListeners)
function initCTAButtons() {
  const ctaButtons = document.querySelectorAll("#cta-hero, #cta-final");
  ctaButtons.forEach((button) => {
    if (button) {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        console.log(`Click en ${button.id} - Scroll suave a formulario`);
        smoothScrollToSection("solicitud-cuenta");
      });
    }
  });
}

// BOTÓN "VER DEMOSTRACIÓN" - MANTENER COMPORTAMIENTO ACTUAL (Se inicializa en attachLandingListeners)
function initDemoButtons() {
  const demoButtons = document.querySelectorAll(".cta-button.secondary");
  demoButtons.forEach((button) => {
    if (button && !button.id) {
      // Solo botones demo sin ID específico
      button.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("Click en Ver demostración");
        // Aquí puedes agregar lógica para modal de demo o redirección
        displayMessage(
          "confirmationMessage",
          "Funcionalidad de demostración en desarrollo...",
          "info"
        );
      });
    }
  });
}

// ===== FORMULARIO DE SOLICITUD DE ACTIVACIÓN =====

// ===== SCROLL SUAVE A SECCIÓN =====

function smoothScrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    // Calcular posición considerando el header fijo
    const headerHeight =
      document.getElementById("mainHeader")?.offsetHeight || 0;
    const sectionPosition = section.offsetTop - headerHeight - 20; // 20px de margen

    window.scrollTo({
      top: sectionPosition,
      behavior: "smooth",
    });

    console.log(`🎯 Scroll suave a: ${sectionId}`);
  } else {
    console.log(`❌ Sección ${sectionId} no encontrada`);
  }
}

// ===== LÓGICA ADMINISTRADOR =====

/**
 * Verifica si el usuario es admin y carga sección correspondiente
 */
async function loadAdminSection() {
  const token = getAuthToken();
  if (!token) return;

  try {
    const response = await fetch("services/admin_requests.php?tab=pending", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
    console.log("📦 Respuesta solicitudes admin:", result);

    if (result.success && Array.isArray(result.solicitudes)) {
      const tbody = document.getElementById("solicitudes-pendientes-body");
      const noMessage = document.getElementById("no-pending-message");

      tbody.innerHTML = "";

      if (result.solicitudes.length > 0) {
        result.solicitudes.forEach((solicitud) => {
          const row = document.createElement("tr");
          row.innerHTML = `
                        <td>${solicitud.nombre}</td>
                        <td>${solicitud.edad}</td>
                        <td>${solicitud.dni}</td>
                        <td>${solicitud.pais}</td>
                        <td>${solicitud.telefono}</td>
                        <td>${new Date(
            solicitud.created_at
          ).toLocaleDateString()}</td>
                        <td>
                            <button class="btn btn-success btn-small" onclick="aprobarSolicitud(${solicitud.id
            })">
                                ✅ Aprobar
                            </button>
                            <button class="btn btn-danger btn-small" onclick="rechazarSolicitud(${solicitud.id
            })">
                                ❌ Rechazar
                            </button>
                        </td>
                    `;
          tbody.appendChild(row);
        });
        noMessage.style.display = "none";
      } else {
        noMessage.style.display = "block";
      }
    } else {
      console.log("❌ Error cargando solicitudes:", result.message);
    }
  } catch (error) {
    console.error("❌ Error cargando sección admin:", error);
  }
}

/**
 * Aprobar una solicitud de cuenta
 */
async function aprobarSolicitud(solicitudId) {
  if (!confirm("¿Estás seguro de aprobar esta solicitud?")) return;

  try {
    const response = await fetch("services/admin_actions.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        action: "approve",
        solicitud_id: solicitudId,
      }),
    });

    const result = await response.json();

    if (result.success) {
      alert("Solicitud aprobada correctamente");
      loadAdminSection(); // Recargar la sección
    } else {
      alert("Error: " + result.message);
    }
  } catch (error) {
    console.error("Error aprobando solicitud:", error);
    alert("Error de conexión");
  }
}

/**
 * Rechazar una solicitud de cuenta
 */
async function rechazarSolicitud(solicitudId) {
  const motivo = prompt("Ingresa el motivo del rechazo:");
  if (!motivo) return;

  try {
    const response = await fetch("services/admin_actions.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        action: "reject",
        solicitud_id: solicitudId,
        motivo: motivo,
      }),
    });

    const result = await response.json();

    if (result.success) {
      alert("Solicitud rechazada correctamente");
      loadAdminSection(); // Recargar la sección
    } else {
      alert("Error: " + result.message);
    }
  } catch (error) {
    console.error("Error rechazando solicitud:", error);
    alert("Error de conexión");
  }
}

// ===== SISTEMA DE PESTAÑAS ADMIN =====

let currentAdminTab = "pending";

function showAdminTab(tabName) {
  // Ocultar todas las pestañas
  document.querySelectorAll(".admin-tab-content").forEach((tab) => {
    tab.style.display = "none";
  });

  // Remover clase active de todos los botones
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.remove("active");
  });

  // Mostrar pestaña seleccionada
  document.getElementById(`tab-${tabName}`).style.display = "block";
  document
    .querySelector(`.tab-button[onclick="showAdminTab('${tabName}')"]`)
    .classList.add("active");

  currentAdminTab = tabName;

  // Recargar datos si es necesario
  if (tabName !== "pending") {
    loadAdminTabData(tabName);
  }
}

/**
 * Cargar datos para pestañas específicas
 */
async function loadAdminTabData(tabName) {
  const token = getAuthToken();
  if (!token) return;

  try {
    const response = await fetch(`services/admin_requests.php?tab=${tabName}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (result.success) {
      // Mapear nombres de pestañas a IDs correctos del HTML
      const tabMapping = {
        'pending': 'pendientes',
        'approved': 'aprobadas',
        'rejected': 'rechazadas'
      };

      const htmlTabName = tabMapping[tabName] || tabName;
      const tbodyId = `solicitudes-${htmlTabName}-body`;
      const noMessageId = `no-${tabName}-message`;

      const tbody = document.getElementById(tbodyId);
      const noMessage = document.getElementById(noMessageId);

      if (!tbody) {
        console.error(`❌ No se encontró el elemento tbody con ID: ${tbodyId}`);
        return;
      }
      if (!noMessage) {
        console.error(`❌ No se encontró el elemento noMessage con ID: ${noMessageId}`);
        return;
      }

      tbody.innerHTML = "";

      if (result.solicitudes && result.solicitudes.length > 0) {
        result.solicitudes.forEach((solicitud) => {
          const row = document.createElement("tr");

          if (tabName === "pending") {
            row.innerHTML = `
                            <td>${solicitud.nombre}</td>
                            <td>${solicitud.edad}</td>
                            <td>${solicitud.dni}</td>
                            <td>${solicitud.pais}</td>
                            <td>${solicitud.telefono}</td>
                            <td>${new Date(
              solicitud.created_at
            ).toLocaleDateString()}</td>
                            <td>
                                <button class="btn btn-success btn-small" onclick="aprobarSolicitud(${solicitud.id
              })">
                                    ✅ Aprobar
                                </button>
                                <button class="btn btn-danger btn-small" onclick="rechazarSolicitud(${solicitud.id
              })">
                                    ❌ Rechazar
                                </button>
                            </td>
                        `;
          } else if (tabName === "approved") {
            row.innerHTML = `
                            <td>${solicitud.nombre}</td>
                            <td>${solicitud.email_creado || "N/A"}</td>
                            <td>${solicitud.telefono}</td>
                            <td>${new Date(
              solicitud.processed_at
            ).toLocaleDateString()}</td>
                            <td><span class="badge badge-success">Aprobado</span></td>
                        `;
          } else if (tabName === "rejected") {
            row.innerHTML = `
                            <td>${solicitud.nombre}</td>
                            <td>${solicitud.motivo_rechazo || "Sin motivo"}</td>
                            <td>${solicitud.telefono}</td>
                            <td>${new Date(
              solicitud.processed_at
            ).toLocaleDateString()}</td>
                            <td><span class="badge badge-danger">Rechazado</span></td>
                        `;
          }

          tbody.appendChild(row);
        });
        noMessage.style.display = "none";
      } else {
        noMessage.style.display = "block";
        tbody.innerHTML = "";
      }
    }
  } catch (error) {
    console.error(`Error cargando pestaña ${tabName}:`, error);
  }
}

// ===== VALIDACIÓN DE EDAD EN TIEMPO REAL =====
function initAgeValidation() {
  console.log("🔍 Buscando elementos de validación de edad...");
  const edadInput = document.getElementById("edad");
  const ageWarning = document.getElementById("ageWarningText");
  
  console.log("📝 Edad input:", edadInput ? "✅" : "❌");
  console.log("⚠️  Age warning:", ageWarning ? "✅" : "❌");

  if (edadInput && ageWarning) {
    console.log("✅ Inicializando validación de edad");

    edadInput.addEventListener("input", function (e) {
      const edad = parseInt(e.target.value) || 0;
      console.log(`🎯 Edad ingresada: ${edad}`);

      if (edad > 0 && edad < 18) {
        // Menor de edad - mostrar advertencia en rojo
        ageWarning.classList.add("age-alert");
        console.log("🔞 Advertencia de edad activada (menor de 18)");
      } else {
        // Mayor de edad - advertencia normal
        ageWarning.classList.remove("age-alert");
        console.log("✅ Edad válida (mayor de 18)");
      }
    });

    // Validación al enviar el formulario
    const registrationForm = document.getElementById("registrationForm");
    if (registrationForm) {
      registrationForm.addEventListener("submit", function (e) {
        const edad = parseInt(edadInput.value) || 0;

        if (edad < 18) {
          e.preventDefault();
          ageWarning.classList.add("age-alert");
          edadInput.focus();
          console.log("🚫 Envío bloqueado - Menor de edad");
          return false;
        }
      });
    }
  } else {
    console.log("ℹ️  Validación de edad no disponible en esta vista (elementos faltantes)");
  }
}


//***PAGINA BENEFICIOS***//

function navigate(route) {
  console.log("🔍 Navigate ejecutándose con ruta:", route);
  
  // ✅ CORREGIDO: Actualizar el hash SOLO si es diferente al actual
  const currentHash = window.location.hash.substring(1);
  if (currentHash !== route) {
    console.log(`🔄 Actualizando hash de "${currentHash}" a "${route}"`);
    window.location.hash = route;
  } else {
    console.log(`✅ Hash ya está en "${route}", no se actualiza`);
  }

  // REGLA 1: Si la ruta requiere autenticación, primero verificamos el token.
  if (["dashboard", "profile"].includes(route)) {
    if (!isAuthenticated()) {
      console.log("⛔ Acceso denegado, redirigiendo a login.");
      return navigate("login");
    }
  }

  console.log(`🔄 Evaluando switch para: "${route}"`);

  switch (route) {
    case "landing":
      loadView("landing_view", attachLandingListeners);
      break;
    case "login":
      loadView("login_view", attachLoginListeners);
      break;
    case "dashboard":
      loadView("dashboard_view", attachDashboardListeners);
      break;
    case "profile":
      loadView("profile_view", attachProfileListeners);
      break;
    case "benefits": // ✅ NUEVA RUTA
      loadView("benefits_view", attachBenefitsListeners);
      break;
    case "como-funciona": // ✅ RUTA CÓMO FUNCIONA
      loadView("how_it_works_view", attachHowItWorksListeners);
      break;
    case "quienes-somos": // ✅ RUTA QUIÉNES SOMOS
      loadView("quienes_somos_view", attachQuienesSomosListeners);
      break;
    case "confianza-legalidad": // ✅ RUTA CONFIANZA Y LEGALIDAD
      loadView("confidence_view", attachConfidenceListeners);
      break;
    case "logout":
      handleLogout();
      break;
    default:
      navigate("landing");
  }
}

// ✅ HANDLER CORREGIDO PARA BENEFICIOS
function attachBenefitsListeners() {
  console.log("🎯 Inicializando página de beneficios");

  // Inicializar efectos del header
  setTimeout(initHeaderEffects, 100);

  // Botón "Comenzar Ahora" - CORREGIDO: navegar explícitamente a landing
  const registerBtn = document.getElementById('benefits-register-btn');
  if (registerBtn) {
    registerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log("🚀 Navegando a LANDING desde beneficios");

      // ✅ FORZAR LA NAVEGACIÓN EXPLÍCITA A LANDING
      navigate("landing");
    });
  }

  // Botón "Ver Demo"
  const demoBtn = document.getElementById('benefits-demo-btn');
  if (demoBtn) {
    demoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log("🎮 Mostrando demo de beneficios");

      const ctaContent = document.querySelector('.cta-content');
      if (ctaContent) {
        const tempMsg = document.createElement('div');
        tempMsg.className = 'alert alert-info';
        tempMsg.innerHTML = '🎮 <strong>Demo interactivo</strong> - Próximamente podrás explorar todas las funcionalidades';
        tempMsg.style.marginTop = '20px';
        tempMsg.style.animation = 'fadeIn 0.5s ease';

        ctaContent.appendChild(tempMsg);

        setTimeout(() => {
          tempMsg.remove();
        }, 5000);
      }
    });
  }

  // ✅ MANEJAR ENLACES DEL FOOTER - CORREGIDO
  document.querySelectorAll('.benefits-footer a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('href').substring(1);
      console.log(`🔗 Navegando a: ${target} desde footer`);

      if (target === 'landing' || target === 'benefits') {
        // ✅ USAR navigate() EN LUGAR DE MANIPULACIÓN DIRECTA
        navigate(target);
      } else {
        // Para otros enlaces, mostrar mensaje temporal
        alert(`🔧 "${link.textContent}" - Esta sección estará disponible próximamente`);
      }
    });
  });

  console.log("✅ Página de beneficios inicializada correctamente");
}

// ✅ MANEJAR ENLACES DEL FOOTER - CORREGIDO
document.querySelectorAll('.benefits-footer a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.getAttribute('href').substring(1);
    console.log(`🔗 Navegando a: ${target} desde footer`);

    if (target === 'landing' || target === 'benefits') {
      // ✅ USAR navigate() EN LUGAR DE MANIPULACIÓN DIRECTA
      navigate(target);
    } else {
      // Para otros enlaces, mostrar mensaje temporal
      alert(`🔧 "${link.textContent}" - Esta sección estará disponible próximamente`);
    }
  });
});

// ✅ MANEJAR ENLACES DEL FOOTER
document.querySelectorAll('.benefits-footer a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.getAttribute('href').substring(1);
    console.log(`🔗 Navegando a: ${target} desde footer`);

    if (target === 'landing' || target === 'benefits') {
      navigate(target);
    } else {
      // Para otros enlaces, mostrar mensaje temporal
      alert(`🔧 "${target}" - Esta sección estará disponible próximamente`);
    }
  });
});

// ✅ HANDLER PARA "CÓMO FUNCIONA"
function attachHowItWorksListeners() {
  console.log("🎯 Inicializando página Cómo Funciona");

  // Inicializar efectos del header
  setTimeout(initHeaderEffects, 100);

  // Inicializar modal de términos
  setTimeout(initRegistrationModal, 100);

  // Botón de login en el header
  document.getElementById("switch-to-login")?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log("👤 Click en login - Navegando...");
    navigate("login");
  });

  // Botones CTA
  document.querySelectorAll('.how-it-works-cta .cta-button').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const target = button.getAttribute('href').substring(1);
      console.log(`🎯 Navegando a: ${target} desde Cómo Funciona`);
      navigate(target);
    });
  });

  // Enlaces del footer
  document.querySelectorAll('.benefits-footer a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('href').substring(1);
      console.log(`🔗 Navegando a: ${target} desde footer`);

      if (target === 'landing' || target === 'benefits' || target === 'como-funciona') {
        navigate(target);
      } else {
        // Para otros enlaces, mostrar mensaje temporal
        alert(`🔧 "${link.textContent}" - Esta sección estará disponible próximamente`);
      }
    });
  });

  console.log("✅ Página Cómo Funciona inicializada correctamente");
}

// ✅ HANDLER PARA "QUIÉNES SOMOS"
function attachQuienesSomosListeners() {
  console.log("🎯 Inicializando página Quiénes Somos");

  // Inicializar efectos del header
  setTimeout(initHeaderEffects, 100);

  // Botón de login en el header
  document.getElementById("switch-to-login")?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log("👤 Click en login - Navegando...");
    navigate("login");
  });

  // Botones CTA
  document.querySelectorAll('.quienes-somos-cta .cta-button').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const target = button.getAttribute('href').substring(1);
      console.log(`🎯 Navegando a: ${target} desde Quiénes Somos`);
      navigate(target);
    });
  });

  // Enlaces del footer
  document.querySelectorAll('.benefits-footer a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('href').substring(1);
      console.log(`🔗 Navegando a: ${target} desde footer`);
      navigate(target);
    });
  });

  console.log("✅ Página Quiénes Somos inicializada correctamente");
}

// ✅ HANDLER PARA "CONFIANZA Y LEGALIDAD"
function attachConfidenceListeners() {
  console.log("🎯 Inicializando página Confianza y Legalidad");

  // Inicializar efectos del header
  setTimeout(initHeaderEffects, 100);

  // Botón de login en el header
  document.getElementById("switch-to-login")?.addEventListener('click', (e) => {
    e.preventDefault();
    console.log("👤 Click en login - Navegando...");
    navigate("login");
  });

  // Botones CTA
  document.querySelectorAll('.cta-button').forEach(button => {
    button.addEventListener('click', (e) => {
      const onclick = button.getAttribute('onclick');
      if (onclick && onclick.includes('index.html')) {
        e.preventDefault();
        if (onclick.includes('#registro')) {
          navigate("landing");
          setTimeout(() => {
            const registroSection = document.getElementById('registro');
            if (registroSection) {
              registroSection.scrollIntoView({ behavior: 'smooth' });
            }
          }, 500);
        } else {
          navigate("landing");
        }
      }
    });
  });

  // Enlaces del footer
  document.querySelectorAll('.main-footer a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = link.getAttribute('href').substring(1);
      console.log(`🔗 Navegando a: ${target} desde footer`);
      navigate(target);
    });
  });

  // Enlaces del footer que van a index.html
  document.querySelectorAll('.main-footer a[href*="index.html"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate("landing");
    });
  });

  console.log("✅ Página Confianza y Legalidad inicializada correctamente");
}