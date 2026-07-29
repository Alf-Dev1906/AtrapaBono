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

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        // Contar solicitudes por estado
        $stats = ['pending' => 0, 'approved' => 0, 'rejected' => 0];
        
        $sql = "SELECT status, COUNT(*) as count FROM account_requests GROUP BY status";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();
        
        while ($row = $result->fetch_assoc()) {
            if (isset($stats[$row['status']])) {
                $stats[$row['status']] = (int)$row['count'];
            }
        }
        
        $stmt->close();
        
        $response = [
            'success' => true,
            'stats' => $stats
        ];
        
    } catch (Exception $e) {
        error_log("Error obteniendo estadísticas admin: " . $e->getMessage());
        $response = [
            'success' => false, 
            'message' => 'Error al obtener estadísticas.',
            'stats' => ['pending' => 0, 'approved' => 0, 'rejected' => 0]
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
