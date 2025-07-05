// Map text-based icon names to emoji representations for display
export const iconMap: { [key: string]: string } = {
  'clipboard': '📋',
  'note': '📝',
  'briefcase': '💼',
  'target': '🎯',
  'bolt': '⚡',
  'fire': '🔥',
  'lightbulb': '💡',
  'rocket': '🚀',
  'star': '⭐',
  'gem': '💎',
  'trophy': '🏆',
  'palette': '🎨',
  'wrench': '🔧',
  'chart-bar': '📊',
  'chart-line': '📈',
  'music': '🎵',
  'gamepad': '🎮',
  'running': '🏃',
  'pizza': '🍕',
  'coffee': '☕'
};

// Function to get emoji from icon name
export const getIconEmoji = (iconName: string): string => {
  return iconMap[iconName] || iconName;
};