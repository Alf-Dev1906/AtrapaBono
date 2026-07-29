<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once '../controller.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);
$email = trim($data['email'] ?? '');

if (empty($email)) {
    echo json_encode(['success' => false, 'message' => 'Por favor ingresa tu correo electrónico']);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'message' => 'El correo electrónico no es válido']);
    exit();
}

try {
    $conn = get_db_connection();
    
    // Verificar si el email existe en la base de datos
    $stmt = $conn->prepare("SELECT id, nombre, email FROM account_requests WHERE email = ? AND status = 'approved' LIMIT 1");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    
    if (!$user) {
        // Por seguridad, no revelar si el email existe o no
        echo json_encode([
            'success' => true, 
            'message' => 'Si el correo electrónico está registrado, recibirás instrucciones para restablecer tu contraseña.'
        ]);
        exit();
    }
    
    // Generar token de recuperación
    $token = bin2hex(random_bytes(32));
    $token_expiry = date('Y-m-d H:i:s', strtotime('+1 hour')); // Token válido por 1 hora
    
    // Guardar token en la base de datos
    $stmt = $conn->prepare("UPDATE account_requests SET reset_token = ?, reset_token_expiry = ? WHERE id = ?");
    $stmt->bind_param('ssi', $token, $token_expiry, $user['id']);
    
    if (!$stmt->execute()) {
        throw new Exception('Error al generar el token de recuperación');
    }
    
    // Crear enlace de recuperación
    $reset_link = "https://beneficios.happier.com.ar/atrapabono/login#reset-password?token=" . $token;
    
    // Aquí deberías enviar el correo electrónico
    // Por ahora, solo simulamos el envío
    
    // Para desarrollo, puedes guardar el token en un log
    error_log("Reset password token for {$email}: {$token}");
    error_log("Reset link: {$reset_link}");
    
    // TODO: Integrar con servicio de email (SendGrid, Mailgun, etc.)
    /*
    $subject = "Recuperación de Contraseña - AtrapaBono";
    $message = "
        <h2>Recuperación de Contraseña</h2>
        <p>Hola {$user['nombre']},</p>
        <p>Hemos recibido una solicitud para restablecer tu contraseña. Si no realizaste esta solicitud, ignora este correo.</p>
        <p>Para restablecer tu contraseña, haz clic en el siguiente enlace:</p>
        <p><a href='{$reset_link}'>{$reset_link}</a></p>
        <p>Este enlace expirará en 1 hora.</p>
        <p>Saludos,<br>El equipo de AtrapaBono</p>
    ";
    
    // Enviar email
    send_email($email, $subject, $message);
    */
    
    echo json_encode([
        'success' => true,
        'message' => 'Te hemos enviado un correo con instrucciones para restablecer tu contraseña. Por favor revisa tu bandeja de entrada.',
        // Solo para desarrollo - eliminar en producción
        'debug' => [
            'token' => $token,
            'link' => $reset_link
        ]
    ]);
    
} catch (Exception $e) {
    error_log("Error en forgot_password.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Error al procesar la solicitud. Por favor intenta nuevamente.'
    ]);
}
?>
