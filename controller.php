<?php
/**
 * controller.php
 * * Controlador central de la aplicación. Contiene la lógica de negocio
 * * para el registro, login, validación de sesiones y gestión de perfiles.
 */

// Incluir la conexión a la DB y las clases de utilidad
// La ruta de db_connect.php está en services/ y controller.php está en la raíz.
require_once __DIR__ . '/services/db_connect.php'; 
// La clase class.php está en la raíz, junto a controller.php
require_once __DIR__ . '/class.php'; 

class AppController {

    private $db;

    /**
     * Constructor que recibe la conexión a la base de datos.
     * @param mysqli $db Objeto de conexión a la base de datos.
     */
    public function __construct(mysqli $db) {
        $this->db = $db;
    }

    // -------------------------------------------------------------
    // 1. REGISTRO DE USUARIO
    // -------------------------------------------------------------
    
    /**
     * Registra un nuevo usuario en la base de datos.
     * @param string $name Nombre del usuario.
     * @param string $email Correo electrónico (debe ser único).
     * @param string $password Contraseña en texto plano.
     * @return array Resultado del registro.
     */
    public function registerUser($name, $email, $password) {
        // Validación básica de entrada
        if (empty($name) || empty($email) || empty($password)) {
            return ['success' => false, 'message' => 'Todos los campos son obligatorios.'];
        }
        
        // 1. Verificar si el email ya existe
        $stmt = $this->db->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $stmt->store_result();
        
        if ($stmt->num_rows > 0) {
            $stmt->close();
            return ['success' => false, 'message' => 'El correo electrónico ya está registrado.'];
        }
        $stmt->close();

        // 2. Hashear la contraseña de forma segura
        $password_hash = password_hash($password, PASSWORD_BCRYPT);
        
        // 3. Insertar el nuevo usuario
        $stmt = $this->db->prepare("INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, NOW())");
        $stmt->bind_param("sss", $name, $email, $password_hash);
        
        if ($stmt->execute()) {
            $stmt->close();
            return ['success' => true, 'message' => 'Registro exitoso.'];
        } else {
            $error_message = $this->db->error;
            $stmt->close();
            return ['success' => false, 'message' => "Error al registrar: " . $error_message];
        }
    }
    
    // -------------------------------------------------------------
    // 2. LOGIN DE USUARIO Y GENERACIÓN DE TOKEN
    // -------------------------------------------------------------

    /**
     * Realiza el login de un usuario validando su email y contraseña.
     * Si es exitoso, genera un nuevo token de sesión.
     * @param string $email Correo electrónico del usuario.
     * @param string $password Contraseña en texto plano.
     * @param bool $only_email Si es true, permite login solo con email para usuarios aprobados sin contraseña.
     * @return array Resultado del login, incluyendo el 'token' si es exitoso.
     */
    public function loginUser($email, $password, $only_email = false) {
        // 1. Buscar usuario por email (incluyendo status de account_requests)
        $stmt = $this->db->prepare("
            SELECT u.id, u.name, u.password_hash, ar.status as request_status 
            FROM users u
            LEFT JOIN account_requests ar ON u.email = ar.email
            WHERE u.email = ?
        ");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            $stmt->close();
            return ['success' => false, 'message' => 'Credenciales incorrectas.'];
        }

        $user = $result->fetch_assoc();
        $stmt->close();

        // 2. Caso especial: Login solo con email para usuarios aprobados sin contraseña
        if ($only_email) {
            // Verificar que el usuario esté aprobado
            if ($user['request_status'] !== 'approved') {
                return ['success' => false, 'message' => 'Tu cuenta aún no ha sido aprobada por un administrador.'];
            }
            
            // Verificar que no tenga contraseña configurada
            if (!empty($user['password_hash'])) {
                return ['success' => false, 'message' => 'Ya tienes una contraseña configurada. Por favor ingresa tu contraseña.'];
            }
            
            // Permitir acceso para configuración inicial
            $needs_setup = true;
        } else {
            // Login normal con contraseña
            if (empty($user['password_hash'])) {
                return ['success' => false, 'message' => 'Debes configurar tu contraseña primero. Inicia sesión solo con tu email.'];
            }
            
            // Verificar la contraseña hasheada
            if (!password_verify($password, $user['password_hash'])) {
                return ['success' => false, 'message' => 'Credenciales incorrectas.'];
            }
            
            $needs_setup = false;
        }

        // 3. Autenticación exitosa: Generar y guardar el token de sesión
        $tokenData = AuthUtilities::generateSessionToken();
        
        $user_id = $user['id'];
        $token_hash = $tokenData['token_hash'];
        $expires_at = $tokenData['expires_at'];

        // Limpieza: Eliminar tokens viejos asociados a este usuario (sesión única)
        $this->db->query("DELETE FROM sessions WHERE user_id = $user_id");

        // Insertar el nuevo token de sesión en la tabla 'sessions'
        $stmt = $this->db->prepare("INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)");
        $stmt->bind_param("iss", $user_id, $token_hash, $expires_at);
        
        if ($stmt->execute()) {
            $stmt->close();
            
            return [
                'success' => true,
                'message' => 'Login exitoso.',
                'token' => $tokenData['token'], // El token en texto plano se envía al cliente
                'name' => $user['name'],
                'needs_setup' => $needs_setup ?? false
            ];
        } else {
            // Error de inserción del token en la DB
            $error_message = $this->db->error;
            $stmt->close();
            error_log("Error al crear sesión: " . $error_message);
            return ['success' => false, 'message' => "Error al crear sesión."];
        }
    }

