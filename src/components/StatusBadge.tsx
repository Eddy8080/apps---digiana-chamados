import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  status: string;
  statusDisplay?: string;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  aberto: {
    label: 'Aberto',
    bg: 'rgba(14, 165, 233, 0.12)',
    text: '#0284c7',
    border: 'rgba(14, 165, 233, 0.3)',
  },
  em_progresso: {
    label: 'Em Progresso',
    bg: 'rgba(245, 158, 11, 0.12)',
    text: '#d97706',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  pendente: {
    label: 'Pendente',
    bg: 'rgba(139, 92, 246, 0.12)',
    text: '#8b5cf6',
    border: 'rgba(139, 92, 246, 0.3)',
  },
  resolvido: {
    label: 'Resolvido',
    bg: 'rgba(16, 185, 129, 0.12)',
    text: '#10b981',
    border: 'rgba(16, 185, 129, 0.3)',
  },
  fechado: {
    label: 'Fechado',
    bg: 'rgba(100, 116, 139, 0.12)',
    text: '#64748b',
    border: 'rgba(100, 116, 139, 0.3)',
  },
};

export function StatusBadge({ status, statusDisplay, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: statusDisplay || status,
    bg: 'rgba(100, 116, 139, 0.12)',
    text: '#64748b',
    border: 'rgba(100, 116, 139, 0.3)',
  };

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          paddingHorizontal: isSmall ? 8 : 10,
          paddingVertical: isSmall ? 2 : 4,
        },
      ]}>
      <View style={[styles.dot, { backgroundColor: config.text }]} />
      <Text style={[styles.text, { color: config.text, fontSize: isSmall ? 10 : 12 }]}>
        {statusDisplay || config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
