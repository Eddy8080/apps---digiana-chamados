import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Resolução inteligente da URL base da API
// Em produção / APK Release oficial: conecta à API da Digiana na Oracle Cloud.
// Em desenvolvimento / testes: conecta ao container Docker local (192.168.1.12:8009 acessível via Wi-Fi e emulador).
const getDefaultBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (!__DEV__) {
    return 'https://chamados.digianaapp.com.br/api/v1';
  }
  return 'http://192.168.1.12:8009/api/v1';
};

export const API_BASE_URL = getDefaultBaseUrl();

const ACCESS_TOKEN_KEY = 'digiana_access_token';
const REFRESH_TOKEN_KEY = 'digiana_refresh_token';
const USER_KEY = 'digiana_user_data';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  nome_completo: string;
  role: string;
  role_display: string;
  user_role: 'admin' | 'gestor' | 'dev' | 'usuario';
  must_change_password: boolean;
  cliente_id?: number | null;
  foto_url?: string | null;
}

// ── Funções de Armazenamento Seguro de Tokens ────────────────────────────────
export async function saveTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
}

export async function getAccessToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function saveUserData(user: UserProfile) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getStoredUser(): Promise<UserProfile | null> {
  const json = await SecureStore.getItemAsync(USER_KEY);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function clearAuthStorage() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

// ── Cliente HTTP com Interceptor e Renovação Automática de Token ────────────
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  let token = await getAccessToken();

  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response = await fetch(url, { ...options, headers });

  // Se o token expirou (401), tenta refresh transparente
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const newAccess = refreshData.access;
          await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccess);

          // Reexecuta a requisição original com o novo token
          headers.set('Authorization', `Bearer ${newAccess}`);
          response = await fetch(url, { ...options, headers });
        } else {
          // Refresh expirado -> desloga
          await clearAuthStorage();
        }
      } catch {
        await clearAuthStorage();
      }
    } else {
      await clearAuthStorage();
    }
  }

  return response;
}

// ── Métodos de Autenticação ─────────────────────────────────────────────────
export async function login(username: string, password: string): Promise<{ user: UserProfile; mustChangePassword: boolean }> {
  const response = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Usuário ou senha incorretos.');
  }

  const data = await response.json();
  await saveTokens(data.access, data.refresh);
  await saveUserData(data.user);

  return {
    user: data.user,
    mustChangePassword: data.user.must_change_password || false,
  };
}

export async function logout(): Promise<void> {
  await clearAuthStorage();
}

// ── Registro de Push Tokens ─────────────────────────────────────────────────
export async function registerPushDevice(expoToken: string, appVersion?: string) {
  try {
    await apiFetch('/devices/register/', {
      method: 'POST',
      body: JSON.stringify({
        expo_push_token: expoToken,
        plataforma: Platform.OS,
        versao_app: appVersion || '1.0.0',
      }),
    });
  } catch (e) {
    console.warn('[API] Falha ao registrar token push:', e);
  }
}

export async function unregisterPushDevice(expoToken: string) {
  try {
    await apiFetch('/devices/unregister/', {
      method: 'POST',
      body: JSON.stringify({ expo_push_token: expoToken }),
    });
  } catch (e) {
    console.warn('[API] Falha ao desvincular token push:', e);
  }
}
