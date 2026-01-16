import * as Haptics from 'expo-haptics';
import { loadUserData } from './storage';

export const triggerHaptic = async (type = 'light') => {
  const userData = await loadUserData();
  const hapticsEnabled = userData?.settings?.haptics !== false; // Active by default

  if (!hapticsEnabled) return;

  switch (type) {
    case 'impactLight':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'impactMedium':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'impactHeavy':
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'notificationSuccess':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'notificationWarning':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'notificationError':
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
    case 'selection':
      await Haptics.selectionAsync();
      break;
    default:
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};
