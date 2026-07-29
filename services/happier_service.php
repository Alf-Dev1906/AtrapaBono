<?php
/**
 * services/happier_service.php
 * Servicio para interactuar con la API de Happier (token Bearer por /login)
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/happier_client.php';

class HappierService {
    private static string $cacheFile = __DIR__ . '/.happier_token.json';

    private static function cfg(): array {
        $CFG = require __DIR__ . '/config.php';
        return $CFG;
    }

    private static function client(): HappierClient {
        $cfg = self::cfg();
        return new HappierClient(
            $cfg['HAPPIER_API_URL'] ?? '',
            $cfg['HAPPIER_USER'] ?? '',
            $cfg['HAPPIER_PASS'] ?? '',
            (bool)($cfg['SSL_VERIFY'] ?? true),
            (string)($cfg['CA_BUNDLE'] ?? '')
        );
    }

    private static function loadCache(): array {
        if (is_file(self::$cacheFile)) {
            $json = file_get_contents(self::$cacheFile);
            $data = json_decode($json, true);
            return is_array($data) ? $data : [];
        }
        return [];
    }

    private static function saveCache(string $token, int $expiresAt): void {
        $payload = ['token' => $token, 'expires_at' => $expiresAt];
        @file_put_contents(self::$cacheFile, json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));
    }

    /**
     * Devuelve un token válido (login si no existe o expiró)
     */
    public static function getToken(): string {
        $cache = self::loadCache();
        $now = time();
        if (!empty($cache['token']) && !empty($cache['expires_at']) && $cache['expires_at'] > ($now + 60)) {
            return $cache['token'];
        }
        $client = self::client();
        $resp = $client->login();
        if (!($resp['success'] ?? false)) {
            // Intento alternativo por si el campo de usuario es distinto
            $cfg = self::cfg();
            $altBodies = [
                ['username' => $cfg['HAPPIER_USER'] ?? '', 'password' => $cfg['HAPPIER_PASS'] ?? ''],
                ['usuario'  => $cfg['HAPPIER_USER'] ?? '', 'password' => $cfg['HAPPIER_PASS'] ?? ''],
            ];
            foreach ($altBodies as $body) {
                $try = $client->request('POST', 'login', $body, null, ['Accept: application/json'], true);
                if (($try['success'] ?? false)) { $resp = $try; break; }
            }
            if (!($resp['success'] ?? false)) {
                // Intento con x-www-form-urlencoded
                $formTry = $client->request('POST', 'login', [
                    'email' => $cfg['HAPPIER_USER'] ?? '',
                    'password' => $cfg['HAPPIER_PASS'] ?? ''
                ], null, ['Accept: application/json','Content-Type: application/x-www-form-urlencoded'], true);
                if (($formTry['success'] ?? false)) {
                    $resp = $formTry;
                }
            }
            if (!($resp['success'] ?? false)) {
                // Intento con ruta alternativa
                $altPath = $client->request('POST', 'auth/login', [
                    'email' => $cfg['HAPPIER_USER'] ?? '',
                    'password' => $cfg['HAPPIER_PASS'] ?? ''
                ], null, ['Accept: application/json'], true);
                if (($altPath['success'] ?? false)) {
                    $resp = $altPath;
                }
            }
            if (!($resp['success'] ?? false)) {
                throw new Exception('Login Happier falló: ' . ($resp['message'] ?? 'unknown'));
            }
        }
        // Intentar obtener token en múltiples estructuras
        $paths = [
            ['token'], ['access_token'], ['jwt'], ['id_token'], ['accessToken'],
            ['data','token'], ['data','access_token'], ['data','jwt'], ['data','id_token'], ['data','accessToken'],
            ['result','token'], ['result','access_token'],
        ];
        $token = '';
        foreach ($paths as $p) {
            $val = $resp;
            foreach ($p as $k) { if (is_array($val) && array_key_exists($k, $val)) { $val = $val[$k]; } else { $val = null; break; } }
            if (is_string($val) && strlen($val) > 10) { $token = $val; break; }
        }
        // Buscar en headers Authorization: Bearer ...
        if (!$token && isset($resp['headers']) && is_array($resp['headers'])) {
            $auth = $resp['headers']['authorization'] ?? $resp['headers']['www-authenticate'] ?? '';
            if (is_string($auth) && stripos($auth, 'Bearer ') !== false) {
                $maybe = trim(substr($auth, stripos($auth, 'Bearer ') + 7));
                if (strlen($maybe) > 10) { $token = $maybe; }
            }
        }
        if (!$token) {
            throw new Exception('Login Happier sin token.');
        }
        $ttlPaths = [ ['expires_in'], ['data','expires_in'], ['result','expires_in'] ];
        $ttl = 0;
        foreach ($ttlPaths as $p) {
            $val = $resp;
            foreach ($p as $k) { if (is_array($val) && array_key_exists($k, $val)) { $val = $val[$k]; } else { $val = null; break; } }
            if (is_numeric($val)) { $ttl = (int)$val; break; }
        }
        if ($ttl <= 0) { $ttl = 3600; }
        $expiresAt = $now + max(300, $ttl); // mínimo 5 minutos
        self::saveCache($token, $expiresAt);
        return $token;
    }

    /**
     * Realiza una request a Happier con Bearer automáticamente
     */
    public static function request(string $method, string $path, ?array $body = null, array $headers = []): array {
        $token = self::getToken();
        $client = self::client();
        $resp = $client->request($method, $path, $body, $token, $headers);
        // Si falla por 401, reintenta login una vez
        if (!($resp['success'] ?? false) && (($resp['status'] ?? 0) === 401)) {
            // renovar token
            @unlink(self::$cacheFile);
            $token = self::getToken();
            $resp = $client->request($method, $path, $body, $token, $headers);
        }
        return $resp;
    }

    /**
     * Ejemplo de método de datos (mock por ahora)
     */
    public static function getDashboardData(): array {
        try {
            return self::getMockData();
        } catch (Exception $e) {
            error_log('HappierService getDashboardData error: ' . $e->getMessage());
            return self::getMockData();
        }
    }

    private static function getMockData(): array {
        return [
            'user_name' => 'Usuario Demo',
            'stats' => [
                'total_bonos' => '1,250',
                'bonos_redeemed' => '45',
                'avg_campaign_value' => '$25.50',
                'conversion_rate' => '3.6%'
            ],
            'transactions' => [
                [ 'date' => '2024-01-15', 'type' => 'Canje', 'description' => 'Bono Navidad', 'amount' => -50, 'class' => 'negative' ],
                [ 'date' => '2024-01-10', 'type' => 'Asignación', 'description' => 'Puntos por productividad', 'amount' => 100, 'class' => 'positive' ]
            ]
        ];
    }
}
?>