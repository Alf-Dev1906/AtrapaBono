<?php
/**
 * Archivo de prueba para verificar que PHP y la base de datos funcionan
 */

// Mostrar errores
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Test de Conexión</h1>";

// 1. Verificar PHP
echo "<p>✅ PHP está funcionando. Versión: " . phpversion() . "</p>";

// 2. Verificar conexión a MySQL
$host = 'localhost';
$user = 'root';
$pass = '';
$db = 'atrapabono_db';

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    echo "<p>❌ Error de conexión a MySQL: " . $conn->connect_error . "</p>";
    echo "<p><strong>Solución:</strong> Verifica que MySQL esté corriendo en XAMPP</p>";
} else {
    echo "<p>✅ Conexión a MySQL exitosa</p>";
    
    // 3. Verificar si existe la base de datos
    $result = $conn->query("SHOW TABLES");
    if ($result) {
        echo "<p>✅ Base de datos 'atrapabono_db' encontrada</p>";
        echo "<p>Tablas encontradas:</p><ul>";
        $tables = [];
        while ($row = $result->fetch_array()) {
            $tables[] = $row[0];
            echo "<li>" . $row[0] . "</li>";
        }
        echo "</ul>";
        
        // 4. Verificar si existe la tabla users
        if (!in_array('users', $tables)) {
            echo "<h3>🔧 Creando tabla 'users'...</h3>";
            $create_users = "
            CREATE TABLE `users` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `name` varchar(100) NOT NULL,
                `email` varchar(150) NOT NULL,
                `password_hash` varchar(255) NOT NULL,
                `is_admin` tinyint(1) DEFAULT 0,
                `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `email_unique` (`email`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            ";
            
            if ($conn->query($create_users)) {
                echo "<p>✅ Tabla 'users' creada exitosamente</p>";
                
                // Crear usuario administrador
                $admin_password = password_hash('admin123', PASSWORD_BCRYPT);
                $insert_admin = "INSERT INTO users (name, email, password_hash, is_admin) VALUES ('Administrador', 'admin@atrapabono.com', '$admin_password', 1)";
                
                if ($conn->query($insert_admin)) {
                    echo "<p>✅ Usuario administrador creado</p>";
                    echo "<p><strong>Email:</strong> admin@atrapabono.com</p>";
                    echo "<p><strong>Contraseña:</strong> admin123</p>";
                } else {
                    echo "<p>⚠️ Error al crear usuario admin: " . $conn->error . "</p>";
                }
            } else {
                echo "<p>❌ Error al crear tabla 'users': " . $conn->error . "</p>";
            }
        } else {
            echo "<p>✅ Tabla 'users' ya existe</p>";
        }
        
    } else {
        echo "<p>❌ No se pudo consultar la base de datos</p>";
    }
    
    $conn->close();
}

echo "<hr>";
echo "<p><a href='index.html'>Volver a la aplicación</a></p>";
?>
