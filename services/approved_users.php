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
        // Obtener usuarios aprobados con sus saldos
        // Asumiendo que hay una tabla users o que usamos account_requests
        // y una tabla user_points para los saldos
        
        $sql = "SELECT 
                    ar.id,
                    ar.nombre,
                    ar.email,
                    ar.pais,
                    COALESCE(
                        (SELECT SUM(puntos) 
                         FROM user_points 
                         WHERE user_id = ar.id 
                         AND tipo IN ('asignacion', 'bono', 'manual')),
                        0
                    ) - COALESCE(
                        (SELECT SUM(puntos) 
                         FROM user_points 
                         WHERE user_id = ar.id 
                         AND tipo = 'canje'),
                        0
                    ) as saldo
                FROM account_requests ar
                WHERE ar.status = 'approved'
                ORDER BY ar.nombre ASC";
        
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $users = [];
        while ($row = $result->fetch_assoc()) {
            $users[] = [
                'id' => (int)$row['id'],
                'nombre' => $row['nombre'],
                'email' => $row['email'],
                'pais' => $row['pais'],
                'saldo' => (int)$row['saldo']
            ];
        }
        
        $stmt->close();
        
        $response = [
            'success' => true,
            'users' => $users,
            'count' => count($users)
        ];
        
    } catch (Exception $e) {
        error_log("Error obteniendo usuarios aprobados: " . $e->getMessage());
        // Si hay error con la tabla user_points (puede que no exista), intentar sin saldo
        try {
            $sql = "SELECT id, nombre, email, pais FROM account_requests WHERE status = 'approved' ORDER BY nombre ASC";
            $stmt = $conn->prepare($sql);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $users = [];
            while ($row = $result->fetch_assoc()) {
                $users[] = [
                    'id' => (int)$row['id'],
                    'nombre' => $row['nombre'],
                    'email' => $row['email'],
                    'pais' => $row['pais'],
                    'saldo' => 0
                ];
            }
            
            $stmt->close();
            
            $response = [
                'success' => true,
                'users' => $users,
                'count' => count($users)
            ];
        } catch (Exception $e2) {
            error_log("Error fallback obteniendo usuarios: " . $e2->getMessage());
            $response = [
                'success' => false, 
                'message' => 'Error al obtener usuarios aprobados.',
                'users' => []
            ];
        }
    }
} else {
    $response['message'] = 'Método no permitido.';
}

echo json_encode($response);

if (isset($conn) && $conn) {
    $conn->close();
}
?>
