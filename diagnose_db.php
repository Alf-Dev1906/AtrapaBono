<?php
/**
 * diagnose_db.php
 * Script de diagnóstico para identificar problemas específicos de la base de datos
 */

// Mostrar errores
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>🔍 Diagnóstico de Base de Datos - Atrapabono</h1>";

// Configuración
$host = 'localhost';
$user = 'root';
$pass = '';
$db_name = 'atrapabono_db';

$issues = [];
$solutions = [];

try {
    // 1. Verificar conexión a MySQL
    echo "<h2>📡 1. Conexión a MySQL</h2>";
    $conn = new mysqli($host, $user, $pass);
    
    if ($conn->connect_error) {
        $issues[] = "No se puede conectar a MySQL: " . $conn->connect_error;
        $solutions[] = "Verifica que XAMPP esté corriendo y que MySQL esté activo";
        throw new Exception("Conexión fallida");
    }
    echo "<p>✅ Conexión a MySQL exitosa</p>";
    
    // 2. Verificar si existe la base de datos
    echo "<h2>🗄️ 2. Verificación de Base de Datos</h2>";
    $db_check = $conn->query("SHOW DATABASES LIKE '$db_name'");
    if ($db_check->num_rows == 0) {
        $issues[] = "La base de datos '$db_name' no existe";
        $solutions[] = "Ejecutar setup_database.php para crear la base de datos";
        echo "<p>❌ Base de datos '$db_name' NO EXISTE</p>";
    } else {
        echo "<p>✅ Base de datos '$db_name' existe</p>";
        
        // 3. Seleccionar la base de datos y verificar tablas
        $conn->select_db($db_name);
        
        echo "<h2>📋 3. Verificación de Tablas</h2>";
        $required_tables = ['users', 'sessions', 'profiles', 'account_requests'];
        $existing_tables = [];
        
        $tables_result = $conn->query("SHOW TABLES");
        while ($row = $tables_result->fetch_array()) {
            $existing_tables[] = $row[0];
        }
        
        echo "<p><strong>Tablas existentes:</strong></p>";
        echo "<ul>";
        foreach ($existing_tables as $table) {
            echo "<li>✅ $table</li>";
        }
        echo "</ul>";
        
        $missing_tables = array_diff($required_tables, $existing_tables);
        if (!empty($missing_tables)) {
            $issues[] = "Faltan tablas: " . implode(', ', $missing_tables);
            $solutions[] = "Ejecutar setup_database.php para crear las tablas faltantes";
            echo "<p><strong>❌ Tablas faltantes:</strong></p>";
            echo "<ul>";
            foreach ($missing_tables as $table) {
                echo "<li>❌ $table</li>";
            }
            echo "</ul>";
        } else {
            echo "<p>✅ Todas las tablas requeridas están presentes</p>";
        }
        
        // 4. Verificar estructura de tablas críticas
        if (in_array('users', $existing_tables)) {
            echo "<h2>👥 4. Verificación de Estructura de Tabla 'users'</h2>";
            $users_structure = $conn->query("DESCRIBE users");
            $user_columns = [];
            while ($row = $users_structure->fetch_assoc()) {
                $user_columns[] = $row['Field'];
            }
            
            $required_user_columns = ['id', 'name', 'email', 'password_hash', 'is_admin'];
            $missing_user_columns = array_diff($required_user_columns, $user_columns);
            
            if (!empty($missing_user_columns)) {
                $issues[] = "Tabla 'users' le faltan columnas: " . implode(', ', $missing_user_columns);
                $solutions[] = "Ejecutar setup_database.php para actualizar la estructura";
                echo "<p>❌ Columnas faltantes en 'users': " . implode(', ', $missing_user_columns) . "</p>";
            } else {
                echo "<p>✅ Estructura de tabla 'users' correcta</p>";
            }
        }
        
        // 5. Verificar permisos de escritura
        echo "<h2>✏️ 5. Verificación de Permisos de Escritura</h2>";
        try {
            $test_query = "CREATE TEMPORARY TABLE test_permissions (id INT)";
            if ($conn->query($test_query)) {
                echo "<p>✅ Permisos de escritura funcionando</p>";
            } else {
                $issues[] = "Sin permisos de escritura en la base de datos";
                $solutions[] = "Verificar permisos del usuario MySQL";
            }
        } catch (Exception $e) {
            $issues[] = "Error de permisos: " . $e->getMessage();
            $solutions[] = "Verificar configuración de MySQL en XAMPP";
        }
    }
    
} catch (Exception $e) {
    echo "<p>❌ Error durante el diagnóstico: " . $e->getMessage() . "</p>";
}

// 6. Mostrar resumen
echo "<hr>";
echo "<h2>📊 Resumen del Diagnóstico</h2>";

if (empty($issues)) {
    echo "<div style='background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; color: #155724;'>";
    echo "<h3>🎉 ¡Todo está funcionando correctamente!</h3>";
    echo "<p>No se encontraron problemas con la configuración de la base de datos.</p>";
    echo "</div>";
} else {
    echo "<div style='background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; color: #721c24;'>";
    echo "<h3>⚠️ Problemas encontrados:</h3>";
    echo "<ol>";
    foreach ($issues as $issue) {
        echo "<li>$issue</li>";
    }
    echo "</ol>";
    echo "</div>";
    
    echo "<div style='background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; color: #0c5460; margin-top: 10px;'>";
    echo "<h3>🔧 Soluciones recomendadas:</h3>";
    echo "<ol>";
    foreach ($solutions as $solution) {
        echo "<li>$solution</li>";
    }
    echo "</ol>";
    echo "</div>";
}

echo "<hr>";
echo "<h2>🛠️ Acciones Disponibles</h2>";
echo "<p><a href='setup_database.php' style='background: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;'>🔧 Ejecutar Configuración Automática</a></p>";
echo "<p><a href='test_connection.php' style='background: #28a745; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;'>🔍 Probar Conexión</a></p>";
echo "<p><a href='index.html' style='background: #17a2b8; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;'>🚀 Ir a la Aplicación</a></p>";

if (isset($conn)) {
    $conn->close();
}
?>
