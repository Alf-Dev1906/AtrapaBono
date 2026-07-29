<?php
/**
 * class.php
 * * Define las clases principales del Modelo (Usuario) y
 * * utilidades para la Autenticación (Generación/Validación de Tokens).
 */

// ------------------------------------------------------------
// 1. CLASE USER (Modelo de Dominio)
// ------------------------------------------------------------

class User {
    public $id;
    public $name;
    public $email;
    public $password_hash;
    public $is_admin; // ✅ NUEVA PROPIEDAD

    public function __construct($id, $name, $email, $password_hash, $is_admin = false) {
        $this->id = $id;
        $this->name = $name;
        $this->email = $email;
        $this->password_hash = $password_hash;
        $this->is_admin = $is_admin;
    }
}

// ------------------------------------------------------------
// 2. CLASE AUTH UTILITIES (Manejo de Tokens de Sesión)
// ------------------------------------------------------------

class AuthUtilities {
    
    // Duración del token en horas (24 horas)
    const TOKEN_EXPIRY_HOURS = 24;

    /**
     * Genera un token de sesión seguro (token en texto plano) y su hash.
     * @return array [token, token_hash, expires_at (fecha en formato 'Y-m-d H:i:s')]
     */
    public static function generateSessionToken() {
        // Genera 32 bytes de datos aleatorios criptográficamente seguros
        $random_token = bin2hex(random_bytes(32)); 
        
        // El hash se guarda en la DB (usando sha256 para ser determinista y rápido)
        $token_hash = hash('sha256', $random_token); 
        
        // Calcular la fecha y hora de expiración
        $expiry_time = time() + (self::TOKEN_EXPIRY_HOURS * 3600);
        $expires_at = date('Y-m-d H:i:s', $expiry_time);

        return [
            'token' => $random_token,      // Se envía al cliente
            'token_hash' => $token_hash,   // Se guarda en la DB
            'expires_at' => $expires_at    // Se guarda en la DB
        ];
    }
    
    /**
     * Hashea el token plano recibido del cliente para compararlo con el valor de la DB.
     * @param string $token_from_client El token en texto plano.
     * @return string|null El hash SHA256 del token, o null si está vacío.
     */
    public static function hashToken($token_from_client) {
        if (empty($token_from_client)) {
            return null;
        }
        return hash('sha256', $token_from_client);
    }
    
    /**
     * Realiza una validación de formato rápida del token antes de ir a la DB.
     * @param string $token_from_client El token en texto plano.
     * @return bool True si el token es un hash hexadecimal de 64 caracteres.
     */
    public static function isTokenValid($token_from_client) {
        // Un token de 32 bytes binarios convertidos a hexadecimal son 64 caracteres.
        // Se valida que sea una cadena hexadecimal de 64 caracteres.
        return (bool) preg_match('/^[a-f0-9]{64}$/i', $token_from_client);
    }
}

/* * NOTA IMPORTANTE:
 * Asegúrate de tener la tabla 'sessions' creada en tu DB con la siguiente estructura 
 * para que la lógica de AuthUtilities y AppController funcione:
 * * CREATE TABLE sessions (
 * id INT AUTO_INCREMENT PRIMARY KEY,
 * user_id INT NOT NULL,
 * token_hash VARCHAR(64) NOT NULL UNIQUE, 
 * expires_at DATETIME NOT NULL,
 * FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
 * );
 * */
?>
