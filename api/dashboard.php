<?php
/**
 * api/dashboard.php
 * * Endpoint para obtener las estadísticas clave y transacciones recientes del dashboard.
 * * INTEGRACIÓN HAPPIER API: Ahora usa datos reales de Happier con fallback a mock
 */

require_once '../services/db_connect.php'; 
require_once '../class.php'; 
require_once '../controller.php'; 

// Configuración de cabeceras CORS y Content-Type
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type');

// Manejar la solicitud OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. Obtener Token
$headers = getallheaders();
$token = $headers['Authorization'] ?? $headers['authorization'] ?? '';

// El token viene como "Bearer <token>", lo extraemos
if (preg_match('/Bearer\s(\S+)/', $token, $matches)) {
    $token = $matches[1];
} else {
    // Si no hay token, respondemos con error de autenticación
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Acceso denegado. Se requiere un token de autenticación.']);
    exit();
}

// 2. Autenticar Token (Usando el controlador)
$controller = new AppController($conn);
$user = $controller->validateToken($token); // Validar el token

if (!$user) {
    // Token inválido o expirado
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sesión inválida o expirada. Por favor, inicie sesión nuevamente.']);
    exit();
}

// ------------------------------------------------------------
// 3. OBTENER DATOS DEL DASHBOARD (REALES O MOCK)
// ------------------------------------------------------------

// Incluir el servicio de Happier
require_once '../services/happier_service.php';

try {
    // Intentar obtener datos reales de Happier
    $dashboardData = HappierService::getDashboardData();
    
    // Asegurar que el nombre del usuario sea el real (no el de Happier)
    $dashboardData['user_name'] = $user->name;

} catch (Exception $e) {
    // Si falla, usar datos mock como fallback
    error_log("Error obteniendo datos de Happier: " . $e->getMessage());
    
    $dashboardData = [
        'user_name' => $user->name,
        'stats' => [
            'total_bonos' => '0',
            'bonos_redeemed' => '0', 
            'avg_campaign_value' => '$0.00',
            'conversion_rate' => '0%'
        ],
        'transactions' => []
    ];
}

// 4. Respuesta Exitosa
http_response_code(200);
echo json_encode(['success' => true, 'data' => $dashboardData]);

$conn->close();
?>