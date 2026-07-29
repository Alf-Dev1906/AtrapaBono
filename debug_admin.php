<?php
/**
 * debug_admin.php
 * Script para diagnosticar problemas con el usuario administrador
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>🔍 Debug del Usuario Administrador</h1>";

require_once 'services/db_connect.php';
require_once 'controller.php';

if (!$conn) {
    die("Error: No hay conexión a la base de datos");
}

echo "<h2>1. Verificando usuario administrador en la base de datos</h2>";

// Buscar el usuario admin
$stmt = $conn->prepare("SELECT id, name, email, password_hash, is_admin, created_at FROM users WHERE email = ?");
$admin_email = 'admin@atrapabono.com';
$stmt->bind_param("s", $admin_email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo "<p>❌ <strong>PROBLEMA ENCONTRADO:</strong> No existe usuario con email 'admin@atrapabono.com'</p>";
    
    echo "<h3>🔧 Creando usuario administrador...</h3>";
    $admin_password = 'admin123';
    $password_hash = password_hash($admin_password, PASSWORD_BCRYPT);
    
    $insert_stmt = $conn->prepare("INSERT INTO users (name, email, password_hash, is_admin) VALUES (?, ?, ?, ?)");
    $name = 'Administrador';
    $is_admin = 1;
    $insert_stmt->bind_param("sssi", $name, $admin_email, $password_hash, $is_admin);
    
    if ($insert_stmt->execute()) {
        echo "<p>✅ Usuario administrador creado exitosamente</p>";
        echo "<div style='background: #d4edda; padding: 15px; border-radius: 5px; margin: 10px 0;'>";
        echo "<strong>Email:</strong> admin@atrapabono.com<br>";
        echo "<strong>Contraseña:</strong> admin123<br>";
        echo "<strong>Hash generado:</strong> " . substr($password_hash, 0, 30) . "...";
        echo "</div>";
    } else {
        echo "<p>❌ Error al crear usuario: " . $insert_stmt->error . "</p>";
    }
    $insert_stmt->close();
    
} else {
    $user = $result->fetch_assoc();
    echo "<p>✅ Usuario administrador encontrado:</p>";
    echo "<table border='1' style='border-collapse: collapse; margin: 10px 0;'>";
    echo "<tr><th>Campo</th><th>Valor</th></tr>";
    echo "<tr><td>ID</td><td>" . $user['id'] . "</td></tr>";
    echo "<tr><td>Nombre</td><td>" . $user['name'] . "</td></tr>";
    echo "<tr><td>Email</td><td>" . $user['email'] . "</td></tr>";
    echo "<tr><td>Es Admin</td><td>" . ($user['is_admin'] ? 'SÍ' : 'NO') . "</td></tr>";
    echo "<tr><td>Creado</td><td>" . $user['created_at'] . "</td></tr>";
    echo "<tr><td>Hash (primeros 30 chars)</td><td>" . substr($user['password_hash'], 0, 30) . "...</td></tr>";
    echo "</table>";
    
    echo "<h2>2. Probando validación de contraseña</h2>";
    
    $test_passwords = ['admin123', 'Admin123', 'ADMIN123', 'admin', '123'];
    
    foreach ($test_passwords as $test_pass) {
        $is_valid = password_verify($test_pass, $user['password_hash']);
        $status = $is_valid ? "✅ VÁLIDA" : "❌ INVÁLIDA";
        echo "<p><strong>Contraseña '$test_pass':</strong> $status</p>";
    }
    
    echo "<h2>3. Probando login completo con AppController</h2>";
    
    try {
        $controller = new AppController($conn);
        $login_result = $controller->loginUser('admin@atrapabono.com', 'admin123');
        
        echo "<p><strong>Resultado del login:</strong></p>";
        echo "<pre style='background: #f8f9fa; padding: 15px; border-radius: 5px;'>";
        print_r($login_result);
        echo "</pre>";
        
        if ($login_result['success']) {
            echo "<p>✅ <strong>LOGIN EXITOSO</strong> - El problema puede estar en el frontend</p>";
        } else {
            echo "<p>❌ <strong>LOGIN FALLIDO</strong> - " . $login_result['message'] . "</p>";
        }
        
    } catch (Exception $e) {
        echo "<p>❌ <strong>ERROR EN CONTROLLER:</strong> " . $e->getMessage() . "</p>";
    }
}

echo "<h2>4. Verificando estructura de tabla users</h2>";
$describe = $conn->query("DESCRIBE users");
echo "<table border='1' style='border-collapse: collapse;'>";
echo "<tr><th>Campo</th><th>Tipo</th><th>Null</th><th>Key</th><th>Default</th></tr>";
while ($row = $describe->fetch_assoc()) {
    echo "<tr>";
    echo "<td>" . $row['Field'] . "</td>";
    echo "<td>" . $row['Type'] . "</td>";
    echo "<td>" . $row['Null'] . "</td>";
    echo "<td>" . $row['Key'] . "</td>";
    echo "<td>" . $row['Default'] . "</td>";
    echo "</tr>";
}
echo "</table>";

echo "<h2>5. Test de hash manual</h2>";
$manual_hash = password_hash('admin123', PASSWORD_BCRYPT);
echo "<p><strong>Hash generado ahora:</strong> " . substr($manual_hash, 0, 50) . "...</p>";
echo "<p><strong>Verificación:</strong> " . (password_verify('admin123', $manual_hash) ? "✅ VÁLIDA" : "❌ INVÁLIDA") . "</p>";

$stmt->close();
$conn->close();

echo "<hr>";
echo "<h2>🛠️ Acciones</h2>";
echo "<p><a href='setup_database.php' style='background: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;'>🔧 Reconfigurar Base de Datos</a></p>";
echo "<p><a href='index.html' style='background: #28a745; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;'>🚀 Probar Login</a></p>";
?>
