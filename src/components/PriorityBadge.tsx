import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PriorityBadgeProps {
  prioridade: string;
  prioridadeDisplay?: string;
}

const PRIORITY_CONFIG: Record<string, { label: string; text: string; bg: string }> = {
  baixa: {
    label: 'Baixa',
    text: '#64748b',
    bg: 'rgba(100, 116, 139, 0.1)',
  },
  media: {
    label: 'Média',
    text: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.1)',
  },
  alta: {
    label: 'Alta',
    text: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.1)',
  },
  urgente: {
    label: 'Urgente',
    text: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
  },
};

export function PriorityBadge({ prioridade, prioridadeDisplay }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[prioridade] || {
    label: prioridadeDisplay || prioridade,
    text: '#64748b',
    bg: 'rgba(100, 116, 139, 0.1)',
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>
        {prioridadeDisplay || config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
