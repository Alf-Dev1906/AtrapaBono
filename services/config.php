<?php
declare(strict_types=1);
$CFG = [
  'HAPPIER_API_URL' => 'https://api.happier.com.ar/api/apicorporate/',
  'HAPPIER_USER' => getenv('HAPPIER_USER') ?: '',
  'HAPPIER_PASS' => getenv('HAPPIER_PASS') ?: '',
  'CORS_ORIGINS' => getenv('CORS_ORIGINS') ?: 'http://localhost,http://127.0.0.1',
  'SSL_VERIFY' => true,
  'CA_BUNDLE'  => '',
];
$localFile = __DIR__ . '/config.local.php';
if (is_file($localFile)) {
  $over = require $localFile;
  if (is_array($over)) $CFG = array_merge($CFG, $over);
}
if (!function_exists('allow_cors')) {
  function allow_cors(array $cfg): void {
    $reqMethod = $_SERVER['REQUEST_METHOD'] ?? '';
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    $allowed = [];
    if (!empty($cfg['CORS_ORIGINS'])) {
      foreach (explode(',', (string)$cfg['CORS_ORIGINS']) as $o) {
        $o = trim($o);
        if ($o !== '') $allowed[] = $o;
      }
    }
    $isAllowed = false;
    if ($origin) {
      $isAllowed = in_array($origin, $allowed, true);
      if ($isAllowed) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
      }
    }
    if ($reqMethod === 'OPTIONS') {
      http_response_code($isAllowed ? 204 : 403);
      exit;
    }
  }
}
if (!function_exists('get_json')) {
  function get_json(): array {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
  }
}
if (!function_exists('bearer')) {
  function bearer(): string {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!$h && function_exists('apache_request_headers')) {
      $headers = apache_request_headers();
      $h = $headers['Authorization'] ?? '';
    }
    if (stripos($h, 'Bearer ') === 0) return trim(substr($h, 7));
    return '';
  }
}
if (!function_exists('json_out')) {
  function json_out($payload, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
  }
}
return $CFG;
