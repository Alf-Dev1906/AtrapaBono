<?php

header('Content-Type: application/json');
require_once 'db_connect.php';
require_once '../controller.php';

$response = ['success' => false, 'message' => 'Acción no completada.'];

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

if (!$user || !$user->is_admin) {
    http_response_code(403);
    $response['message'] = 'Se requieren permisos de administrador.';
    echo json_encode($response);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    $action = $data['action'] ?? '';
    $solicitud_id = $data['solicitud_id'] ?? 0;
    $motivo = $data['motivo'] ?? '';
    
    try {
        $stmt = $conn->prepare("SELECT * FROM account_requests WHERE id = ? AND status = 'pending'");
        $stmt->bind_param("i", $solicitud_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            $response['message'] = 'Solicitud no encontrada o ya procesada.';
            $stmt->close();
            echo json_encode($response);
            exit();
        }
        
        $solicitud = $result->fetch_assoc();
        $stmt->close();
        
        if ($action === 'approve') {
            // Usar el email real de la solicitud
            $email = $solicitud['email'];
            
            // Verificar si el usuario ya existe
            $check_stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
            $check_stmt->bind_param("s", $email);
            $check_stmt->execute();
            $check_result = $check_stmt->get_result();
            
            if ($check_result->num_rows > 0) {
                $check_stmt->close();
                $response['message'] = 'El usuario con este email ya existe en el sistema.';
                echo json_encode($response);
                exit();
            }
            $check_stmt->close();
            
            // No crear contraseña - el usuario la configurará en su primer login
            // Usar cadena vacía en lugar de NULL para evitar error de columna NOT NULL
            $password_hash = '';
            $stmt = $conn->prepare("INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, NOW())");
            $stmt->bind_param("sss", $solicitud['nombre'], $email, $password_hash);
            
            if ($stmt->execute()) {
                $user_id = $stmt->insert_id;
                
                $stmt_profile = $conn->prepare("INSERT INTO profiles (user_id, company_name, phone_number, country) VALUES (?, ?, ?, ?)");
                $company_name = "Empresa de " . $solicitud['nombre'];
                $stmt_profile->bind_param("isss", $user_id, $company_name, $solicitud['telefono'], $solicitud['pais']);
                $stmt_profile->execute();
                $stmt_profile->close();
                
                $stmt_update = $conn->prepare("UPDATE account_requests SET status = 'approved', processed_at = NOW(), processed_by = ? WHERE id = ?");
                $stmt_update->bind_param("ii", $user->id, $solicitud_id);
                $stmt_update->execute();
                $stmt_update->close();
                
                $response = [
                    'success' => true,
                    'message' => 'Solicitud aprobada exitosamente. El usuario podrá iniciar sesión con su email y configurar su contraseña.',
                    'user_created' => [
                        'email' => $email
                    ]
                ];
            } else {
                throw new Exception("Error al crear usuario: " . $stmt->error);
            }
            $stmt->close();
            
        } elseif ($action === 'reject') {
            $stmt = $conn->prepare("UPDATE account_requests SET status = 'rejected', motivo_rechazo = ?, processed_at = NOW(), processed_by = ? WHERE id = ?");
            $stmt->bind_param("sii", $motivo, $user->id, $solicitud_id);
            
            if ($stmt->execute()) {
                $response = [
                    'success' => true,
                    'message' => 'Solicitud rechazada correctamente.'
                ];
            } else {
                throw new Exception("Error al rechazar solicitud: " . $stmt->error);
            }
            $stmt->close();
            
        } else {
            $response['message'] = 'Acción no válida.';
        }
        
    } catch (Exception $e) {
        error_log("Error en admin_actions: " . $e->getMessage());
        $response['message'] = 'Error interno del servidor: ' . $e->getMessage();
    }
} else {
    $response['message'] = 'Método no permitido.';
}

echo json_encode($response);

if (isset($conn) && $conn) {
    $conn->close();
}
?>