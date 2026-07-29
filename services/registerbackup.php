<?php
/**
 * services/register.php
 * * Endpoint de la API para registrar un nuevo usuario.
 * Recibe name, email, password y password_confirm.
 * Valida que las contraseñas coincidan antes de pasarlas al AppController.
 */

// 1. Configuración de la respuesta
header('Content-Type: application/json');

// Incluir la conexión a la DB. Asume que db_connect.php genera $conn.
require_once 'db_connect.php'; 

// Incluir el controlador central 
// La ruta es ../controller.php porque register.php está dentro de la carpeta services/
require_once '../controller.php'; 

// Inicializar la respuesta
$response = ['success' => false, 'message' => 'Petición no procesada.'];

// 2. Procesar solo peticiones POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    // Obtener datos JSON del cuerpo de la petición (necesario para fetch en JS)
    $json_data = file_get_contents('php://input');
    $data = json_decode($json_data, true);
    
    // Validar y sanear la entrada
    $name = isset($data['name']) ? filter_var(trim($data['name']), FILTER_SANITIZE_STRING) : '';
    $email = isset($data['email']) ? filter_var(trim($data['email']), FILTER_SANITIZE_EMAIL) : '';
    $password = isset($data['password']) ? $data['password'] : '';
    // ** CLAVE CRUCIAL: Asegurarse de que el JS envíe 'password_confirm' **
    $password_confirm = isset($data['password_confirm']) ? $data['password_confirm'] : '';

    // ¡Verificación de campos faltantes!
    if (empty($name) || empty($email) || empty($password) || empty($password_confirm)) {
        $response = ['success' => false, 'message' => 'Todos los campos son obligatorios.'];
    } 
    // ¡Verificación de coincidencia de contraseñas!
    else if ($password !== $password_confirm) {
        // Este es el error que estás viendo: Contraseñas no coinciden.
        $response = ['success' => false, 'message' => 'Las contraseñas ingresadas no coinciden.'];
    }
    else {
        
        if ($conn) {
            try {
                // 3. Ejecución del controlador (PASAMOS LA CONEXIÓN)
                $controller = new AppController($conn);
                
                // Llamar a la lógica de registro
                // NOTA: El controlador solo necesita la contraseña hash, no la confirmación
                $result = $controller->registerUser($name, $email, $password);

                if ($result['success']) {
                    $response = [
                        'success' => true,
                        'message' => 'Registro exitoso. Serás redirigido para iniciar sesión.',
                        'user' => $result['user']
                    ];
                } else {
                    // Fallo en el registro (ej: email duplicado)
                    $response = $result;
                }
            } catch (Exception $e) {
                error_log("Error en registro: " . $e->getMessage());
                $response = ['success' => false, 'message' => 'Error interno del servidor al registrar.'];
            }
        } else {
             // Error si la conexión a la DB falló en db_connect.php
            $response = ['success' => false, 'message' => 'Error de conexión a la base de datos.'];
        }
    }
} else {
    $response = ['success' => false, 'message' => 'Método no permitido. Utiliza POST.'];
}

// 4. Devolver respuesta
echo json_encode($response);

// 5. Cerrar la conexión si existe
if (isset($conn) && $conn) {
    $conn->close();
}
?>
