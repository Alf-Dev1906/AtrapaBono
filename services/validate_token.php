<?php
/**
 * services/validate_token.php
 */

header('Content-Type: application/json');
require_once '../controller.php'; 

global $conn;
$response = ['success' => false, 'message' => 'Acceso denegado.'];

if ($_SERVER['REQUEST_METHOD'] === 'GET' || $_SERVER['REQUEST_METHOD'] === 'POST') {
    
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    $token = null;
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
    } else {
        $token = $_GET['token'] ?? $_POST['token'] ?? null;
    } 
    
    if ($token) {
        $controller = new AppController($conn);
        $user = $controller->validateToken($token);
        
        if ($user instanceof User) {
            $response = [
                'success' => true,
                'message' => 'Token válido.',
                'data' => [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'name' => $user->name,
                    'is_admin' => $user->is_admin // ✅ INCLUIR is_admin
                ]
            ];
        } else {
            $response = ['success' => false, 'message' => 'Sesión expirada o token no reconocido.'];
        }
    }
}

echo json_encode($response);
exit; 
?>