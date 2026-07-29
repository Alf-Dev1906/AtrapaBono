<?php
/**
 * setup_database.php
 * Script para crear automáticamente la base de datos y todas las tablas necesarias
 */

// Mostrar errores para debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>🚀 Configuración Automática de Base de Datos - Atrapabono</h1>";

// Configuración de conexión
$host = 'localhost';
$user = 'root';
$pass = '';
$db_name = 'atrapabono_db';

$success_count = 0;
$error_count = 0;

try {
    // 1. Conectar a MySQL (sin especificar base de datos)
    echo "<h2>📡 1. Conectando a MySQL...</h2>";
    $conn = new mysqli($host, $user, $pass);
    
    if ($conn->connect_error) {
        throw new Exception("Error de conexión: " . $conn->connect_error);
    }
    echo "<p>✅ Conexión a MySQL exitosa</p>";
    $success_count++;
    
    // 2. Crear base de datos si no existe
    echo "<h2>🗄️ 2. Creando base de datos...</h2>";
    $create_db = "CREATE DATABASE IF NOT EXISTS $db_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
    if ($conn->query($create_db)) {
        echo "<p>✅ Base de datos '$db_name' creada/verificada</p>";
        $success_count++;
    } else {
        throw new Exception("Error al crear base de datos: " . $conn->error);
    }
    
    // 3. Seleccionar la base de datos
    $conn->select_db($db_name);
    
    // 4. Crear tabla USERS
    echo "<h2>👥 3. Creando tabla 'users'...</h2>";
    $create_users = "
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    if ($conn->query($create_users)) {
        echo "<p>✅ Tabla 'users' creada exitosamente</p>";
        $success_count++;
    } else {
        echo "<p>❌ Error al crear tabla 'users': " . $conn->error . "</p>";
        $error_count++;
    }
    
    // 5. Crear tabla SESSIONS
    echo "<h2>🔐 4. Creando tabla 'sessions'...</h2>";
    $create_sessions = "
    CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_token_hash (token_hash),
        INDEX idx_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    if ($conn->query($create_sessions)) {
        echo "<p>✅ Tabla 'sessions' creada exitosamente</p>";
        $success_count++;
    } else {
        echo "<p>❌ Error al crear tabla 'sessions': " . $conn->error . "</p>";
        $error_count++;
    }
    
    // 6. Crear tabla PROFILES
    echo "<h2>📋 5. Creando tabla 'profiles'...</h2>";
    $create_profiles = "
    CREATE TABLE IF NOT EXISTS profiles (
        profile_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        company_name VARCHAR(200),
        phone_number VARCHAR(20),
        country VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    if ($conn->query($create_profiles)) {
        echo "<p>✅ Tabla 'profiles' creada exitosamente</p>";
        $success_count++;
    } else {
        echo "<p>❌ Error al crear tabla 'profiles': " . $conn->error . "</p>";
        $error_count++;
    }
    
    // 7. Crear tabla ACCOUNT_REQUESTS
    echo "<h2>📝 6. Creando tabla 'account_requests'...</h2>";
    $create_requests = "
    CREATE TABLE IF NOT EXISTS account_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL,
        edad INT NOT NULL,
        genero VARCHAR(20) NOT NULL,
        dni VARCHAR(50) NOT NULL,
        pais VARCHAR(100) NOT NULL,
        provincia VARCHAR(100) NOT NULL,
        telefono VARCHAR(20) NOT NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        motivo_rechazo TEXT,
        processed_at TIMESTAMP NULL,
        processed_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_email (email),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    if ($conn->query($create_requests)) {
        echo "<p>✅ Tabla 'account_requests' creada exitosamente</p>";
        $success_count++;
    } else {
        echo "<p>❌ Error al crear tabla 'account_requests': " . $conn->error . "</p>";
        $error_count++;
    }
    
    // 8. Crear usuario administrador por defecto
    echo "<h2>👨‍💼 7. Creando usuario administrador...</h2>";
    
    // Verificar si ya existe el admin
    $check_admin = $conn->query("SELECT id FROM users WHERE email = 'admin@atrapabono.com'");
    if ($check_admin->num_rows == 0) {
        $admin_password = password_hash('admin123', PASSWORD_BCRYPT);
        $insert_admin = "INSERT INTO users (name, email, password_hash, is_admin) VALUES ('Administrador', 'admin@atrapabono.com', '$admin_password', TRUE)";
        
        if ($conn->query($insert_admin)) {
            echo "<p>✅ Usuario administrador creado exitosamente</p>";
            echo "<div style='background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
            echo "<strong>📧 Email:</strong> admin@atrapabono.com<br>";
            echo "<strong>🔑 Contraseña:</strong> admin123";
            echo "</div>";
            $success_count++;
        } else {
            echo "<p>❌ Error al crear usuario administrador: " . $conn->error . "</p>";
            $error_count++;
        }
    } else {
        echo "<p>ℹ️ Usuario administrador ya existe</p>";
        $success_count++;
    }
    
    // 9. Crear índices adicionales
    echo "<h2>⚡ 8. Creando índices para optimización...</h2>";
    $indices = [
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
        "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_account_requests_status_created ON account_requests(status, created_at)"
    ];
    
    foreach ($indices as $index) {
        if ($conn->query($index)) {
            $success_count++;
        } else {
            echo "<p>⚠️ Advertencia al crear índice: " . $conn->error . "</p>";
        }
    }
    echo "<p>✅ Índices de optimización creados</p>";
    
} catch (Exception $e) {
    echo "<p>❌ Error crítico: " . $e->getMessage() . "</p>";
    $error_count++;
}

// Resumen final
echo "<hr>";
echo "<h2>📊 Resumen de Configuración</h2>";

if ($error_count == 0) {
    echo "<div style='background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 5px; color: #155724;'>";
    echo "<h3>🎉 ¡Configuración completada exitosamente!</h3>";
    echo "<p><strong>Operaciones exitosas:</strong> $success_count</p>";
    echo "<p><strong>Errores:</strong> $error_count</p>";
    echo "<p>Tu base de datos está lista para usar. Puedes proceder a usar la aplicación.</p>";
    echo "</div>";
} else {
    echo "<div style='background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 5px; color: #721c24;'>";
    echo "<h3>⚠️ Configuración completada con advertencias</h3>";
    echo "<p><strong>Operaciones exitosas:</strong> $success_count</p>";
    echo "<p><strong>Errores:</strong> $error_count</p>";
    echo "<p>Revisa los errores arriba y considera ejecutar este script nuevamente.</p>";
    echo "</div>";
}

echo "<hr>";
echo "<h2>🛠️ Acciones Disponibles</h2>";
echo "<p><a href='test_connection.php' style='background: #28a745; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;'>🔍 Probar Conexión</a></p>";
echo "<p><a href='diagnose_db.php' style='background: #17a2b8; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;'>🔍 Diagnosticar Base de Datos</a></p>";
echo "<p><a href='index.html' style='background: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;'>🚀 Ir a la Aplicación</a></p>";

if (isset($conn)) {
    $conn->close();
}
?>
