import { ThemeContext } from '@/app/_layout';
import { Colors } from '@/constants/Colors';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useContext } from 'react';
import { Platform } from 'react-native';

export default function TabLayout() {
	const themeContext = useContext(ThemeContext);
	const theme = themeContext?.effectiveTheme ?? 'light';
		const tabBarActiveTintColor = Colors[theme].tabIconSelected;
		const tabBarInactiveTintColor = Colors[theme].tabIconDefault;
		const tabBarBackground = Colors[theme].background;
		return (
			<Tabs
				screenOptions={{
					headerShown: false,
					tabBarActiveTintColor,
					tabBarInactiveTintColor,
					tabBarStyle: Platform.select({
						ios: {
							position: 'absolute',
							backgroundColor: tabBarBackground,
						},
						default: {
							backgroundColor: tabBarBackground,
						},
					}),
				}}>
			<Tabs.Screen
				name="today"
				options={{
					title: 'Today',
					tabBarIcon: ({ color, size }) => (
						<MaterialCommunityIcons name="calendar-today" color={color} size={size ?? 28} />
					),
				}}
			/>
			<Tabs.Screen
				name="calendar"
				options={{
					title: 'Calendar',
					tabBarIcon: ({ color, size }) => (
						<MaterialCommunityIcons name="calendar-month" color={color} size={size ?? 28} />
					),
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: 'Profile',
					tabBarIcon: ({ color, size }) => (
						<MaterialIcons name="person" color={color} size={size ?? 28} />
					),
				}}
			/>
		</Tabs>
	);
}
