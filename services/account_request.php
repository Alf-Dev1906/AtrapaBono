<?php

header('Content-Type: application/json');
require_once 'db_connect.php';

$response = ['success' => false, 'message' => 'Solicitud no procesada.'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    $json_data = file_get_contents('php://input');
    $data = json_decode($json_data, true);
    
    $nombre = isset($data['nombre']) ? htmlspecialchars(trim($data['nombre']), ENT_QUOTES, 'UTF-8') : '';
    $email = isset($data['email']) ? filter_var(trim($data['email']), FILTER_SANITIZE_EMAIL) : '';
    $edad = isset($data['edad']) ? intval($data['edad']) : 0;
    $genero = isset($data['genero']) ? htmlspecialchars(trim($data['genero']), ENT_QUOTES, 'UTF-8') : '';
    $dni = isset($data['dni']) ? htmlspecialchars(trim($data['dni']), ENT_QUOTES, 'UTF-8') : '';
    $pais = isset($data['pais']) ? htmlspecialchars(trim($data['pais']), ENT_QUOTES, 'UTF-8') : '';
    $provincia = isset($data['provincia']) ? htmlspecialchars(trim($data['provincia']), ENT_QUOTES, 'UTF-8') : '';
    $telefono = isset($data['telefono']) ? htmlspecialchars(trim($data['telefono']), ENT_QUOTES, 'UTF-8') : '';
    
    if (empty($nombre) || empty($email) || empty($edad) || empty($genero) || empty($dni) || empty($pais) || empty($provincia) || empty($telefono)) {
        $response = ['success' => false, 'message' => 'Todos los campos son obligatorios.'];
    } else if ($edad < 18) {
        $response = ['success' => false, 'message' => 'Debes ser mayor de 18 años.'];
    } else if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $response = ['success' => false, 'message' => 'El email no tiene un formato válido.'];
    } else {
        
        $checkStmt = $conn->prepare("SELECT id FROM account_requests WHERE email = ? LIMIT 1");
        $checkStmt->bind_param("s", $email);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        
        if ($result->num_rows > 0) {
            $response = ['success' => false, 'message' => 'Ya existe una solicitud con este email. No puedes enviar solicitudes duplicadas.'];
            $checkStmt->close();
        } else {
            $checkStmt->close();
        
        try {
            $stmt = $conn->prepare("INSERT INTO account_requests (nombre, email, edad, genero, dni, pais, provincia, telefono, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')");
            $stmt->bind_param("ssisssss", $nombre, $email, $edad, $genero, $dni, $pais, $provincia, $telefono);
            
            if ($stmt->execute()) {
                $response = [
                    'success' => true, 
                    'message' => 'Solicitud enviada correctamente. Te contactaremos para activar tu cuenta.'
                ];
            } else {
                $response = ['success' => false, 'message' => 'Error al procesar la solicitud.'];
            }
            $stmt->close();
            
        } catch (Exception $e) {
            error_log("Error en account_request: " . $e->getMessage());
            $response = ['success' => false, 'message' => 'Error interno del servidor.'];
        }
        }
    }
} else {
    $response = ['success' => false, 'message' => 'Método no permitido.'];
}

echo json_encode($response);

if (isset($conn) && $conn) {
    $conn->close();
}
?>