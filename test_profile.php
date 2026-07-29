<?php
/**
 * Script para verificar y crear la tabla profiles si no existe
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Test de la tabla Profiles</h1>";

require_once 'services/db_connect.php';

echo "<p><strong>Base de datos:</strong> atrapabono_db</p>";

// 1. Verificar si existe la tabla profiles
$result = $conn->query("SHOW TABLES LIKE 'profiles'");

if ($result->num_rows > 0) {
    echo "<p style='color: green;'>✅ La tabla 'profiles' existe</p>";
    
    // Mostrar estructura
    $structure = $conn->query("DESCRIBE profiles");
    echo "<h3>Estructura de la tabla:</h3>";
    echo "<table border='1' cellpadding='5'>";
    echo "<tr><th>Campo</th><th>Tipo</th><th>Null</th><th>Key</th><th>Default</th></tr>";
    while ($row = $structure->fetch_assoc()) {
        echo "<tr>";
        echo "<td>{$row['Field']}</td>";
        echo "<td>{$row['Type']}</td>";
        echo "<td>{$row['Null']}</td>";
        echo "<td>{$row['Key']}</td>";
        echo "<td>{$row['Default']}</td>";
        echo "</tr>";
    }
    echo "</table>";
    
} else {
    echo "<p style='color: red;'>❌ La tabla 'profiles' NO existe</p>";
    echo "<p>Creando la tabla...</p>";
    
    // Primero verificar la estructura de la tabla users
    echo "<h3>Verificando tabla 'users'...</h3>";
    $users_check = $conn->query("SHOW TABLES LIKE 'users'");
    
    if ($users_check->num_rows > 0) {
        echo "<p style='color: green;'>✅ Tabla 'users' existe</p>";
        
        // Mostrar estructura de users
        $users_structure = $conn->query("DESCRIBE users");
        echo "<table border='1' cellpadding='5'>";
        echo "<tr><th>Campo</th><th>Tipo</th><th>Key</th></tr>";
        while ($row = $users_structure->fetch_assoc()) {
            echo "<tr><td>{$row['Field']}</td><td>{$row['Type']}</td><td>{$row['Key']}</td></tr>";
        }
        echo "</table>";
        
        // Crear la tabla profiles sin foreign key primero
        $sql = "CREATE TABLE IF NOT EXISTS profiles (
            profile_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            company_name VARCHAR(255) DEFAULT NULL,
            phone_number VARCHAR(50) DEFAULT NULL,
            country VARCHAR(100) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_user (user_id),
            INDEX idx_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
        
        if ($conn->query($sql) === TRUE) {
            echo "<p style='color: green;'>✅ Tabla 'profiles' creada exitosamente</p>";
            
            // Ahora intentar agregar la foreign key
            $fk_sql = "ALTER TABLE profiles 
                       ADD CONSTRAINT fk_profiles_user 
                       FOREIGN KEY (user_id) 
                       REFERENCES users(id) 
                       ON DELETE CASCADE";
            
            if ($conn->query($fk_sql) === TRUE) {
                echo "<p style='color: green;'>✅ Foreign key agregada exitosamente</p>";
            } else {
                echo "<p style='color: orange;'>⚠️ No se pudo agregar foreign key (no es crítico): " . $conn->error . "</p>";
                echo "<p>La tabla funcionará correctamente sin la foreign key.</p>";
            }
        } else {
            echo "<p style='color: red;'>❌ Error al crear la tabla: " . $conn->error . "</p>";
        }
        
    } else {
        echo "<p style='color: red;'>❌ Tabla 'users' NO existe. Debes crearla primero.</p>";
    }
}

$conn->close();

echo "<hr>";
echo "<p><a href='index.html'>Volver a la aplicación</a></p>";
?>
