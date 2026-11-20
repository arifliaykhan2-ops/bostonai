import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme } from '@/theme';
import { t } from '@/i18n';

/**
 * System tab bar: on iOS 26+ it is drawn with Liquid Glass (the glass bubble
 * that follows your finger, as in Instagram). SF Symbols on iOS, Material icons
 * on Android; outline normally, filled and lime when selected (the web's active nav color). No labels.
 */
export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <NativeTabs
      tintColor={colors.accent}
      iconColor={{ default: colors.textMuted, selected: colors.accent }}
      labelVisibilityMode="unlabeled"
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label hidden>{t('tabs.explore')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="apps">
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} md="apps" />
        <NativeTabs.Trigger.Label hidden>{t('tabs.apps')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="create">
        <NativeTabs.Trigger.Icon sf={{ default: 'plus.square', selected: 'plus.square.fill' }} md="add_box" />
        <NativeTabs.Trigger.Label hidden>{t('tabs.create')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="gallery">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'play.rectangle.on.rectangle', selected: 'play.rectangle.on.rectangle.fill' }}
          md="video_library"
        />
        <NativeTabs.Trigger.Label hidden>{t('tabs.mine')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
        <NativeTabs.Trigger.Label hidden>{t('tabs.profile')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
