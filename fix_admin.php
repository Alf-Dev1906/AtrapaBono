<?php
/**
 * fix_admin.php
 * Script para recrear el usuario administrador con credenciales correctas
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>🔧 Reparar Usuario Administrador</h1>";

require_once 'services/db_connect.php';

if (!$conn) {
    die("❌ Error: No hay conexión a la base de datos");
}

try {
    echo "<h2>1. Eliminando usuario administrador existente (si existe)</h2>";
    
    // Eliminar usuario admin existente
    $delete_stmt = $conn->prepare("DELETE FROM users WHERE email = ?");
    $admin_email = 'admin@atrapabono.com';
    $delete_stmt->bind_param("s", $admin_email);
    
    if ($delete_stmt->execute()) {
        $deleted_rows = $delete_stmt->affected_rows;
        echo "<p>✅ Eliminados $deleted_rows registros de usuario administrador</p>";
    } else {
        echo "<p>⚠️ Error al eliminar usuario existente: " . $delete_stmt->error . "</p>";
    }
    $delete_stmt->close();
    
    echo "<h2>2. Creando nuevo usuario administrador</h2>";
    
    // Crear nuevo usuario admin
    $admin_name = 'Administrador';
    $admin_email = 'admin@atrapabono.com';
    $admin_password = 'admin123';
    $password_hash = password_hash($admin_password, PASSWORD_BCRYPT);
    $is_admin = 1;
    
    echo "<p><strong>Datos del nuevo usuario:</strong></p>";
    echo "<ul>";
    echo "<li><strong>Nombre:</strong> $admin_name</li>";
    echo "<li><strong>Email:</strong> $admin_email</li>";
    echo "<li><strong>Contraseña:</strong> $admin_password</li>";
    echo "<li><strong>Es Admin:</strong> " . ($is_admin ? 'SÍ' : 'NO') . "</li>";
    echo "<li><strong>Hash generado:</strong> " . substr($password_hash, 0, 40) . "...</li>";
    echo "</ul>";
    
    $insert_stmt = $conn->prepare("INSERT INTO users (name, email, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, NOW())");
    $insert_stmt->bind_param("sssi", $admin_name, $admin_email, $password_hash, $is_admin);
    
    if ($insert_stmt->execute()) {
        $new_user_id = $insert_stmt->insert_id;
        echo "<p>✅ <strong>Usuario administrador creado exitosamente</strong></p>";
        echo "<p><strong>ID del nuevo usuario:</strong> $new_user_id</p>";
        
        echo "<h2>3. Verificando la creación</h2>";
        
        // Verificar que se creó correctamente
        $verify_stmt = $conn->prepare("SELECT id, name, email, is_admin, created_at FROM users WHERE id = ?");
        $verify_stmt->bind_param("i", $new_user_id);
        $verify_stmt->execute();
        $result = $verify_stmt->get_result();
        
        if ($result->num_rows > 0) {
            $user = $result->fetch_assoc();
            echo "<p>✅ Usuario verificado en la base de datos:</p>";
            echo "<table border='1' style='border-collapse: collapse; margin: 10px 0;'>";
            echo "<tr><th>Campo</th><th>Valor</th></tr>";
            foreach ($user as $key => $value) {
                echo "<tr><td>$key</td><td>$value</td></tr>";
            }
            echo "</table>";
        }
        $verify_stmt->close();
        
        echo "<h2>4. Probando validación de contraseña</h2>";
        
        // Probar password_verify
        $is_password_valid = password_verify($admin_password, $password_hash);
        echo "<p><strong>Test de password_verify('$admin_password', hash):</strong> " . 
             ($is_password_valid ? "✅ VÁLIDA" : "❌ INVÁLIDA") . "</p>";
        
        if ($is_password_valid) {
            echo "<div style='background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; color: #155724; margin: 15px 0;'>";
            echo "<h3>🎉 ¡Usuario administrador reparado exitosamente!</h3>";
            echo "<p><strong>Credenciales para login:</strong></p>";
            echo "<p><strong>📧 Email:</strong> admin@atrapabono.com</p>";
            echo "<p><strong>🔑 Contraseña:</strong> admin123</p>";
            echo "<p>Ahora puedes intentar hacer login nuevamente.</p>";
            echo "</div>";
        } else {
            echo "<div style='background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; color: #721c24;'>";
            echo "<h3>❌ Error en la validación de contraseña</h3>";
            echo "<p>Hay un problema con el hash de la contraseña. Contacta al desarrollador.</p>";
            echo "</div>";
        }
        
    } else {
        echo "<p>❌ <strong>Error al crear usuario administrador:</strong> " . $insert_stmt->error . "</p>";
    }
    $insert_stmt->close();
    
} catch (Exception $e) {
    echo "<p>❌ <strong>Error crítico:</strong> " . $e->getMessage() . "</p>";
}

$conn->close();

echo "<hr>";
echo "<h2>🛠️ Acciones Disponibles</h2>";
echo "<p><a href='debug_admin.php' style='background: #17a2b8; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;'>🔍 Debug Usuario Admin</a></p>";
echo "<p><a href='test_connection.php' style='background: #28a745; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;'>🔍 Test Conexión</a></p>";
echo "<p><a href='index.html' style='background: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;'>🚀 Probar Login</a></p>";
?>
