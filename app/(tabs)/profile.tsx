import { ThemeContext } from '@/app/_layout';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useContext } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

const themeOptions: Array<'light' | 'dark' | 'red' | 'system'> = ['light', 'dark', 'red', 'system'];

export default function ProfileScreen() {
	const themeContext = useContext(ThemeContext);
	const systemTheme = useColorScheme();
	if (!themeContext) return null;
	const { theme, setTheme } = themeContext;

	// If theme is 'system', use systemTheme for display
	const effectiveTheme = theme === 'system' ? systemTheme : theme;

	return (
		<ThemedView style={styles.container}>
			<ThemedText style={styles.title}>Profile</ThemedText>
			<ThemedText style={styles.subtitle}>Theme Selector (global)</ThemedText>
			<View style={styles.selectorRow}>
				{themeOptions.map(option => (
					<TouchableOpacity
						key={option}
						style={[styles.button, theme === option && styles.selectedButton]}
						onPress={() => setTheme(option)}
					>
						<ThemedText style={styles.buttonText}>
							{option === 'system' ? `System (${systemTheme})` : option.charAt(0).toUpperCase() + option.slice(1)}
						</ThemedText>
					</TouchableOpacity>
				))}
			</View>
			<ThemedText style={styles.info}>
				Current theme: {theme === 'system' ? `System (${systemTheme})` : theme}
			</ThemedText>
			<ThemedText style={styles.info}>
				(Theme changes are global. Persistence will be added later.)
			</ThemedText>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 12,
	},
	subtitle: {
		fontSize: 16,
		marginBottom: 24,
	},
	selectorRow: {
		flexDirection: 'row',
		marginBottom: 24,
	},
	button: {
		paddingVertical: 10,
		paddingHorizontal: 18,
		borderRadius: 8,
		backgroundColor: '#eee',
		marginHorizontal: 6,
	},
	selectedButton: {
		backgroundColor: '#e53935',
	},
	buttonText: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#7b1f2b',
	},
	systemButton: {
		paddingVertical: 10,
		paddingHorizontal: 18,
		borderRadius: 8,
		backgroundColor: '#b71c1c',
		marginVertical: 8,
	},
	info: {
		fontSize: 14,
		marginTop: 8,
	},
});
