import SecureStorage from 'react-native-secure-storage';

// Save item
export const saveItem = async (key, item) => {
  try {
    await SecureStorage.setItem(key, item);
  } catch (error) {
    throw error;
  }
};

// Retrieve item
export const getItem = async (key) => {
  try {
    const jwt = await SecureStorage.getItem(key);
    return jwt;
  } catch (error) {
    throw error;
  }
};
