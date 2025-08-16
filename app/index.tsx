import { Redirect } from 'expo-router';

export default function TabIndex() {
  // Redirect to the default tab (today)
  return <Redirect href="/(tabs)/today" />;
}
