
import { Stack } from 'expo-router';

export default function GlobalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: {
          backgroundColor: '#F3F4F6',
        },
      }}
    />
  );
}
