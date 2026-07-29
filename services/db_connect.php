<?php
error_reporting(E_ALL);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../error.log');

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

define('DB_SERVER', 'localhost');
define('DB_USERNAME', 'atrapabono_user');
define('DB_PASSWORD', '123456');
define('DB_NAME', 'atrapabono_db');

$conn = null;

try {
    $temp_conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD);
    
    if ($temp_conn->connect_error) {
        throw new Exception("Error de conexión a MySQL: " . $temp_conn->connect_error);
    }
    
    $db_check = $temp_conn->query("SHOW DATABASES LIKE '" . DB_NAME . "'");
    if ($db_check->num_rows == 0) {
        error_log("ATRAPABONO ERROR: La base de datos '" . DB_NAME . "' no existe. Ejecuta setup_database.php");
        $temp_conn->close();
        die(json_encode([
            'success' => false, 
            'message' => 'Base de datos no configurada. Contacta al administrador.',
            'debug' => 'Database ' . DB_NAME . ' does not exist'
        ]));
    }
    
    $temp_conn->close();
    
    $conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);
    
    if ($conn->connect_error) {
        throw new Exception("Error de conexión a la base de datos: " . $conn->connect_error);
    }
    
    $conn->set_charset("utf8mb4");
    
    error_log("ATRAPABONO: Conexión a base de datos exitosa");
    
} catch (Exception $e) {
    error_log("ATRAPABONO DB ERROR: " . $e->getMessage());
    
    if (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Error de conexión a la base de datos. Verifica que XAMPP esté corriendo.',
            'debug' => $e->getMessage()
        ]);
        exit;
    } else {
        die("Error de conexión a la base de datos: " . $e->getMessage() . 
            "<br><br><strong>Posibles soluciones:</strong>" .
            "<ul>" .
            "<li>Verifica que XAMPP esté corriendo</li>" .
            "<li>Verifica que MySQL esté activo</li>" .
            "<li><a href='setup_database.php'>Ejecutar configuración de base de datos</a></li>" .
            "</ul>");
    }
}

?>
