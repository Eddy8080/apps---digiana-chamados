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
  Modal,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '@/services/api';
import { sseManager } from '@/services/sse';
import { useAuth } from '@/contexts/auth';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';

const KANBAN_STAGES = [
  { key: 'backlog', label: 'Backlog Geral', icon: 'albums-outline', color: '#94a3b8' },
  { key: 'sprint', label: 'Sprint Atual', icon: 'flash-outline', color: '#38bdf8' },
  { key: 'em_construcao', label: 'Em Construção', icon: 'construct-outline', color: '#fbbf24' },
  { key: 'homologacao', label: 'Homologação', icon: 'flask-outline', color: '#a78bfa' },
  { key: 'concluido', label: 'Concluído', icon: 'checkmark-circle-outline', color: '#34d399' },
];

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
  descricao_limpa?: string;
  status: string;
  status_display: string;
  prioridade: string;
  prioridade_display: string;
  projeto_info?: {
    id: number;
    nome: string;
    status_macro?: string;
    cliente_nome?: string;
  };
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

function stripHtml(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function isImageFile(filename?: string, mime?: string): boolean {
  if (mime && mime.toLowerCase().startsWith('image/')) return true;
  if (!filename) return false;
  return /\.(png|jpe?g|webp|gif|bmp|heic)$/i.test(filename);
}

function resolveMediaUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const base = 'https://chamados.digianaapp.com.br';
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

function renderFormattedContent(text: string) {
  const clean = stripHtml(text);
  if (!clean) return null;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = clean.split(urlRegex);

  return (
    <Text style={styles.msgContent}>
      {parts.map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <Text
              key={index}
              style={styles.msgLink}
              onPress={() => {
                Linking.openURL(part).catch(() => {
                  Alert.alert('Erro', 'Não foi possível abrir o link.');
                });
              }}>
              {part}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
}

export default function ChamadoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [chamado, setChamado] = useState<ChamadoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [novaResposta, setNovaResposta] = useState('');
  const [anexoFotoUri, setAnexoFotoUri] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<{ url: string; nome: string } | null>(null);
  const [sendingResposta, setSendingResposta] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [updatingKanban, setUpdatingKanban] = useState(false);

  const canEditKanban = user && ['admin', 'gestor', 'dev'].includes(user.user_role);

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

    // Ouvinte em tempo real via SSE: quando este chamado for atualizado no servidor, recarrega os dados instantaneamente
    const unsubscribe = sseManager.addListener((event, data) => {
      if (data.chamado_id && String(data.chamado_id) === String(id)) {
        console.log('[ChamadoDetail] ⚡ Atualização em tempo real recebida via SSE, recarregando...');
        fetchChamado();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchChamado, id]);

  const handleUpdateKanban = async (newStageKey: string) => {
    if (!id || updatingKanban || !chamado?.projeto_info) return;

    const previousStage = chamado.projeto_info.status_macro;
    // Otimista na UI
    setChamado(prev => {
      if (!prev || !prev.projeto_info) return prev;
      return {
        ...prev,
        projeto_info: {
          ...prev.projeto_info,
          status_macro: newStageKey,
        },
      };
    });

    setUpdatingKanban(true);
    try {
      const res = await apiFetch(`/chamados/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projeto_status_macro: newStageKey }),
      });

      if (res.ok) {
        const updatedData = await res.json();
        setChamado(updatedData);
        const stageObj = KANBAN_STAGES.find(s => s.key === newStageKey);
        Alert.alert('Kanban Atualizado', `Projeto movido para: "${stageObj?.label || newStageKey}"`);
      } else {
        // Rollback
        setChamado(prev => {
          if (!prev || !prev.projeto_info) return prev;
          return {
            ...prev,
            projeto_info: {
              ...prev.projeto_info,
              status_macro: previousStage,
            },
          };
        });
        const err = await res.json().catch(() => ({}));
        Alert.alert('Erro', err.detail || 'Não foi possível atualizar a coluna no Kanban.');
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Falha de conexão ao atualizar o Kanban.');
    } finally {
      setUpdatingKanban(false);
    }
  };

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

              {/* Card de Gestão de Kanban do Projeto */}
              {chamado.projeto_info && (
                <View style={styles.kanbanCard}>
                  <View style={styles.kanbanHeader}>
                    <View style={styles.kanbanTitleRow}>
                      <Ionicons name="grid-outline" size={15} color="#38bdf8" />
                      <Text style={styles.kanbanTitle} numberOfLines={1}>
                        Kanban: {chamado.projeto_info.nome}
                      </Text>
                    </View>
                    {updatingKanban && <ActivityIndicator size="small" color="#38bdf8" />}
                  </View>

                  {chamado.projeto_info.cliente_nome && (
                    <Text style={styles.kanbanCliente}>
                      Cliente: {chamado.projeto_info.cliente_nome}
                    </Text>
                  )}

                  <Text style={styles.kanbanHelperText}>
                    {canEditKanban
                      ? 'Toque para mover o projeto no Kanban:'
                      : 'Posição do projeto no Kanban:'}
                  </Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.kanbanPillsContainer}>
                    {KANBAN_STAGES.map(stage => {
                      const isCurrent = (chamado.projeto_info?.status_macro || 'backlog') === stage.key;
                      return (
                        <TouchableOpacity
                          key={stage.key}
                          disabled={!canEditKanban || updatingKanban || isCurrent}
                          onPress={() => handleUpdateKanban(stage.key)}
                          activeOpacity={0.7}
                          style={[
                            styles.kanbanPill,
                            isCurrent && {
                              backgroundColor: `${stage.color}22`,
                              borderColor: stage.color,
                              borderWidth: 1.5,
                            },
                          ]}>
                          <Ionicons
                            name={stage.icon as any}
                            size={13}
                            color={isCurrent ? stage.color : '#64748b'}
                          />
                          <Text
                            style={[
                              styles.kanbanPillText,
                              isCurrent && { color: stage.color, fontWeight: '700' },
                            ]}>
                            {stage.label}
                          </Text>
                          {isCurrent && (
                            <View style={[styles.activeDot, { backgroundColor: stage.color }]} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Descrição Inicial */}
              <View style={styles.descBox}>
                <Text style={styles.descLabel}>Descrição:</Text>
                <Text style={styles.descText}>{chamado.descricao_limpa || stripHtml(chamado.descricao)}</Text>
              </View>

              {/* Anexos e Evidências do Chamado */}
              {chamado.anexos && chamado.anexos.length > 0 && (
                <View style={styles.anexosContainer}>
                  <View style={styles.anexosHeader}>
                    <Ionicons name="images-outline" size={15} color="#2dd4bf" />
                    <Text style={styles.anexosTitle}>
                      Evidências & Anexos ({chamado.anexos.length})
                    </Text>
                  </View>
                  <View style={styles.anexosGrid}>
                    {chamado.anexos.map((anexo) => {
                      const fullUrl = resolveMediaUrl(anexo.url);
                      const isImg = isImageFile(anexo.nome_original, (anexo as any).tipo_mime);
                      return isImg ? (
                        <TouchableOpacity
                          key={anexo.id}
                          style={styles.imgCard}
                          onPress={() => setSelectedImage({ url: fullUrl, nome: anexo.nome_original })}
                          activeOpacity={0.85}>
                          <Image source={{ uri: fullUrl }} style={styles.imgThumbnail} resizeMode="cover" />
                          <View style={styles.imgOverlay}>
                            <Ionicons name="expand-outline" size={16} color="#ffffff" />
                          </View>
                          <Text style={styles.imgCaption} numberOfLines={1}>
                            {anexo.nome_original}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View key={anexo.id} style={styles.docCard}>
                          <Ionicons name="document-attach-outline" size={18} color="#2dd4bf" />
                          <Text style={styles.docName} numberOfLines={1}>{anexo.nome_original}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

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

                      {renderFormattedContent(r.conteudo)}

                      {/* Anexos da Resposta */}
                      {r.anexos && r.anexos.length > 0 && (
                        <View style={styles.msgAnexos}>
                          {r.anexos.map((anexo) => {
                            const fullUrl = resolveMediaUrl(anexo.url);
                            const isImg = isImageFile(anexo.nome_original, (anexo as any).tipo_mime);
                            return isImg ? (
                              <TouchableOpacity
                                key={anexo.id}
                                style={styles.msgImgThumb}
                                onPress={() => setSelectedImage({ url: fullUrl, nome: anexo.nome_original })}
                                activeOpacity={0.85}>
                                <Image source={{ uri: fullUrl }} style={styles.msgImg} resizeMode="cover" />
                                <View style={styles.msgImgOverlay}>
                                  <Ionicons name="expand-outline" size={13} color="#ffffff" />
                                </View>
                              </TouchableOpacity>
                            ) : (
                              <View key={anexo.id} style={styles.anexoThumbCard}>
                                <Ionicons name="document-attach-outline" size={16} color="#2dd4bf" />
                                <Text style={styles.anexoName} numberOfLines={1}>
                                  {anexo.nome_original}
                                </Text>
                              </View>
                            );
                          })}
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

      {/* Lightbox Modal para Visualização em Alta Resolução */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.lightboxBackdrop}>
          <SafeAreaView style={styles.lightboxSafeArea}>
            <View style={styles.lightboxHeader}>
              <Text style={styles.lightboxTitle} numberOfLines={1}>
                {selectedImage?.nome || 'Evidência'}
              </Text>
              <TouchableOpacity
                style={styles.lightboxCloseBtn}
                onPress={() => setSelectedImage(null)}
                hitSlop={12}>
                <Ionicons name="close-circle" size={28} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View style={styles.lightboxImageContainer}>
              {selectedImage && (
                <Image
                  source={{ uri: selectedImage.url }}
                  style={styles.lightboxImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
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
  msgLink: {
    color: '#2dd4bf',
    textDecorationLine: 'underline',
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
  // Anexos do Chamado (Cards & Grid)
  anexosContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  anexosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  anexosTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2dd4bf',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  anexosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  imgCard: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.3)',
    position: 'relative',
  },
  imgThumbnail: {
    width: '100%',
    height: '100%',
  },
  imgOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    padding: 3,
  },
  imgCaption: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    color: '#ffffff',
    fontSize: 9,
    paddingHorizontal: 4,
    paddingVertical: 2,
    textAlign: 'center',
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: '100%',
    gap: 6,
  },
  docName: {
    color: '#94a3b8',
    fontSize: 12,
    flexShrink: 1,
  },
  // Anexos em Respostas
  msgImgThumb: {
    width: 90,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.3)',
    position: 'relative',
  },
  msgImg: {
    width: '100%',
    height: '100%',
  },
  msgImgOverlay: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    padding: 2,
  },
  // Lightbox Modal
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 15, 20, 0.96)',
    justifyContent: 'center',
  },
  lightboxSafeArea: {
    flex: 1,
  },
  lightboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  lightboxTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  lightboxCloseBtn: {
    padding: 4,
  },
  lightboxImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
  // Card do Projeto no Kanban
  kanbanCard: {
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    padding: 12,
    marginBottom: 16,
  },
  kanbanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  kanbanTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  kanbanTitle: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  kanbanCliente: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 6,
  },
  kanbanHelperText: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 8,
  },
  kanbanPillsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  kanbanPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0a222c',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  kanbanPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 2,
  },
});
