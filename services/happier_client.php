<?php
declare(strict_types=1);
class HappierClient {
  private string $base;
  private string $user;
  private string $pass;
  private bool $sslVerify = true;
  private string $caBundle = '';
  public function __construct(string $base, string $user, string $pass, bool $sslVerify = true, string $caBundle = '') {
    $this->base = rtrim($base, '/').'/';
    $this->user = $user;
    $this->pass = $pass;
    $this->sslVerify = $sslVerify;
    $this->caBundle = $caBundle;
  }
  public function login(): array {
    return $this->request('POST', 'login', ['email'=>$this->user,'password'=>$this->pass], null, ['Accept: application/json'], true);
  }
  public function request(string $method, string $path, ?array $body, ?string $token, array $headers = [], bool $captureHeaders = false): array {
    $url = $this->base . ltrim($path, '/');
    $ch = curl_init($url);
    $h = $headers;
    $hasContentType = false;
    foreach ($h as $hdr) { if (stripos($hdr, 'Content-Type:') === 0) { $hasContentType = true; break; } }
    if (!$hasContentType) { $h[] = 'Content-Type: application/json'; }
    if ($token) $h[] = 'Authorization: Bearer '.$token;
    $opts = [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_CUSTOMREQUEST => strtoupper($method),
      CURLOPT_HTTPHEADER => $h,
      CURLOPT_TIMEOUT => 20,
      CURLOPT_SSL_VERIFYPEER => $this->sslVerify,
      CURLOPT_SSL_VERIFYHOST => $this->sslVerify ? 2 : 0,
      CURLOPT_FOLLOWLOCATION => true,
    ];
    $respHeaders = [];
    if ($captureHeaders) {
      $opts[CURLOPT_HEADER] = false;
      $opts[CURLOPT_HEADERFUNCTION] = function($curl, $header) use (&$respHeaders) {
        $len = strlen($header);
        $line = trim($header);
        if ($line === '') return $len;
        if (stripos($line, 'HTTP/') === 0) { $respHeaders = []; return $len; }
        $pos = strpos($line, ':');
        if ($pos !== false) {
          $name = strtolower(trim(substr($line, 0, $pos)));
          $value = trim(substr($line, $pos + 1));
          $respHeaders[$name] = $value;
        }
        return $len;
      };
    }
    $ca = $this->caBundle;
    if (!$ca) {
      $envCa = getenv('CURL_CA_BUNDLE') ?: '';
      if ($envCa && @is_file($envCa)) { $ca = $envCa; }
    }
    if (!$ca) {
      $guesses = [
        'C:\\laragon\\bin\\cacert\\cacert.pem',
        'C:\\laragon\\etc\\ssl\\cacert.pem',
        'C:\\cacert\\cacert.pem',
        'D:\\Projects\\Laragon-installer\\8.0-W64\\etc\\ssl\\cacert.pem',
        __DIR__ . DIRECTORY_SEPARATOR . 'cacert.pem',
        '/etc/ssl/certs/ca-bundle.crt',
        '/etc/ssl/certs/ca-certificates.crt',
      ];
      foreach ($guesses as $g) { if ($g && @is_file($g)) { $ca = $g; break; } }
    }
    if ($ca && @is_file($ca)) { $opts[CURLOPT_CAINFO] = $ca; }
    curl_setopt_array($ch, $opts);
    if ($body !== null) {
      $isForm = false;
      foreach ($h as $header) {
        if (stripos($header, 'Content-Type:') === 0 && stripos($header, 'application/x-www-form-urlencoded') !== false) {
          $isForm = true; break;
        }
      }
      if ($isForm) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($body, '', '&'));
      } else {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES));
      }
    }
    $resp = curl_exec($ch);
    $err = curl_error($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($resp === false) {
      return ['success'=>false,'status'=>$status ?: 0,'message'=>$err ?: 'request_error'];
    }
    $data = json_decode($resp, true);
    if (!is_array($data)) {
      $result = ['success'=>false,'status'=>$status,'message'=>'invalid_json','raw'=>$resp];
      if ($captureHeaders) $result['headers'] = $respHeaders;
      return $result;
    }
    $ok = ($status >= 200 && $status < 300);
    if ($ok && !isset($data['success'])) $data['success'] = true;
    $out = $ok ? $data : ['success'=>false,'status'=>$status,'message'=>($data['message'] ?? 'http_error'),'data'=>$data];
    if ($captureHeaders) $out['headers'] = $respHeaders;
    return $out;
  }
}
