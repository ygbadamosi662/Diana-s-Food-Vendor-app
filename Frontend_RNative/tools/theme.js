import { Theme } from '../enum_ish';
/**
 * Adjusts the brightness of a given color.
 * 
 * @param {string} color - The color to adjust, in the format "rgb(red, green, blue)".
 * @param {number} factor - The factor by which to adjust the brightness.
 * @returns {string} The adjusted color, in the format "rgb(red, green, blue)".
 */
export const adjustColorBrightness = (color, factor) => {
  // Extract the RGB values from the color string
  const [r, g, b] = color.match(/\d+/g).map(Number);
  
  // Calculate the new RGB values based on the factor
  const newR = Math.max(0, Math.min(255, r * factor));
  const newG = Math.max(0, Math.min(255, g * factor));
  const newB = Math.max(0, Math.min(255, b * factor));
  
  // Return the adjusted color string
  return `rgb(${newR}, ${newG}, ${newB})`;
}

/**
 * Set the theme for a given RGB color.
 * 
 * @param {string} rgb_color - The RGB color value.
 * @param {Theme} theme - The theme to apply (default is Theme.Dark).
 * @returns {string} - The adjusted color based on the theme.
 */
export const setTheme = (rgb_color, theme=Theme.Dark) => {
  // Adjust color brightness based on the selected theme
  if(theme === Theme.Light) {
    return adjustColorBrightness(rgb_color, 2);
  }
  if(theme === Theme.Dark) {
    return adjustColorBrightness(rgb_color, 0.5);
  }
}
