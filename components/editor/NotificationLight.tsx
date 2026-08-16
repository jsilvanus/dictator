'use client';


import type { VoiceNotificationLight } from '@/lib/data/default-settings';

export type LightState = 'idle' | 'listening' | 'command' | 'ai' | 'error';

interface NotificationLightProps {
  state: LightState;
  settings?: VoiceNotificationLight;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export function NotificationLight({
  state,
  settings,
  className = '',
  size = 'medium',
}: NotificationLightProps) {
  const defaultSettings: VoiceNotificationLight = {
    enabled: true,
    listening: '#0066ff',
    commandRecognized: '#00cc00',
    aiRecognized: '#ffaa00',
    error: '#ff0000',
    intensity: 'medium',
  };

  const config = settings ?? defaultSettings;

  if (!config.enabled || state === 'idle') {
    return null;
  }

  const sizeStyles = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-6 h-6',
  };

  const getColor = (): string => {
    switch (state) {
      case 'listening':
        return config.listening;
      case 'command':
        return config.commandRecognized;
      case 'ai':
        return config.aiRecognized;
      case 'error':
        return config.error;
    }
  };

  const getAnimationClass = (): string => {
    if (state === 'idle' || state === 'error') {
      return '';
    }

    switch (config.intensity) {
      case 'low':
        return 'animate-pulse-slow';
      case 'medium':
        return 'animate-pulse';
      case 'high':
        return 'animate-pulse-fast';
      default:
        return 'animate-pulse';
    }
  };

  const color = getColor();
  const animationClass = getAnimationClass();

  return (
    <div
      className={`${sizeStyles[size]} rounded-full ${animationClass} ${className}`}
      style={{
        backgroundColor: color,
        boxShadow: `0 0 8px ${color}80`,
      }}
      title={`Voice recognition: ${state}`}
      aria-label={`Voice recognition state: ${state}`}
    />
  );
}
