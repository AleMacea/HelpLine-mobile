import React from 'react';
import { Slot } from 'expo-router';

/**
 * Mantido apenas para compatibilidade com importa??es antigas.
 * O Expo Router cuida da navega??o; este componente apenas delega ao Slot.
 */
export default function AppNavigator() {
  return <Slot />;
}
