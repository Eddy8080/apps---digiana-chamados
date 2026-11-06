import EventSource from 'react-native-sse';
import * as Notifications from 'expo-notifications';
import { API_BASE_URL, getAccessToken } from './api';

export interface SSEEventData {
  tipo: string;
  chamado_id?: number;
  resposta_id?: number;
  titulo?: string;
  corpo?: string;
  status?: string;
  autor?: string;
  timestamp?: string;
}

type SSEListener = (event: string, data: SSEEventData) => void;

class SSEManager {
  private es: EventSource | null = null;
  private listeners: Set<SSEListener> = new Set();
  private isConnecting: boolean = false;
  private reconnectTimeout: any = null;

  addListener(listener: SSEListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(event: string, data: SSEEventData) {
    this.listeners.forEach(cb => {
      try {
        cb(event, data);
      } catch (err) {
        console.warn('[SSE] Erro no listener callback:', err);
      }
    });
  }

  async start() {
    if (this.es || this.isConnecting) return;
    this.isConnecting = true;

    try {
      const token = await getAccessToken();
      if (!token) {
        this.isConnecting = false;
        return;
      }

      // Conexão via query param ?token= e header Authorization para máxima compatibilidade
      const sseUrl = `${API_BASE_URL}/eventos/sse/?token=${encodeURIComponent(token)}`;
      console.log('[SSE] Iniciando conexão em tempo real...');

      const es = new EventSource(sseUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      this.es = es;
      this.isConnecting = false;

      es.addEventListener('open', () => {
        console.log('[SSE] ✅ Conexão SSE estabelecida com sucesso!');
      });

      es.addEventListener('conectado' as any, (event: any) => {
        console.log('[SSE] Handshake do servidor:', event.data);
      });

      // Eventos de Chamados
      const eventTypes = [
        'chamado_atualizado',
        'novo_chamado',
        'chamado_atribuido',
        'nova_resposta',
        'chamado_reaberto',
      ];

      eventTypes.forEach(eventType => {
        es.addEventListener(eventType as any, async (event: any) => {
          try {
            const data: SSEEventData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            console.log(`[SSE] 🔔 Evento recebido [${eventType}]:`, data);

            // 1. Notifica a UI in-app (para atualizar telas abertas)
            this.notifyListeners(eventType, data);

            // 2. Dispara notificação local nativa com som e banner
            const title = data.titulo || 'Atualização em Chamados';
            const body = data.corpo || 'Um chamado foi atualizado.';

            await Notifications.scheduleNotificationAsync({
              content: {
                title,
                body,
                sound: 'default',
                badge: 1,
                data: {
                  chamadoId: data.chamado_id,
                  tipo: data.tipo,
                },
              },
              trigger: null, // dispara imediatamente
            });
          } catch (err) {
            console.warn(`[SSE] Erro ao processar evento [${eventType}]:`, err);
          }
        });
      });

      es.addEventListener('error', (event: any) => {
        console.warn('[SSE] Evento de erro ou desconexão:', event?.message || event);
      });
    } catch (e) {
      console.warn('[SSE] Falha ao iniciar SSE:', e);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.start();
    }, 5000);
  }

  stop() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.es) {
      console.log('[SSE] Encerrando conexão SSE...');
      this.es.close();
      this.es = null;
    }
    this.isConnecting = false;
  }
}

export const sseManager = new SSEManager();
