<?php
declare(strict_types=1);
$CFG = require __DIR__ . '/config.php';
allow_cors($CFG);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/happier_service.php';
require_once __DIR__ . '/happier_client.php';

try {
  // Debug mode to inspect login response structure safely
  $debug = isset($_GET['debug']) && $_GET['debug'] === '1';
  if ($debug) {
    $client = new HappierClient(
      $CFG['HAPPIER_API_URL'] ?? '',
      $CFG['HAPPIER_USER'] ?? '',
      $CFG['HAPPIER_PASS'] ?? '',
      (bool)($CFG['SSL_VERIFY'] ?? true),
      (string)($CFG['CA_BUNDLE'] ?? '')
    );
    $path = isset($_GET['path']) ? trim((string)$_GET['path']) : 'login';
    $useForm = isset($_GET['form']) && $_GET['form'] === '1';
    $headers = ['Accept: application/json'];
    if ($useForm) { $headers[] = 'Content-Type: application/x-www-form-urlencoded'; }
    $body = [
      // probar con las claves más comunes
      $useForm ? 'email' : 'email' => $CFG['HAPPIER_USER'] ?? '',
      'password' => $CFG['HAPPIER_PASS'] ?? ''
    ];
    $resp = $client->request('POST', $path, $body, null, $headers, true);
    // Sanitize potentially sensitive fields
    $raw = $resp['raw'] ?? json_encode($resp, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
    $preview = is_string($raw) ? substr($raw, 0, 600) : '';
    // Hide long token-like strings
    $preview = preg_replace('/(Bearer\s+[A-Za-z0-9\-_.]+|"(?:token|access_token|jwt|id_token)"\s*:\s*"[^"]+")/i', '$1***', (string)$preview);
    $headersOut = $resp['headers'] ?? [];
    if (isset($headersOut['authorization'])) $headersOut['authorization'] = '***';
    if (isset($headersOut['set-cookie'])) $headersOut['set-cookie'] = '***';
    $keys = [];
    if (is_array($resp)) { $keys = array_keys($resp); }
    echo json_encode([
      'success' => ($resp['success'] ?? false),
      'status'  => ($resp['status'] ?? 0),
      'headers' => $headersOut,
      'keys'    => $keys,
      'body_preview' => $preview,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
  }

  $cachePath = __DIR__ . '/.happier_token.json';
  $cachedBefore = is_file($cachePath);
  // Forzar obtención/validación de token
  $token = HappierService::getToken();
  $cache = [];
  if (is_file($cachePath)) {
    $cache = json_decode((string)file_get_contents($cachePath), true) ?: [];
  }
  $expiresAt = isset($cache['expires_at']) ? (int)$cache['expires_at'] : null;
  $payload = [
    'success'    => true,
    'cached'     => $cachedBefore,
    'expires_at' => $expiresAt,
    'expires_in' => $expiresAt ? max(0, $expiresAt - time()) : null,
    'api'        => $CFG['HAPPIER_API_URL'] ?? null,
  ];
  echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode([
    'success' => false,
    'message' => $e->getMessage(),
  ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
