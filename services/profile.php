<?php
/**
 * services/profile.php
 * * Endpoint para gestionar (GET/POST) la información adicional del perfil de usuario.
 * Requiere un token de autenticación válido.
 */

// 1. Configuración de cabeceras
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Incluir la conexión a la base de datos
require_once 'db_connect.php';

// Incluir el controlador central
require_once '../controller.php';

// Inicializar el controlador con la conexión
$controller = new AppController($conn);
$response = ['success' => false, 'message' => 'Acción no completada.'];

// 2. Obtener y validar el token
$token = null;
$headers = getallheaders();

// Buscar en la cabecera 'Authorization: Bearer <token>'
if (isset($headers['Authorization'])) {
    $auth_header = $headers['Authorization'];
    if (preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
        $token = $matches[1];
    }
} else if (isset($_POST['token'])) { // Fallback (No recomendado)
    $token = $_POST['token'];
}

// 3. Validar el token y obtener el objeto User
$user = $controller->validateToken($token);

if (!$user) {
    http_response_code(401); // Unauthorized
    $response = ['success' => false, 'message' => 'Acceso denegado. Token inválido o no proporcionado.'];
    echo json_encode($response);
    exit();
}

$user_id = $user->id;

// 4. Manejar la solicitud GET o POST
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // 4.1. PETICIÓN GET: Devolver la información del perfil
    $profile_result = $controller->getProfileData($user_id);
    
    if ($profile_result['success']) {
        http_response_code(200);
        $response = [
            'success' => true,
            'data' => $profile_result['data']
        ];
    } else {
        http_response_code(500);
        $response = [
            'success' => false,
            'message' => $profile_result['message']
        ];
    }

} elseif ($method === 'POST') {
    // 4.2. PETICIÓN POST: Actualizar o crear el perfil
    
    // PHP no llena $_POST con peticiones Content-Type: application/json. 
    // Leemos directamente desde el flujo de entrada.
    $data = json_decode(file_get_contents("php://input"), true);
    
    // Obtener y sanear datos
    $company_name = trim($data['company_name'] ?? '');
    $phone_number = trim($data['phone_number'] ?? '');
    $country = trim($data['country'] ?? '');
    $name = isset($data['name']) ? trim($data['name']) : null; // opcional
    
    if (empty($company_name)) {
        http_response_code(400);
        $response = ['success' => false, 'message' => 'El nombre de la empresa es obligatorio.'];
    } else {
        // Llamo al método para actualizar/crear el perfil en AppController (incluye update de nombre si se envía)
        $update_result = $controller->saveProfileData($user_id, $company_name, $phone_number, $country, $name);
        
        if ($update_result['success']) {
            http_response_code(200);
            $response = ['success' => true, 'message' => $update_result['message']];
        } else {
            http_response_code(500);
            $response = ['success' => false, 'message' => $update_result['message']];
        }
    }

} else {
    // Método no permitido
    http_response_code(405);
    $response = ['success' => false, 'message' => 'Método no permitido.'];
}

echo json_encode($response);
exit;
?>
