import { ExpoRoot } from 'expo-router';
import { registerRootComponent } from 'expo';

const App = () => {
  const ctx = require.context('./app');
  return <ExpoRoot context={ctx} />;
};

export default registerRootComponent(App);
