import { Stack } from 'expo-router';
import { DrawerProvider } from '@/src/components/GlobalDrawer';

export default function GlobalLayout() {
  return (
    <DrawerProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: {
            backgroundColor: '#F3F4F6',
          },
        }}
      />
    </DrawerProvider>
  );
}

