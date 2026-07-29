<?php
/**
 * services/setup_password.php
 * Endpoint para que usuarios aprobados establezcan su contraseña inicial
 */

header('Content-Type: application/json');
require_once 'db_connect.php';
require_once '../controller.php';

$response = ['success' => false, 'message' => 'Acceso denegado.'];

// Obtener el token de autorización
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
    
    $password = isset($data['password']) ? trim($data['password']) : '';
    $confirm_password = isset($data['confirm_password']) ? trim($data['confirm_password']) : '';
    
    // Validaciones
    if (empty($password) || empty($confirm_password)) {
        $response = ['success' => false, 'message' => 'Por favor completa todos los campos.'];
        echo json_encode($response);
        exit();
    }
    
    if ($password !== $confirm_password) {
        $response = ['success' => false, 'message' => 'Las contraseñas no coinciden.'];
        echo json_encode($response);
        exit();
    }
    
    if (strlen($password) < 6) {
        $response = ['success' => false, 'message' => 'La contraseña debe tener al menos 6 caracteres.'];
        echo json_encode($response);
        exit();
    }
    
    // Verificar que el usuario esté aprobado y no tenga contraseña
    $stmt = $conn->prepare("
        SELECT u.password_hash, ar.status 
        FROM users u
        LEFT JOIN account_requests ar ON u.email = ar.email
        WHERE u.id = ?
    ");
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
    
    // Verificar que esté aprobado
    if ($user_data['status'] !== 'approved') {
        $response = ['success' => false, 'message' => 'Tu cuenta no está aprobada.'];
        echo json_encode($response);
        exit();
    }
    
    // Verificar que no tenga ya una contraseña
    if (!empty($user_data['password_hash'])) {
        $response = ['success' => false, 'message' => 'Ya tienes una contraseña configurada.'];
        echo json_encode($response);
        exit();
    }
    
    // Hashear la nueva contraseña
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    
    // Actualizar la contraseña en la base de datos
    $stmt = $conn->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
    $stmt->bind_param("si", $password_hash, $user->id);
    
    if ($stmt->execute()) {
        $stmt->close();
        $response = [
            'success' => true,
            'message' => 'Contraseña configurada exitosamente. Ahora puedes acceder con tu email y contraseña.'
        ];
    } else {
        $stmt->close();
        $response = ['success' => false, 'message' => 'Error al configurar la contraseña. Inténtalo de nuevo.'];
    }
    
} else {
    $response = ['success' => false, 'message' => 'Método no permitido. Utiliza POST.'];
}

echo json_encode($response);

if (isset($conn) && $conn) {
    $conn->close();
}
?>
