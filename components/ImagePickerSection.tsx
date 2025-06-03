import React from 'react';
import { View, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { Text, IconButton, useTheme } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ImagePickerSectionProps {
  images: string[];
  onPickImage: () => Promise<void>;
  onRemoveImage: (index: number) => void;
}

export default function ImagePickerSection({ 
  images, 
  onPickImage, 
  onRemoveImage 
}: ImagePickerSectionProps) {
  const theme = useTheme();

  return (
    <View style={styles.imagePickerContainer}>
      <Text style={[styles.imageText, { color: theme.colors.onSurfaceVariant }]}>
        Images ({images.length}/3)
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.imagesRow}
      >
        {images.map((base64Image, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image
              source={{ uri: `data:image/jpeg;base64,${base64Image}` }}
              style={styles.imagePreview}
            />
            <TouchableOpacity
              style={[styles.removeIcon, { backgroundColor: theme.colors.error }]}
              onPress={() => onRemoveImage(index)}
            >
              <MaterialCommunityIcons
                name="close"
                size={20}
                color="white"
              />
            </TouchableOpacity>
          </View>
        ))}
        {images.length < 3 && (
          <TouchableOpacity 
            style={[
              styles.addImageButton, 
              { 
                borderColor: theme.colors.primary,
                backgroundColor: theme.colors.surfaceVariant
              }
            ]} 
            onPress={onPickImage}
          >
            <MaterialCommunityIcons
              name="camera-plus"
              size={32}
              color={theme.colors.primary}
            />
            <Text style={{ color: theme.colors.primary, marginTop: 8 }}>
              Add Image
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  imagePickerContainer: {
    marginBottom: 20,
  },
  imageText: {
    marginBottom: 10,
  },
  imagesRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: 200,
    height: 150,
    borderRadius: 10,
  },
  removeIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 200,
    height: 150,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 