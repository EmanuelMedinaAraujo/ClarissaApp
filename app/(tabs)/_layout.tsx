import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

// If you have custom tab components, import them here
// import { HapticTab } from '@/components/HapticTab';
// import TabBarBackground from '@/components/ui/TabBarBackground';
// import { Colors } from '@/constants/Colors';
// import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
	// Uncomment and use colorScheme if you have theme support
	// const colorScheme = useColorScheme();

	return (
		<Tabs
			screenOptions={{
				// tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
				headerShown: false,
				// tabBarButton: HapticTab,
				// tabBarBackground: TabBarBackground,
				tabBarStyle: Platform.select({
					ios: {
						position: 'absolute',
					},
					default: {},
				}),
			}}>
			<Tabs.Screen
				name="today"
				options={{
					title: 'Today',
					// tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
				}}
			/>
			<Tabs.Screen
				name="calendar"
				options={{
					title: 'Calendar',
					// tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: 'Profile',
					// tabBarIcon: ({ color }) => <IconSymbol size={28} name="person" color={color} />,
				}}
			/>
		</Tabs>
	);
}
