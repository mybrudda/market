import { View, StyleSheet } from 'react-native';
import React from 'react';
import { Button, Text, useTheme, Card } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../../../components/layout/Header';

export default function CreateScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      
      <View style={styles.content}>
        <Text variant="headlineMedium" style={[
          styles.title,
          { color: theme.colors.onSecondaryContainer }
        ]}>
          What would you like to post?
        </Text>

        <View style={styles.cardsContainer}>
          <Card 
            style={styles.card}
            onPress={() => router.push('/create/vehicle')}
            mode="elevated"
          >
            <Card.Content style={styles.cardContent}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons 
                  name="car" 
                  size={32} 
                  color={theme.colors.primary}
                />
              </View>
              <Text variant="titleLarge" style={styles.cardTitle}>
                Vehicle
              </Text>
              <Text variant="bodyMedium" style={[styles.cardDescription, { color: theme.colors.onSurfaceVariant }]}>
                Post cars, motorcycles, and other vehicles for sale or rent
              </Text>
            </Card.Content>
          </Card>

          <Card 
            style={styles.card}
            onPress={() => router.push('/create/real-estate')}
            mode="elevated"
          >
            <Card.Content style={styles.cardContent}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons 
                  name="home" 
                  size={32} 
                  color={theme.colors.primary}
                />
              </View>
              <Text variant="titleLarge" style={styles.cardTitle}>
                Real Estate
              </Text>
              <Text variant="bodyMedium" style={[styles.cardDescription, { color: theme.colors.onSurfaceVariant }]}>
                List properties for sale or rent, including houses and apartments
              </Text>
            </Card.Content>
          </Card>
        </View>

        <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
          Tap a card to create a new listing
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
  },
  cardsContainer: {
    gap: 16,
    marginTop: 8,
  },
  card: {
    marginHorizontal: 4,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    marginBottom: 8,
    fontWeight: '500',
  },
  cardDescription: {
    textAlign: 'center',
    marginTop: 4,
  },
  hint: {
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
}); 