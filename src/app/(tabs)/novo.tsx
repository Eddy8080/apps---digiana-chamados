import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '@/services/api';

interface ProjetoOption {
  id: number;
  nome: string;
  cliente_nome: string;
  sistemas: { id: number; nome: string }[];
}

const PRIORIDADES = [
  { key: 'baixa', label: 'Baixa', color: '#64748b' },
  { key: 'media', label: 'Média', color: '#0284c7' },
  { key: 'alta', label: 'Alta', color: '#f59e0b' },
  { key: 'urgente', label: 'Urgente', color: '#ef4444' },
];

export default function NovoChamadoScreen() {
  const [projetos, setProjetos] = useState<ProjetoOption[]>([]);
  const [loadingProjetos, setLoadingProjetos] = useState(true);

  const [selectedProjetoId, setSelectedProjetoId] = useState<number | null>(null);
  const [selectedSistemaId, setSelectedSistemaId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState('media');
  const [imagens, setImagens] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadProjetos() {
      try {
        const res = await apiFetch('/projetos/');
        if (res.ok) {
          const data = await res.json();
          setProjetos(data);
          if (data.length > 0) {
            setSelectedProjetoId(data[0].id);
            if (data[0].sistemas && data[0].sistemas.length > 0) {
              setSelectedSistemaId(data[0].sistemas[0].id);
            }
          }
        }
      } catch (e) {
        console.warn('[NovoChamado] Erro ao carregar projetos:', e);
      } finally {
        setLoadingProjetos(false);
      }
    }
    loadProjetos();
  }, []);

  // Atualiza sistemas disponíveis ao trocar projeto
  const selectedProjeto = projetos.find((p) => p.id === selectedProjetoId);
  const sistemasDisponiveis = selectedProjeto?.sistemas || [];

  const handlePickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão Necessária', 'Precisamos de acesso às suas fotos para anexar imagens ao chamado.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets) {
      const uris = result.assets.map((a) => a.uri);
      setImagens((prev) => [...prev, ...uris]);
    }
  };

  const handlePickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão Necessária', 'Precisamos de acesso à câmera para fotografar o problema.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setImagens((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImagens((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!titulo.trim()) {
      Alert.alert('Campo Obrigatório', 'Informe o título do chamado.');
      return;
    }
    if (!descricao.trim()) {
      Alert.alert('Campo Obrigatório', 'Descreva o problema ou solicitação.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        prioridade,
      };
      if (selectedProjetoId) payload.projeto = selectedProjetoId;
      if (selectedSistemaId) payload.sistema = selectedSistemaId;

      const res = await apiFetch('/chamados/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Falha ao registrar chamado.');
      }

      const novoChamado = await res.json();

      // Se houver imagens anexadas, envia para a timeline do chamado
      if (imagens.length > 0) {
        for (const uri of imagens) {
          const formData = new FormData();
          const filename = uri.split('/').pop() || 'foto.jpg';
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';

          formData.append('conteudo', 'Anexo adicionado na abertura do chamado.');
          formData.append('arquivo', { uri, name: filename, type } as any);

          await apiFetch(`/chamados/${novoChamado.id}/respostas/`, {
            method: 'POST',
            body: formData,
          }).catch((e) => console.warn('[NovoChamado] Erro ao enviar anexo:', e));
        }
      }

      Alert.alert('Chamado Aberto!', `Chamado #${novoChamado.id} registrado com sucesso.`, [
        {
          text: 'Ver Chamado',
          onPress: () => {
            // Limpa formulário
            setTitulo('');
            setDescricao('');
            setImagens([]);
            router.push(`/chamado/${novoChamado.id}` as any);
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('Erro ao Salvar', e.message || 'Não foi possível registrar o chamado.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#030f14', '#06171e', '#09212a']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0}
          style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}>

            <Text style={styles.screenTitle}>Abrir Chamado</Text>
            <Text style={styles.screenSubtitle}>
              Preencha os dados abaixo para registrar sua solicitação no suporte Digiana.
            </Text>

            {/* Seleção de Projeto */}
            <View style={styles.section}>
              <Text style={styles.label}>Projeto Vinculado</Text>
              {loadingProjetos ? (
                <ActivityIndicator size="small" color="#2dd4bf" />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {projetos.map((p) => {
                    const isSelected = selectedProjetoId === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        onPress={() => {
                          setSelectedProjetoId(p.id);
                          if (p.sistemas && p.sistemas.length > 0) {
                            setSelectedSistemaId(p.sistemas[0].id);
                          } else {
                            setSelectedSistemaId(null);
                          }
                        }}
                        activeOpacity={0.75}>
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                          {p.nome}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Seleção de Sistema (se houver) */}
            {sistemasDisponiveis.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.label}>Módulo / Sistema</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                  {sistemasDisponiveis.map((s) => {
                    const isSelected = selectedSistemaId === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.chip, isSelected && styles.chipSelected]}
                        onPress={() => setSelectedSistemaId(s.id)}
                        activeOpacity={0.75}>
                        <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                          {s.nome}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Título do Chamado */}
            <View style={styles.section}>
              <Text style={styles.label}>Título do Chamado *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Erro ao emitir relatório de fechamento"
                placeholderTextColor="#64748b"
                value={titulo}
                onChangeText={setTitulo}
                cursorColor="#2dd4bf"
              />
            </View>

            {/* Prioridade */}
            <View style={styles.section}>
              <Text style={styles.label}>Nível de Prioridade</Text>
              <View style={styles.prioridadeRow}>
                {PRIORIDADES.map((p) => {
                  const isSelected = prioridade === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      style={[
                        styles.prioridadeBtn,
                        isSelected && { borderColor: p.color, backgroundColor: `${p.color}20` },
                      ]}
                      onPress={() => setPrioridade(p.key)}
                      activeOpacity={0.75}>
                      <View style={[styles.prioridadeDot, { backgroundColor: p.color }]} />
                      <Text
                        style={[
                          styles.prioridadeText,
                          isSelected && { color: p.color, fontWeight: '700' },
                        ]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Descrição Detalhada */}
            <View style={styles.section}>
              <Text style={styles.label}>Descrição Detalhada *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Explique detalhadamente o que ocorreu, passos para reproduzir ou a necessidade..."
                placeholderTextColor="#64748b"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                value={descricao}
                onChangeText={setDescricao}
                cursorColor="#2dd4bf"
              />
            </View>

            {/* Fotos e Evidências */}
            <View style={styles.section}>
              <Text style={styles.label}>Fotos ou Evidências</Text>
              <View style={styles.photoActionsRow}>
                <TouchableOpacity
                  style={styles.photoBtn}
                  onPress={handlePickFromCamera}
                  activeOpacity={0.75}>
                  <Ionicons name="camera-outline" size={20} color="#2dd4bf" />
                  <Text style={styles.photoBtnText}>Câmera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoBtn}
                  onPress={handlePickFromGallery}
                  activeOpacity={0.75}>
                  <Ionicons name="images-outline" size={20} color="#2dd4bf" />
                  <Text style={styles.photoBtnText}>Galeria</Text>
                </TouchableOpacity>
              </View>

              {/* Pré-visualização de fotos anexadas */}
              {imagens.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbsScroll}>
                  {imagens.map((uri, idx) => (
                    <View key={idx} style={styles.thumbWrapper}>
                      <Image source={{ uri }} style={styles.thumbImage} />
                      <TouchableOpacity
                        style={styles.thumbDeleteBtn}
                        onPress={() => handleRemoveImage(idx)}
                        hitSlop={8}>
                        <Ionicons name="close" size={14} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Botão de Envio */}
            <TouchableOpacity
              style={styles.submitBtnShadow}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}>
              <LinearGradient
                colors={['#0e6a79', '#148694', '#18a39e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}>
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <View style={styles.submitContent}>
                    <Ionicons name="send" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.submitText}>Registrar Chamado</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

          </ScrollView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 20,
    lineHeight: 18,
  },
  section: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 50,
    color: '#ffffff',
    fontSize: 14,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
    paddingBottom: 12,
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
    borderColor: '#2dd4bf',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  chipTextSelected: {
    color: '#2dd4bf',
    fontWeight: '700',
  },
  prioridadeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  prioridadeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 3,
  },
  prioridadeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  prioridadeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(45, 212, 191, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.25)',
  },
  photoBtnText: {
    color: '#2dd4bf',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  thumbsScroll: {
    marginTop: 6,
  },
  thumbWrapper: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbDeleteBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnShadow: {
    marginTop: 10,
    borderRadius: 14,
    shadowColor: '#18a39e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  submitGradient: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
