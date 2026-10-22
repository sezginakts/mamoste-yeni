// Öğrencinin telefonunu bildirim için kaydet: Expo push token → sunucu (student_set_push_token).
// Öğretmen ödev verince veritabanı tetikleyicisi bu token'a bildirim yollar. Web'de ve izin yoksa sessizce atlanır.
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { rpc, cloudEnabled } from '../lib/supabase';

export async function registerStudentPush(student) {
  if (Platform.OS === 'web' || !cloudEnabled || !student || !student.rid || !student.token) return null;
  let N;
  try {
    N = require('expo-notifications');
  } catch (e) {
    return null;
  }
  const perm = await N.requestPermissionsAsync();
  if (!perm.granted) return null;
  const projectId = Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.eas && Constants.expoConfig.extra.eas.projectId;
  const { data: pushToken } = await N.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  if (!pushToken) return null;
  await rpc('student_set_push_token', { p_student_id: student.rid, p_token: student.token, p_push_token: pushToken });
  return pushToken;
}

// Ödev bildirimine dokunulunca cb({ homeworkId, branch }) çağrılır — uygulama kapalıyken açılan bildirim dahil.
// Uygulama öndeyken gelen bildirim de banner olarak görünür. Döner: aboneliği kaldıran fonksiyon.
export function onHomeworkNotification(cb) {
  if (Platform.OS === 'web') return () => {};
  let N;
  try {
    N = require('expo-notifications');
  } catch (e) {
    return () => {};
  }
  N.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  const handle = (resp) => {
    const data = resp && resp.notification && resp.notification.request.content.data;
    if (data && data.homeworkId) cb({ homeworkId: data.homeworkId, branch: data.branch || null });
  };
  N.getLastNotificationResponseAsync().then(handle).catch(() => {});
  const sub = N.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
