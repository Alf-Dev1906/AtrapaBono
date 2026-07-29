<?php
/**
 * services/logout.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db_connect.php';
require_once '../controller.php';

$response = ['success' => false, 'message' => 'Error de sesión.'];

if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'GET') {
    
    $token = null;
    
    // MÉTODO 1: Headers (la forma correcta)
    $headers = getallheaders();
    foreach ($headers as $key => $value) {
        if (strtolower($key) === 'authorization') {
            if (preg_match('/Bearer\s(\S+)/', $value, $matches)) {
                $token = $matches[1];
                break;
            }
        }
    }
    
    // MÉTODO 2: Fallback - leer directamente de $_SERVER
    if (!$token && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        if (preg_match('/Bearer\s(\S+)/', $_SERVER['HTTP_AUTHORIZATION'], $matches)) {
            $token = $matches[1];
        }
    }
    
    // MÉTODO 3: Fallback - parámetros GET/POST
    if (!$token && isset($_GET['token'])) {
        $token = $_GET['token'];
    }
    if (!$token && isset($_POST['token'])) {
        $token = $_POST['token'];
    }

    if (empty($token)) {
        // DEBUG: Ver qué está llegando
        $debug_info = [
            'headers_received' => array_keys($headers),
            'http_authorization' => isset($_SERVER['HTTP_AUTHORIZATION']) ? 'SÍ' : 'NO',
            'get_token' => isset($_GET['token']) ? 'SÍ' : 'NO',
            'post_token' => isset($_POST['token']) ? 'SÍ' : 'NO'
        ];
        $response = [
            'success' => false, 
            'message' => 'Token no proporcionado.',
            'debug' => $debug_info
        ];
    } else {
        $controller = new AppController($conn);
        $result = $controller->logoutUser($token);
        $response = $result;
    }
} else {
    $response['message'] = 'Método no permitido.';
}

echo json_encode($response);

if (isset($conn) && $conn) {
    $conn->close();
}
exit;
?>