<?php

header('Content-Type: application/json');
require_once 'db_connect.php';
require_once '../controller.php';

$response = ['success' => false, 'message' => 'Acceso denegado.'];

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
    $json_input = file_get_contents('php://input');
    $data = json_decode($json_input, true);
    
    $user_id = $data['user_id'] ?? null;
    $points = $data['points'] ?? null;
    $description = $data['description'] ?? 'Asignación manual de puntos';
    
    if (!$user_id || !$points || $points < 1) {
        $response['message'] = 'Datos inválidos. Se requiere user_id y points (mayor a 0).';
        echo json_encode($response);
        exit();
    }
    
    try {
        // Verificar que el usuario existe y está aprobado
        $check_sql = "SELECT id, nombre FROM account_requests WHERE id = ? AND status = 'approved'";
        $check_stmt = $conn->prepare($check_sql);
        $check_stmt->bind_param("i", $user_id);
        $check_stmt->execute();
        $check_result = $check_stmt->get_result();
        
        if ($check_result->num_rows === 0) {
            $check_stmt->close();
            $response['message'] = 'Usuario no encontrado o no está aprobado.';
            echo json_encode($response);
            exit();
        }
        
        $user_data = $check_result->fetch_assoc();
        $check_stmt->close();
        
        // Crear tabla user_points si no existe
        $create_table_sql = "CREATE TABLE IF NOT EXISTS user_points (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            puntos INT NOT NULL,
            tipo VARCHAR(50) NOT NULL,
            descripcion TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_tipo (tipo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
        
        $conn->query($create_table_sql);
        
        // Insertar asignación de puntos
        $insert_sql = "INSERT INTO user_points (user_id, puntos, tipo, descripcion) VALUES (?, ?, 'manual', ?)";
        $insert_stmt = $conn->prepare($insert_sql);
        $insert_stmt->bind_param("iis", $user_id, $points, $description);
        
        if ($insert_stmt->execute()) {
            $insert_stmt->close();
            
            // Obtener saldo actualizado
            $saldo_sql = "SELECT 
                            COALESCE(
                                (SELECT SUM(puntos) 
                                 FROM user_points 
                                 WHERE user_id = ? 
                                 AND tipo IN ('asignacion', 'bono', 'manual')),
                                0
                            ) - COALESCE(
                                (SELECT SUM(puntos) 
                                 FROM user_points 
                                 WHERE user_id = ? 
                                 AND tipo = 'canje'),
                                0
                            ) as saldo_actual";
            
            $saldo_stmt = $conn->prepare($saldo_sql);
            $saldo_stmt->bind_param("ii", $user_id, $user_id);
            $saldo_stmt->execute();
            $saldo_result = $saldo_stmt->get_result();
            $saldo_data = $saldo_result->fetch_assoc();
            $saldo_stmt->close();
            
            $response = [
                'success' => true,
                'message' => "Puntos asignados exitosamente a {$user_data['nombre']}.",
                'points_assigned' => (int)$points,
                'new_balance' => (int)$saldo_data['saldo_actual']
            ];
        } else {
            $insert_stmt->close();
            $response['message'] = 'Error al asignar puntos.';
        }
        
    } catch (Exception $e) {
        error_log("Error asignando puntos: " . $e->getMessage());
        $response = [
            'success' => false, 
            'message' => 'Error al asignar puntos: ' . $e->getMessage()
        ];
    }
} else {
    $response['message'] = 'Método no permitido.';
}

echo json_encode($response);

if (isset($conn) && $conn) {
    $conn->close();
}
?>
