import { View, StyleSheet } from 'react-native';
import React, { useState } from 'react';
import { Button, Text, useTheme, Card, Portal } from 'react-native-paper';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../../../components/layout/Header';
import { useAuthStore } from '../../../store/useAuthStore';
import LoginRequiredModal from '../../../components/auth/LoginRequiredModal';

export default function CreateScreen() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleVehicleCardPress = () => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    router.push('/create/vehicle');
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        
        
        <View style={styles.content}>
          <Text variant="titleLarge" style={[
            styles.title,
            { color: theme.colors.onSecondaryContainer }
          ]}>
            Create a Post
          </Text>

          <View style={styles.cardsContainer}>
            <Card 
              style={styles.card}
              onPress={handleVehicleCardPress}
              mode="elevated"
            >
            <Card.Content style={styles.cardContent}>
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons 
                  name="car" 
                  size={24} 
                  color={theme.colors.primary}
                />
              </View>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Vehicle
              </Text>
              <Text variant="bodySmall" style={[styles.cardDescription, { color: theme.colors.onSurfaceVariant }]}>
                Post cars, motorcycles, and other vehicles for sale or rent
              </Text>
            </Card.Content>
          </Card>
        </View>

        <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
          Tap the card to create a new vehicle listing
        </Text>
      </View>
    </View>
    
    <Portal>
      <LoginRequiredModal
        visible={showLoginModal}
        onDismiss={() => setShowLoginModal(false)}
        action="custom"
        customTitle="Login Required"
        customMessage="You need to be logged in to create a post."
      />
    </Portal>
    </>
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
    padding: 14,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    marginBottom: 6,
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