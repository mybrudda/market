import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    background: '#ECECEC', // Darker than F5F5F5
    surface: '#FFFFFF',
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level0: '#ECECEC',
    }
  }
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    background: '#333333', // Much lighter dark background
    surface: '#454545', // Lighter surface to match
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level0: '#333333',
    }
  }
};

// Helper function to get the theme based on isDarkMode
export const getTheme = (isDarkMode: boolean) => {
  return isDarkMode ? darkTheme : lightTheme;
}; 