    // -------------------------------------------------------------
    // 3. VALIDACIÓN DE TOKEN
    // -------------------------------------------------------------

    /**
     * Valida si un token es activo y no ha expirado.
     * @param string $token_from_client El token en texto plano (desde localStorage).
     * @return User|null Objeto User si es válido, null si no lo es.
     */
    // En validateToken method:
public function validateToken($token_from_client) {
    if (!AuthUtilities::isTokenValid($token_from_client)) {
        return null;
    }
    
    $token_hash = AuthUtilities::hashToken($token_from_client);
    
    $stmt = $this->db->prepare("
        SELECT u.id, u.name, u.email, u.password_hash, u.is_admin
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token_hash = ? AND s.expires_at > NOW()
    ");
    $stmt->bind_param("s", $token_hash);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        $stmt->close();
        return null;
    }

    $user_data = $result->fetch_assoc();
    $stmt->close();

    return new User(
        $user_data['id'], 
        $user_data['name'], 
        $user_data['email'], 
        $user_data['password_hash'],
        $user_data['is_admin'] // ✅ NUEVO PARÁMETRO
    );
}
    
    // -------------------------------------------------------------
    // 4. CIERRE DE SESIÓN (LOGOUT)
    // -------------------------------------------------------------

    /**
     * Elimina el token de sesión de la base de datos para cerrar la sesión.
     * @param string $token_from_client El token en texto plano (desde localStorage).
     * @return array Resultado del cierre de sesión.
     */
    public function logoutUser($token_from_client) {
        if (!AuthUtilities::isTokenValid($token_from_client)) {
            return ['success' => false, 'message' => 'Token inválido para cerrar sesión.'];
        }

        $token_hash = AuthUtilities::hashToken($token_from_client);
        
        // Eliminar el registro de sesión de la base de datos
        $stmt = $this->db->prepare("DELETE FROM sessions WHERE token_hash = ?");
        $stmt->bind_param("s", $token_hash);
        
        if ($stmt->execute()) {
            $stmt->close();
            // Siempre devolver true, ya que el objetivo es que la sesión termine
            return ['success' => true, 'message' => 'Sesión cerrada correctamente.'];
        } else {
            $stmt->close();
            error_log("Error al eliminar sesión: " . $this->db->error);
            return ['success' => true, 'message' => 'Error al cerrar sesión en DB, pero se procederá al cierre local.'];
        }
    }
    
    // -------------------------------------------------------------
    // 5. OBTENER DATOS DE PERFIL
    // -------------------------------------------------------------

