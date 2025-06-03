import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    background: '#F5F5F5', // Slightly darker than pure white
    surface: '#FFFFFF',
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level0: '#F5F5F5',
    }
  }
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    background: '#1A1A1A', // Darker background
    surface: '#242424', // Slightly lighter than background
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level0: '#1A1A1A',
      level1: '#242424',
      level2: '#2A2A2A',
      level3: '#303030',
    }
  }
};

// Helper function to get the theme based on isDarkMode
export const getTheme = (isDarkMode: boolean) => {
  return isDarkMode ? darkTheme : lightTheme;
}; 