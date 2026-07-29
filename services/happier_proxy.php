<?php
declare(strict_types=1);
$CFG = require __DIR__ . '/config.php';
allow_cors($CFG);
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/happier_service.php';
require_once __DIR__ . '/db_connect.php';
require_once __DIR__ . '/../controller.php';

try {
  $tokenLocal = bearer();
  if (!$tokenLocal) {
    http_response_code(401);
    echo json_encode(['success'=>false,'message'=>'No autorizado']);
    exit;
  }
  $controller = new AppController($conn);
  $user = $controller->validateToken($tokenLocal);
  if (!$user) {
    http_response_code(401);
    echo json_encode(['success'=>false,'message'=>'Sesión inválida']);
    exit;
  }
  $allowed = [
    'me',
    'dashboard/summary'
  ];
  $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
  $path = isset($_GET['path']) ? trim((string)$_GET['path'], "/ ") : '';
  if ($path === '' || !in_array($path, $allowed, true)) {
    http_response_code(400);
    echo json_encode(['success'=>false,'message'=>'Ruta no permitida']);
    exit;
  }
  $query = $_GET;
  unset($query['path']);
  $qs = http_build_query($query);
  $finalPath = $path . ($qs ? ('?' . $qs) : '');
  $body = null;
  if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH') {
    $body = get_json();
  }
  $resp = HappierService::request($method, $finalPath, $body, ['Accept: application/json']);
  echo json_encode($resp, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
}
