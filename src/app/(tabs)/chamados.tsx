import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '@/services/api';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';

interface ChamadoItem {
  id: number;
  titulo: string;
  status: string;
  status_display: string;
  prioridade: string;
  prioridade_display: string;
  projeto_nome?: string;
  sistema_nome?: string;
  cliente_nome?: string;
  criado_por_nome?: string;
  responsavel_nome?: string;
  total_respostas: number;
  total_anexos: number;
  reaberto_count: number;
  criado_em: string;
  atualizado_em: string;
}

const STATUS_FILTERS = [
  { key: '', label: 'Todos' },
  { key: 'aberto', label: 'Abertos' },
  { key: 'em_progresso', label: 'Em Progresso' },
  { key: 'pendente', label: 'Pendentes' },
  { key: 'resolvido', label: 'Resolvidos' },
  { key: 'fechado', label: 'Fechados' },
];

export default function ChamadosListScreen() {
  const params = useLocalSearchParams<{ status?: string }>();
  const [chamados, setChamados] = useState<ChamadoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>(params.status || '');

  const fetchChamados = useCallback(async (q: string = '', status: string = '') => {
    try {
      let url = '/chamados/?';
      const queryParams = new URLSearchParams();
      if (q.trim()) queryParams.append('q', q.trim());
      if (status) queryParams.append('status', status);

      const res = await apiFetch(`${url}${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Se paginado pelo DRF
        const items = data.results || data;
        setChamados(items);
      }
    } catch (e) {
      console.warn('[Chamados] Erro ao carregar chamados:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (params.status !== undefined) {
      setSelectedStatus(params.status);
    }
  }, [params.status]);

  useEffect(() => {
    fetchChamados(searchQuery, selectedStatus);
  }, [fetchChamados, searchQuery, selectedStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChamados(searchQuery, selectedStatus);
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

  const renderChamadoItem = ({ item }: { item: ChamadoItem }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/chamado/${item.id}` as any)}
        activeOpacity={0.75}>
        {/* Cabeçalho do Card: ID e Badges */}
        <View style={styles.cardHeader}>
          <View style={styles.idBadge}>
            <Text style={styles.idText}>#{item.id}</Text>
          </View>
          <View style={styles.badgesRow}>
            <PriorityBadge prioridade={item.prioridade} prioridadeDisplay={item.prioridade_display} />
            <View style={{ width: 6 }} />
            <StatusBadge status={item.status} statusDisplay={item.status_display} size="sm" />
          </View>
        </View>

        {/* Título do Chamado */}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.titulo}
        </Text>

        {/* Projeto / Sistema */}
        <View style={styles.metaRow}>
          <Ionicons name="folder-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
          <Text style={styles.metaText} numberOfLines={1}>
            {item.projeto_nome || item.sistema_nome || 'Geral'}
            {item.sistema_nome && item.projeto_nome ? ` • ${item.sistema_nome}` : ''}
          </Text>
        </View>

        {/* Rodapé do Card: Respostas, Anexos e Data */}
        <View style={styles.cardFooter}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#94a3b8" />
              <Text style={styles.statText}>{item.total_respostas}</Text>
            </View>
            {item.total_anexos > 0 && (
              <View style={[styles.statItem, { marginLeft: 10 }]}>
                <Ionicons name="attach-outline" size={14} color="#94a3b8" />
                <Text style={styles.statText}>{item.total_anexos}</Text>
              </View>
            )}
            {item.reaberto_count > 0 && (
              <View style={[styles.statItem, { marginLeft: 10 }]}>
                <Ionicons name="reload" size={13} color="#f59e0b" />
                <Text style={[styles.statText, { color: '#f59e0b' }]}>{item.reaberto_count}x</Text>
              </View>
            )}
          </View>

          <Text style={styles.dateText}>{formatDate(item.criado_em)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#030f14', '#06171e', '#09212a']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Barra Superior / Busca */}
        <View style={styles.topBar}>
          <Text style={styles.screenTitle}>Chamados</Text>

          {/* Campo de Pesquisa em Tempo Real */}
          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={18} color="#64748b" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por ID, título ou projeto..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filtros Horizontais por Status */}
          <View style={styles.filterBar}>
            <FlatList
              horizontal
              data={STATUS_FILTERS}
              keyExtractor={(item) => item.key}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
              renderItem={({ item }) => {
                const isSelected = selectedStatus === item.key;
                return (
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      isSelected && styles.filterChipSelected,
                    ]}
                    onPress={() => setSelectedStatus(item.key)}
                    activeOpacity={0.75}>
                    <Text
                      style={[
                        styles.filterChipText,
                        isSelected && styles.filterChipTextSelected,
                      ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>

        {/* Listagem */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2dd4bf" />
          </View>
        ) : (
          <FlatList
            data={chamados}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderChamadoItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#2dd4bf"
                colors={['#2dd4bf']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrapper}>
                  <Ionicons name="folder-open-outline" size={40} color="#64748b" />
                </View>
                <Text style={styles.emptyTitle}>Nenhum chamado encontrado</Text>
                <Text style={styles.emptyDesc}>
                  {searchQuery || selectedStatus
                    ? 'Tente remover os filtros de busca para visualizar outros chamados.'
                    : 'Não há chamados registrados no momento.'}
                </Text>
              </View>
            }
          />
        )}
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
  topBar: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: '#ffffff',
    fontSize: 14,
  },
  filterBar: {
    marginHorizontal: -20,
  },
  filterScroll: {
    paddingHorizontal: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
    borderColor: '#2dd4bf',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  filterChipTextSelected: {
    color: '#2dd4bf',
    fontWeight: '700',
  },
  listContent: {
    padding: 20,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  idBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  idText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 21,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 4,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
    color: '#64748b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIconWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
