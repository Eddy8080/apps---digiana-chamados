import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '@/services/api';
import { useAuth } from '@/contexts/auth';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';

interface AnexoItem {
  id: number;
  nome_original: string;
  url: string;
  criado_por_nome: string;
}

interface RespostaItem {
  id: number;
  autor: { id: number; username: string; nome_completo: string };
  conteudo: string;
  criado_em: string;
  anexos?: AnexoItem[];
}

interface ChamadoDetail {
  id: number;
  titulo: string;
  descricao: string;
  status: string;
  status_display: string;
  prioridade: string;
  prioridade_display: string;
  projeto_info?: { id: number; nome: string };
  sistema_info?: { id: number; nome: string };
  criado_por_info?: { id: number; username: string; nome_completo: string };
  responsavel_info?: { id: number; username: string; nome_completo: string };
  tempo_em_aberto_horas?: number;
  reaberto_count: number;
  criado_em: string;
  fechado_em?: string;
  respostas: RespostaItem[];
  anexos: AnexoItem[];
}

export default function ChamadoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [chamado, setChamado] = useState<ChamadoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [novaResposta, setNovaResposta] = useState('');
  const [anexoFotoUri, setAnexoFotoUri] = useState<string | null>(null);
  const [sendingResposta, setSendingResposta] = useState(false);
  const [reopening, setReopening] = useState(false);

  const fetchChamado = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiFetch(`/chamados/${id}/`);
      if (res.ok) {
        const data = await res.json();
        setChamado(data);
      } else {
        Alert.alert('Erro', 'Não foi possível carregar o chamado.');
      }
    } catch (e) {
      console.warn('[ChamadoDetail] Erro ao buscar chamado:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchChamado();
  }, [fetchChamado]);

  const handlePickFoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      setAnexoFotoUri(result.assets[0].uri);
    }
  };

  const handleSendResposta = async () => {
    if (!novaResposta.trim() && !anexoFotoUri) {
      Alert.alert('Atenção', 'Digite uma mensagem ou anexe uma foto.');
      return;
    }

    setSendingResposta(true);
    try {
      const formData = new FormData();
      formData.append('conteudo', novaResposta.trim() || 'Evidência enviada via aplicativo.');

      if (anexoFotoUri) {
        const filename = anexoFotoUri.split('/').pop() || 'foto.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('arquivo', { uri: anexoFotoUri, name: filename, type } as any);
      }

      const res = await apiFetch(`/chamados/${id}/respostas/`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setNovaResposta('');
        setAnexoFotoUri(null);
        fetchChamado();
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Erro', err.detail || 'Não foi possível enviar a resposta.');
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Falha na conexão.');
    } finally {
      setSendingResposta(false);
    }
  };

  const handleReabrir = async () => {
    Alert.alert(
      'Reabrir Chamado',
      'Deseja reabrir este chamado para novo atendimento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar Reabertura',
          onPress: async () => {
            setReopening(true);
            try {
              const res = await apiFetch(`/chamados/${id}/reabrir/`, { method: 'POST' });
              if (res.ok) {
                Alert.alert('Sucesso', 'Chamado reaberto com sucesso!');
                fetchChamado();
              } else {
                const err = await res.json().catch(() => ({}));
                Alert.alert('Não Permitido', err.detail || 'Não foi possível reabrir.');
              }
            } catch (e: any) {
              Alert.alert('Erro', e.message || 'Falha ao reabrir.');
            } finally {
              setReopening(false);
            }
          },
        },
      ]
    );
  };

  const handleChangeStatus = (novoStatus: string) => {
    Alert.alert('Alterar Status', `Deseja mudar o status para "${novoStatus.replace('_', ' ')}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          try {
            const res = await apiFetch(`/chamados/${id}/`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: novoStatus }),
            });
            if (res.ok) {
              fetchChamado();
            } else {
              const err = await res.json().catch(() => ({}));
              Alert.alert('Erro', err.detail || 'Não permitido.');
            }
          } catch (e: any) {
            Alert.alert('Erro', e.message);
          }
        },
      },
    ]);
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2dd4bf" />
      </View>
    );
  }

  if (!chamado) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#ffffff' }}>Chamado não encontrado.</Text>
      </View>
    );
  }

  const isFinalizado = chamado.status === 'resolvido' || chamado.status === 'fechado';
  const isEquipeTecnica = user?.user_role === 'admin' || user?.user_role === 'gestor' || user?.user_role === 'dev';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#030f14', '#06171e', '#09212a']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Barra Superior com botão voltar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Chamado #{chamado.id}</Text>
          <StatusBadge status={chamado.status} statusDisplay={chamado.status_display} size="sm" />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Card Detalhes do Chamado */}
            <View style={styles.cardHeader}>
              <View style={styles.badgesLine}>
                <PriorityBadge prioridade={chamado.prioridade} prioridadeDisplay={chamado.prioridade_display} />
                {chamado.tempo_em_aberto_horas !== undefined && (
                  <View style={styles.timeBadge}>
                    <Ionicons name="time-outline" size={13} color="#94a3b8" />
                    <Text style={styles.timeText}>{chamado.tempo_em_aberto_horas}h decorridas</Text>
                  </View>
                )}
              </View>

              <Text style={styles.chamadoTitulo}>{chamado.titulo}</Text>

              {/* Informações de Vínculo */}
              <View style={styles.infoGrid}>
                <View style={styles.infoCol}>
                  <Text style={styles.infoColLabel}>Projeto / Sistema</Text>
                  <Text style={styles.infoColVal}>
                    {chamado.projeto_info?.nome || 'Geral'}
                    {chamado.sistema_info ? ` (${chamado.sistema_info.nome})` : ''}
                  </Text>
                </View>

                <View style={styles.infoCol}>
                  <Text style={styles.infoColLabel}>Aberto por</Text>
                  <Text style={styles.infoColVal}>
                    {chamado.criado_por_info?.nome_completo || chamado.criado_por_info?.username}
                  </Text>
                </View>
              </View>

              {/* Descrição Inicial */}
              <View style={styles.descBox}>
                <Text style={styles.descLabel}>Descrição:</Text>
                <Text style={styles.descText}>{chamado.descricao}</Text>
              </View>

              {/* Ações Rápidas de Gestão */}
              {isEquipeTecnica && !isFinalizado && (
                <View style={styles.manageRow}>
                  <Text style={styles.manageTitle}>Ação Rápida de Status:</Text>
                  <View style={styles.statusButtonsRow}>
                    {chamado.status !== 'em_progresso' && (
                      <TouchableOpacity
                        style={[styles.quickStatusBtn, { borderColor: '#f59e0b' }]}
                        onPress={() => handleChangeStatus('em_progresso')}>
                        <Text style={[styles.quickStatusText, { color: '#f59e0b' }]}>Em Progresso</Text>
                      </TouchableOpacity>
                    )}
                    {chamado.status !== 'resolvido' && (
                      <TouchableOpacity
                        style={[styles.quickStatusBtn, { borderColor: '#10b981' }]}
                        onPress={() => handleChangeStatus('resolvido')}>
                        <Text style={[styles.quickStatusText, { color: '#10b981' }]}>Resolver</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Botão de Reabertura se Finalizado */}
              {isFinalizado && (
                <TouchableOpacity
                  style={styles.reopenBtn}
                  onPress={handleReabrir}
                  disabled={reopening}
                  activeOpacity={0.8}>
                  {reopening ? (
                    <ActivityIndicator size="small" color="#f59e0b" />
                  ) : (
                    <View style={styles.reopenContent}>
                      <Ionicons name="reload" size={16} color="#f59e0b" />
                      <Text style={styles.reopenText}>Reabrir Chamado</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Linha do Tempo de Respostas / Chat */}
            <View style={styles.timelineSection}>
              <Text style={styles.timelineTitle}>
                Histórico & Respostas ({chamado.respostas?.length || 0})
              </Text>

              {chamado.respostas && chamado.respostas.length > 0 ? (
                chamado.respostas.map((r) => {
                  const isMe = r.autor?.id === user?.id;
                  return (
                    <View
                      key={r.id}
                      style={[
                        styles.msgCard,
                        isMe ? styles.msgCardMe : styles.msgCardOther,
                      ]}>
                      <View style={styles.msgHeader}>
                        <Text style={[styles.msgAuthor, isMe && { color: '#2dd4bf' }]}>
                          {isMe ? 'Você' : r.autor?.nome_completo || r.autor?.username}
                        </Text>
                        <Text style={styles.msgDate}>{formatDate(r.criado_em)}</Text>
                      </View>

                      <Text style={styles.msgContent}>{r.conteudo}</Text>

                      {/* Anexos da Resposta */}
                      {r.anexos && r.anexos.length > 0 && (
                        <View style={styles.msgAnexos}>
                          {r.anexos.map((anexo) => (
                            <View key={anexo.id} style={styles.anexoThumbCard}>
                              <Ionicons name="document-attach-outline" size={16} color="#2dd4bf" />
                              <Text style={styles.anexoName} numberOfLines={1}>
                                {anexo.nome_original}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyRespostas}>
                  <Ionicons name="chatbubbles-outline" size={28} color="#64748b" />
                  <Text style={styles.emptyRespostasText}>Nenhuma resposta ainda. Seja o primeiro a responder!</Text>
                </View>
              )}
            </View>

          </ScrollView>

          {/* Barra Fixa Inferior de Envio de Resposta */}
          <View style={styles.replyBar}>
            {anexoFotoUri && (
              <View style={styles.attachedPreview}>
                <Image source={{ uri: anexoFotoUri }} style={styles.attachedImg} />
                <Text style={styles.attachedText} numberOfLines={1}>Foto anexada</Text>
                <TouchableOpacity onPress={() => setAnexoFotoUri(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#f87171" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.replyInputRow}>
              <TouchableOpacity
                style={styles.attachBtn}
                onPress={handlePickFoto}
                activeOpacity={0.7}>
                <Ionicons name="camera-outline" size={22} color="#2dd4bf" />
              </TouchableOpacity>

              <TextInput
                style={styles.replyInput}
                placeholder="Escreva uma resposta..."
                placeholderTextColor="#64748b"
                value={novaResposta}
                onChangeText={setNovaResposta}
                cursorColor="#2dd4bf"
                multiline
              />

              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  (!novaResposta.trim() && !anexoFotoUri) && { opacity: 0.5 },
                ]}
                onPress={handleSendResposta}
                disabled={sendingResposta || (!novaResposta.trim() && !anexoFotoUri)}
                activeOpacity={0.8}>
                {sendingResposta ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="arrow-up" size={20} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030f14',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#030f14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backBtn: {
    padding: 6,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  cardHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  badgesLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 4,
  },
  chamadoTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 24,
    marginBottom: 14,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  infoCol: {
    flex: 1,
  },
  infoColLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  infoColVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
    marginTop: 2,
  },
  descBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  descLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  descText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 19,
  },
  manageRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
  },
  manageTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 8,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickStatusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  quickStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reopenBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reopenContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reopenText: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  timelineSection: {
    marginBottom: 10,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  msgCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  msgCardMe: {
    backgroundColor: 'rgba(45, 212, 191, 0.08)',
    borderColor: 'rgba(45, 212, 191, 0.2)',
    marginLeft: 20,
  },
  msgCardOther: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 20,
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  msgAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  msgDate: {
    fontSize: 11,
    color: '#64748b',
  },
  msgContent: {
    fontSize: 13,
    color: '#ffffff',
    lineHeight: 18,
  },
  msgAnexos: {
    marginTop: 8,
  },
  anexoThumbCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  anexoName: {
    color: '#2dd4bf',
    fontSize: 11,
    marginLeft: 4,
  },
  emptyRespostas: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyRespostasText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 6,
  },
  replyBar: {
    backgroundColor: '#07171e',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  attachedPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 6,
    marginBottom: 8,
  },
  attachedImg: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 8,
  },
  attachedText: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 12,
  },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachBtn: {
    padding: 8,
    marginRight: 6,
  },
  replyInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#18a39e',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
