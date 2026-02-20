// js/comet-auth.js

const AUTH_TOKEN_KEY = 'comet_auth_token';

/**
 * Checks if the user is currently logged in.
 * @returns {boolean} True if a token exists in localStorage.
 */
export function isLoggedIn() {
    return !!localStorage.getItem(AUTH_TOKEN_KEY);
}

/**
 * Logs the user in.
 * In a real application, this would validate credentials with a server.
 * For this implementation, it accepts any non-empty email and password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<boolean>} Resolves to true if login successful, false otherwise.
 */
export async function login(email, password) {
    return new Promise((resolve) => {
        // Simulate network delay
        setTimeout(() => {
            if (email && password) {
                // Generate a dummy token
                const token = btoa(`${email}:${Date.now()}`);
                localStorage.setItem(AUTH_TOKEN_KEY, token);
                resolve(true);
            } else {
                resolve(false);
            }
        }, 500);
    });
}

/**
 * Logs the user out.
 * Clears the token from localStorage.
 */
export function logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
}

/**
 * Gets the current user's email (decoded from dummy token) if available.
 * @returns {string|null} The email or null if not logged in.
 */
export function getUserEmail() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return null;
    try {
        const decoded = atob(token);
        return decoded.split(':')[0];
    } catch (e) {
        return null;
    }
}
