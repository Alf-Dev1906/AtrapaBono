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
    $tab = $_GET['tab'] ?? 'pending';
    
    try {
        $solicitudes = [];
        
        if ($tab === 'pending') {
            $sql = "SELECT id, nombre, email, edad, genero, dni, pais, provincia, telefono, created_at 
                    FROM account_requests 
                    WHERE status = 'pending' 
                    ORDER BY created_at DESC";
        } elseif ($tab === 'approved') {
            $sql = "SELECT id, nombre, email, telefono, processed_at, motivo_rechazo 
                    FROM account_requests 
                    WHERE status = 'approved' 
                    ORDER BY processed_at DESC";
        } elseif ($tab === 'rejected') {
            $sql = "SELECT id, nombre, email, telefono, processed_at, motivo_rechazo 
                    FROM account_requests 
                    WHERE status = 'rejected' 
                    ORDER BY processed_at DESC";
        } else {
            $sql = "SELECT id, nombre, email, edad, genero, dni, pais, provincia, telefono, created_at 
                    FROM account_requests 
                    WHERE status = 'pending' 
                    ORDER BY created_at DESC";
        }
        
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();
        
        while ($row = $result->fetch_assoc()) {
            $solicitudes[] = $row;
        }
        
        $response = [
            'success' => true,
            'solicitudes' => $solicitudes,
            'count' => count($solicitudes)
        ];
        
        $stmt->close();
        
    } catch (Exception $e) {
        error_log("Error obteniendo solicitudes: " . $e->getMessage());
        $response = [
            'success' => false, 
            'message' => 'Error al obtener solicitudes.',
            'solicitudes' => []
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