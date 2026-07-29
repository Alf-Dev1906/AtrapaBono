<?php
/**
 * Script para crear usuario administrador de prueba
 * Email: Danhiersantana15@gmail.com
 * Password: Dan19060
 * Name: Danhier
 * is_admin: 1
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Incluir conexión a la base de datos
require_once 'services/db_connect.php';

// Datos del usuario
$email = 'Danhiersantana15@gmail.com';
$password = 'Dan19060';
$name = 'Danhier';
$is_admin = 1;

// Hash de la contraseña
$password_hash = password_hash($password, PASSWORD_DEFAULT);

echo "<h2>Creando usuario administrador...</h2>";
echo "<p><strong>Email:</strong> $email</p>";
echo "<p><strong>Nombre:</strong> $name</p>";
echo "<p><strong>Es Admin:</strong> Sí</p>";
echo "<hr>";

try {
    // Verificar si el usuario ya existe
    $check_stmt = $conn->prepare("SELECT id, email FROM users WHERE email = ?");
    $check_stmt->bind_param("s", $email);
    $check_stmt->execute();
    $result = $check_stmt->get_result();
    
    if ($result->num_rows > 0) {
        $existing_user = $result->fetch_assoc();
        echo "<p style='color: orange;'>⚠️ El usuario ya existe con ID: " . $existing_user['id'] . "</p>";
        echo "<p>Actualizando datos...</p>";
        
        // Actualizar usuario existente
        $update_stmt = $conn->prepare("UPDATE users SET name = ?, password_hash = ?, is_admin = ?, updated_at = NOW() WHERE email = ?");
        $update_stmt->bind_param("ssis", $name, $password_hash, $is_admin, $email);
        
        if ($update_stmt->execute()) {
            echo "<p style='color: green;'>✅ Usuario actualizado exitosamente!</p>";
        } else {
            echo "<p style='color: red;'>❌ Error al actualizar: " . $update_stmt->error . "</p>";
        }
        
        $update_stmt->close();
    } else {
        // Insertar nuevo usuario
        $insert_stmt = $conn->prepare("INSERT INTO users (email, name, password_hash, is_admin, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())");
        $insert_stmt->bind_param("sssi", $email, $name, $password_hash, $is_admin);
        
        if ($insert_stmt->execute()) {
            $user_id = $conn->insert_id;
            echo "<p style='color: green;'>✅ Usuario creado exitosamente con ID: $user_id</p>";
        } else {
            echo "<p style='color: red;'>❌ Error al crear usuario: " . $insert_stmt->error . "</p>";
        }
        
        $insert_stmt->close();
    }
    
    $check_stmt->close();
    
    // Mostrar información del usuario creado
    echo "<hr>";
    echo "<h3>Datos de acceso:</h3>";
    echo "<ul>";
    echo "<li><strong>URL Login:</strong> <a href='http://localhost/landing_atrapabono/#login'>http://localhost/landing_atrapabono/#login</a></li>";
    echo "<li><strong>Email:</strong> $email</li>";
    echo "<li><strong>Contraseña:</strong> $password</li>";
    echo "<li><strong>Rol:</strong> Administrador</li>";
    echo "</ul>";
    
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Error: " . $e->getMessage() . "</p>";
    error_log("Error creando usuario admin: " . $e->getMessage());
}

$conn->close();

echo "<hr>";
echo "<p><a href='http://localhost/landing_atrapabono/#login'>← Ir al Login</a></p>";
?>
