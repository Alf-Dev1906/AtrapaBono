<?php
/**
 * Script de prueba para verificar la conexión con la API de Happier
 */

require_once __DIR__ . '/services/config.php';
require_once __DIR__ . '/services/happier_client.php';
require_once __DIR__ . '/services/happier_service.php';

echo "=== TEST DE CONEXIÓN API HAPPIER ===\n\n";

// Mostrar configuración (sin password)
$CFG = require __DIR__ . '/services/config.php';
echo "URL API: " . ($CFG['HAPPIER_API_URL'] ?? 'NO CONFIGURADA') . "\n";
echo "Usuario: " . ($CFG['HAPPIER_USER'] ?? 'NO CONFIGURADO') . "\n";
echo "SSL Verify: " . (($CFG['SSL_VERIFY'] ?? true) ? 'Sí' : 'No') . "\n\n";

// Test 1: Obtener token
echo "--- Test 1: Autenticación y obtención de token ---\n";
try {
    $token = HappierService::getToken();
    echo "✓ Token obtenido exitosamente\n";
    echo "  Token (primeros 20 chars): " . substr($token, 0, 20) . "...\n";
    
    // Verificar cache
    $cachePath = __DIR__ . '/services/.happier_token.json';
    if (file_exists($cachePath)) {
        $cache = json_decode(file_get_contents($cachePath), true);
        $expiresIn = ($cache['expires_at'] ?? 0) - time();
        echo "  Cache creado: Sí\n";
        echo "  Expira en: " . $expiresIn . " segundos (" . round($expiresIn/60, 1) . " minutos)\n";
    }
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n--- Test 2: Llamada a endpoint /me ---\n";
try {
    $meResp = HappierService::request('GET', 'me');
    if ($meResp['success'] ?? false) {
        echo "✓ Endpoint /me respondió exitosamente\n";
        $data = $meResp['data'] ?? $meResp;
        echo "  Estructura de respuesta:\n";
        echo "  - Keys disponibles: " . implode(', ', array_keys($data)) . "\n";
        if (isset($data['name'])) echo "  - Nombre: " . $data['name'] . "\n";
        if (isset($data['email'])) echo "  - Email: " . $data['email'] . "\n";
    } else {
        echo "✗ Endpoint /me falló\n";
        echo "  Mensaje: " . ($meResp['message'] ?? 'Sin mensaje') . "\n";
        echo "  Status: " . ($meResp['status'] ?? 'Sin status') . "\n";
    }
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

echo "\n--- Test 3: Llamada a endpoint /dashboard/summary ---\n";
try {
    $summaryResp = HappierService::request('GET', 'dashboard/summary');
    if ($summaryResp['success'] ?? false) {
        echo "✓ Endpoint /dashboard/summary respondió exitosamente\n";
        $data = $summaryResp['data'] ?? $summaryResp;
        echo "  Estructura de respuesta:\n";
        echo "  - Keys disponibles: " . implode(', ', array_keys($data)) . "\n";
        echo "  - Datos completos:\n";
        echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    } else {
        echo "✗ Endpoint /dashboard/summary falló\n";
        echo "  Mensaje: " . ($summaryResp['message'] ?? 'Sin mensaje') . "\n";
        echo "  Status: " . ($summaryResp['status'] ?? 'Sin status') . "\n";
    }
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

echo "\n--- Test 4: Explorar otros endpoints comunes ---\n";
$endpoints = [
    'users',
    'points',
    'transactions',
    'campaigns',
    'benefits',
    'rewards',
    'balance',
    'history',
];

foreach ($endpoints as $endpoint) {
    try {
        $resp = HappierService::request('GET', $endpoint);
        if ($resp['success'] ?? false) {
            echo "✓ /$endpoint - Disponible\n";
            $data = $resp['data'] ?? $resp;
            if (is_array($data)) {
                echo "    Keys: " . implode(', ', array_keys($data)) . "\n";
            }
        } else {
            $status = $resp['status'] ?? 0;
            if ($status === 404) {
                echo "  /$endpoint - No encontrado (404)\n";
            } elseif ($status === 403) {
                echo "  /$endpoint - Acceso denegado (403)\n";
            } else {
                echo "  /$endpoint - Error ($status)\n";
            }
        }
    } catch (Exception $e) {
        echo "  /$endpoint - Error: " . $e->getMessage() . "\n";
    }
}

echo "\n--- Test 5: Detalle del endpoint /points ---\n";
try {
    $pointsResp = HappierService::request('GET', 'points');
    if ($pointsResp['success'] ?? false) {
        echo "✓ Datos completos de /points:\n";
        echo json_encode($pointsResp, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    } else {
        echo "✗ No se pudo obtener detalle de /points\n";
    }
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

echo "\n=== FIN DEL TEST ===\n";
