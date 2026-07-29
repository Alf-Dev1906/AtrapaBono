const TOKEN_KEY = 'atrapabono_auth_token';


function setAuthToken(token) {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        console.log("Token guardado con éxito.");
        return true;
    }
    return false;
}

function getAuthToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function clearAuthToken() {
    localStorage.removeItem(TOKEN_KEY);
    console.log("Sesión cerrada (Token eliminado).");
}

function isAuthenticated() {
    return !!getAuthToken();
}
