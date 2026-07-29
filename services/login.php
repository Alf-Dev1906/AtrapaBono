<?php
/**
 * services/login.php
 * * Endpoint de la API para iniciar sesión.
 * Recibe email y password, valida las credenciales y, si son correctas,
 * devuelve un token de sesión para ser guardado por el cliente.
 */

// 1. Configuración de la respuesta
header('Content-Type: application/json');

// Incluir la conexión a la DB. Se asume que db_connect.php genera $conn.
require_once 'db_connect.php'; 

// Incluir el controlador central 
// La ruta es ../controller.php porque login.php está dentro de la carpeta services/
require_once '../controller.php'; 

// Inicializar la respuesta
$response = ['success' => false, 'message' => 'Petición no procesada.'];

// 2. Procesar solo peticiones POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    // Obtener datos JSON del cuerpo de la petición (necesario para fetch en JS)
    $json_data = file_get_contents('php://input');
    $data = json_decode($json_data, true);
    
    // Validar y sanear la entrada
    // Se usa un operador ternario para asegurar que la clave existe antes de intentar sanearla
    $email = isset($data['email']) ? filter_var(trim($data['email']), FILTER_SANITIZE_EMAIL) : '';
    $password = isset($data['password']) ? $data['password'] : '';
    $only_email = isset($data['only_email']) && $data['only_email'] === true;

    // Verificación de campos faltantes
    if (empty($email)) {
        $response = ['success' => false, 'message' => 'El correo electrónico es requerido.'];
    } else if (empty($password) && !$only_email) {
        $response = ['success' => false, 'message' => 'La contraseña es requerida.'];
    } else {
        
        if ($conn) {
            try {
                // 3. Ejecución del controlador (PASAMOS LA CONEXIÓN)
                $controller = new AppController($conn);
                
                // Llamar a la lógica de login
                $result = $controller->loginUser($email, $password, $only_email);

                if ($result['success']) {
                    // Login exitoso, devuelve el token
                    $response = [
                        'success' => true,
                        'message' => 'Login exitoso.',
                        'token' => $result['token'], // Token para guardar en localStorage
                        'name' => $result['name'],
                        'needs_setup' => $result['needs_setup'] ?? false
                    ];
                } else {
                    // Fallo en credenciales
                    $response = $result;
                }
            } catch (Exception $e) {
                error_log("Error en login: " . $e->getMessage());
                // Mensaje genérico de error de servidor para el cliente
                $response = ['success' => false, 'message' => 'Error interno del servidor al procesar la solicitud.'];
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
