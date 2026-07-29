<?php
/**
 * services/change_password.php
 * Endpoint para cambiar la contraseña del usuario
 */

header('Content-Type: application/json');
require_once 'db_connect.php';
require_once '../controller.php';

$response = ['success' => false, 'message' => 'Acceso denegado.'];

// Obtener token de autorización
$token = null;
$headers = getallheaders();

if (isset($headers['Authorization'])) {
    $auth_header = $headers['Authorization'];
    if (preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
        $token = $matches[1];
    }
}

if (!$token) {
    http_response_code(401);
    echo json_encode($response);
    exit();
}

$controller = new AppController($conn);
$user = $controller->validateToken($token);

if (!$user) {
    http_response_code(403);
    $response['message'] = 'Sesión inválida o expirada.';
    echo json_encode($response);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $json_data = file_get_contents('php://input');
    $data = json_decode($json_data, true);
    
    $current_password = isset($data['current_password']) ? trim($data['current_password']) : '';
    $new_password = isset($data['new_password']) ? trim($data['new_password']) : '';
    $confirm_password = isset($data['confirm_password']) ? trim($data['confirm_password']) : '';
    
    // Validaciones
    if (empty($current_password) || empty($new_password) || empty($confirm_password)) {
        $response = ['success' => false, 'message' => 'Por favor completa todos los campos.'];
        echo json_encode($response);
        exit();
    }
    
    if ($new_password !== $confirm_password) {
        $response = ['success' => false, 'message' => 'Las contraseñas nuevas no coinciden.'];
        echo json_encode($response);
        exit();
    }
    
    if (strlen($new_password) < 6) {
        $response = ['success' => false, 'message' => 'La nueva contraseña debe tener al menos 6 caracteres.'];
        echo json_encode($response);
        exit();
    }
    
    // Obtener contraseña actual del usuario
    $stmt = $conn->prepare("SELECT password_hash FROM users WHERE id = ?");
    $stmt->bind_param("i", $user->id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        $response = ['success' => false, 'message' => 'Usuario no encontrado.'];
        echo json_encode($response);
        exit();
    }
    
    $user_data = $result->fetch_assoc();
    $stmt->close();
    
    // Verificar contraseña actual
    if (!password_verify($current_password, $user_data['password_hash'])) {
        $response = ['success' => false, 'message' => 'La contraseña actual es incorrecta.'];
        echo json_encode($response);
        exit();
    }
    
    // Hashear la nueva contraseña
    $new_password_hash = password_hash($new_password, PASSWORD_DEFAULT);
    
    // Actualizar la contraseña
    $stmt = $conn->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    $stmt->bind_param("si", $new_password_hash, $user->id);
    
    if ($stmt->execute()) {
        $stmt->close();
        $response = [
            'success' => true,
            'message' => 'Contraseña actualizada exitosamente.'
        ];
    } else {
        $stmt->close();
        $response = ['success' => false, 'message' => 'Error al actualizar la contraseña. Inténtalo de nuevo.'];
    }
    
} else {
    $response = ['success' => false, 'message' => 'Método no permitido. Utiliza POST.'];
}

echo json_encode($response);

if (isset($conn) && $conn) {
    $conn->close();
}
?>