    /**
     * Obtiene los datos de usuario y perfil.
     * @param int $user_id ID del usuario.
     * @return array Datos del usuario y su perfil.
     */
    public function getProfileData($user_id) {
        $data = ['name' => '', 'email' => '', 'profile' => []];

        // 1. Obtener datos básicos de la tabla 'users'
        $stmt = $this->db->prepare("SELECT name, email FROM users WHERE id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $user_result = $stmt->get_result();

        if ($user_result->num_rows > 0) {
            $user_data = $user_result->fetch_assoc();
            $data['name'] = $user_data['name'];
            $data['email'] = $user_data['email'];
        } else {
            $stmt->close();
            return ['success' => false, 'message' => 'Usuario no encontrado.'];
        }
        $stmt->close();
        
        // 2. Obtener datos de la tabla 'profiles'
        $stmt = $this->db->prepare("SELECT company_name, phone_number, country FROM profiles WHERE user_id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $profile_result = $stmt->get_result();

        if ($profile_result->num_rows > 0) {
            $data['profile'] = $profile_result->fetch_assoc();
        } else {
            // Si no existe perfil, inicializar campos vacíos
            $data['profile'] = ['company_name' => '', 'phone_number' => '', 'country' => ''];
        }
        $stmt->close();

        // 3. Fallback: usar datos desde account_requests por email si faltan en profiles
        //    Mapear telefono -> phone_number y pais -> country
        if (!empty($data['email'])) {
            $needsPhone = empty($data['profile']['phone_number']);
            $needsCountry = empty($data['profile']['country']);
            if ($needsPhone || $needsCountry) {
                $stmt = $this->db->prepare("SELECT telefono, pais FROM account_requests WHERE email = ? ORDER BY created_at DESC LIMIT 1");
                $stmt->bind_param("s", $data['email']);
                $stmt->execute();
                $req_result = $stmt->get_result();
                if ($req_result->num_rows > 0) {
                    $req = $req_result->fetch_assoc();
                    if ($needsPhone && !empty($req['telefono'])) {
                        $data['profile']['phone_number'] = $req['telefono'];
                    }
                    if ($needsCountry && !empty($req['pais'])) {
                        $data['profile']['country'] = $req['pais'];
                    }
                }
                $stmt->close();
            }
        }

        return ['success' => true, 'data' => $data];
    }
    
    // -------------------------------------------------------------
    // 6. ACTUALIZAR DATOS DE PERFIL
    // -------------------------------------------------------------
    
    /**
     * Actualiza o crea el perfil de un usuario (UPSERT).
     * @param int $user_id ID del usuario.
     * @param string $company_name Nombre de la compañía.
     * @param string $phone_number Número de teléfono.
     * @param string $country País.
     * @return array Resultado de la operación.
     */
    public function saveProfileData($user_id, $company_name, $phone_number, $country, $name = null) {
        // 1. Sanitización básica
        $company_name = trim($company_name);
        $phone_number = trim($phone_number);
        $country = trim($country);
        if ($name !== null) { $name = trim($name); }
        
        // 1b. Actualizar nombre del usuario si se envió
        if ($name !== null && $name !== '') {
            $stmt = $this->db->prepare("UPDATE users SET name = ? WHERE id = ?");
            $stmt->bind_param("si", $name, $user_id);
            $stmt->execute();
            $stmt->close();
        }
        
        // 2. Comprobar si ya existe un perfil para este usuario
        $stmt = $this->db->prepare("SELECT profile_id FROM profiles WHERE user_id = ?");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $stmt->store_result();
        
        if ($stmt->num_rows > 0) {
            // 2a. ACTUALIZAR Perfil
            $stmt->close();
            $stmt = $this->db->prepare("
                UPDATE profiles 
                SET company_name = ?, phone_number = ?, country = ? 
                WHERE user_id = ?
            ");
            $stmt->bind_param("sssi", $company_name, $phone_number, $country, $user_id);
            
            if ($stmt->execute()) {
                $stmt->close();
                return ['success' => true, 'message' => 'Perfil actualizado con éxito.'];
            } else {
                $stmt->close();
                error_log("Error al actualizar perfil: " . $this->db->error);
                return ['success' => false, 'message' => 'Error al actualizar el perfil.'];
            }
        } else {
            // 2b. CREAR Perfil
            $stmt->close();
            $stmt = $this->db->prepare("
                INSERT INTO profiles (user_id, company_name, phone_number, country) 
                VALUES (?, ?, ?, ?)
            ");
            $stmt->bind_param("isss", $user_id, $company_name, $phone_number, $country);
            
            if ($stmt->execute()) {
                $stmt->close();
                return ['success' => true, 'message' => 'Perfil creado con éxito.'];
            } else {
                $stmt->close();
                error_log("Error al crear perfil: " . $this->db->error);
                return ['success' => false, 'message' => 'Error al crear el perfil.'];
            }
        }
    }
}
