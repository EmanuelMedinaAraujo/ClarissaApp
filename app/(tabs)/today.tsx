import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function TodayScreen() {
	return (
		<View style={styles.container}>
			<Text style={styles.text}>Today Tab Placeholder</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
	},
	text: {
		fontSize: 20,
		color: '#333',
	},
});
