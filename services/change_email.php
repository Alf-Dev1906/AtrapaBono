<?php
/**
 * services/change_email.php
 * Endpoint para cambiar el email del usuario
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
    
    $new_email = isset($data['new_email']) ? filter_var(trim($data['new_email']), FILTER_SANITIZE_EMAIL) : '';
    $password = isset($data['password']) ? $data['password'] : '';
    
    // Validaciones
    if (empty($new_email) || empty($password)) {
        $response = ['success' => false, 'message' => 'Por favor completa todos los campos.'];
        echo json_encode($response);
        exit();
    }
    
    if (!filter_var($new_email, FILTER_VALIDATE_EMAIL)) {
        $response = ['success' => false, 'message' => 'El email ingresado no es válido.'];
        echo json_encode($response);
        exit();
    }
    
    // Verificar si el nuevo email ya existe
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
    $stmt->bind_param("si", $new_email, $user->id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows > 0) {
        $stmt->close();
        $response = ['success' => false, 'message' => 'Este email ya está en uso por otra cuenta.'];
        echo json_encode($response);
        exit();
    }
    $stmt->close();
    
    // Obtener datos del usuario
    $stmt = $conn->prepare("SELECT password_hash, email FROM users WHERE id = ?");
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
    
    // Verificar contraseña
    if (!password_verify($password, $user_data['password_hash'])) {
        $response = ['success' => false, 'message' => 'La contraseña es incorrecta.'];
        echo json_encode($response);
        exit();
    }
    
    // Actualizar el email
    $stmt = $conn->prepare("UPDATE users SET email = ? WHERE id = ?");
    $stmt->bind_param("si", $new_email, $user->id);
    
    if ($stmt->execute()) {
        $stmt->close();
        
        // También actualizar en account_requests si existe
        $stmt_req = $conn->prepare("UPDATE account_requests SET email = ? WHERE email = ?");
        $stmt_req->bind_param("ss", $new_email, $user_data['email']);
        $stmt_req->execute();
        $stmt_req->close();
        
        $response = [
            'success' => true,
            'message' => 'Email actualizado exitosamente. Por favor inicia sesión nuevamente con tu nuevo email.',
            'new_email' => $new_email
        ];
    } else {
        $stmt->close();
        $response = ['success' => false, 'message' => 'Error al actualizar el email. Inténtalo de nuevo.'];
    }
    
} else {
    $response = ['success' => false, 'message' => 'Método no permitido. Utiliza POST.'];
}

echo json_encode($response);

if (isset($conn) && $conn) {
    $conn->close();
}
?>
