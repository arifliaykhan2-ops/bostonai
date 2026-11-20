import { useState } from 'react';
import { ActivityIndicator, Alert, Text } from 'react-native';
import { ActionItem } from '@/components/DetailParts';
import { reportContent, type ReportReason, type ReportTarget } from '@/lib/reports';
import { useTheme } from '@/theme';
import { t } from '@/i18n';

const REASONS: ReportReason[] = ['sexual', 'violent', 'hateful', 'minor', 'real_person', 'other'];

/** "Report" row for detail screens (App Store guideline 1.2). Calls onReported after a report is filed. */
export function ReportAction({
  targetType,
  targetId,
  onReported,
}: {
  targetType: ReportTarget;
  targetId: string;
  onReported?: () => void;
}) {
  const { colors } = useTheme();
  const [sending, setSending] = useState(false);

  async function send(reason: ReportReason) {
    setSending(true);
    try {
      await reportContent(targetType, targetId, reason);
      const body = targetType === 'showcase' ? t('report.thanksHidden') : t('report.thanksBody');
      Alert.alert(t('report.thanks'), body, [
        { text: t('common.ok'), onPress: onReported },
      ]);
    } catch (e) {
      Alert.alert(t('report.failed'), e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  }

  function ask() {
    Alert.alert(t('report.title'), t('report.question'), [
      ...REASONS.map((reason) => ({ text: t(`report.reason.${reason}`), onPress: () => void send(reason) })),
      { text: t('common.cancel'), style: 'cancel' as const },
    ]);
  }

  return (
    <ActionItem
      icon={
        sending ? (
          <ActivityIndicator color={colors.textMuted} />
        ) : (
          <Text style={{ color: colors.danger, fontSize: 24, width: 28, textAlign: 'center' }}>⚑</Text>
        )
      }
      label={t('report.title')}
      onPress={ask}
    />
  );
}
