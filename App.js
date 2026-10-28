import 'react-native-gesture-handler';
// Yazı tipi yaması EN ÖNCE: StyleSheet.create çağrılarından önce çalışmalı.
import './src/utils/fontYamasi';
import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { FONT_YUKLEME } from './src/theme/fontAilesi';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ProgressProvider, useProgress } from './src/context/ProgressContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { warmUpVoices } from './src/utils/tts';
import { dikeyKilitle } from './src/utils/orientation';

import ErrorBoundary from './src/components/ErrorBoundary';
import HomeScreen from './src/screens/HomeScreen';
import StudyScreen from './src/screens/StudyScreen';
import ResultScreen from './src/screens/ResultScreen';
import ProgressScreen from './src/screens/ProgressScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ScanScreen from './src/screens/ScanScreen';
import StudentHomeworkScreen from './src/screens/StudentHomeworkScreen';
import HomeworkDoneScreen from './src/screens/HomeworkDoneScreen';
import TeacherHomeScreen from './src/screens/teacher/TeacherHomeScreen';
import TeacherClassScreen from './src/screens/teacher/TeacherClassScreen';
import TeacherStudentScreen from './src/screens/teacher/TeacherStudentScreen';
import HomeworkCreateScreen from './src/screens/teacher/HomeworkCreateScreen';
import HomeworkShareScreen from './src/screens/teacher/HomeworkShareScreen';
import TeacherBackupScreen from './src/screens/teacher/TeacherBackupScreen';
import BoardScreen from './src/screens/teacher/BoardScreen';
import DocsScreen from './src/screens/teacher/DocsScreen';
import BoardConnectScreen from './src/screens/teacher/BoardConnectScreen';
import BoardRemoteScreen from './src/screens/teacher/BoardRemoteScreen';
import { BoardLinkProvider } from './src/teacher/BoardLink';
import RosterImportScreen from './src/screens/teacher/RosterImportScreen';
import YearPlanScreen from './src/screens/teacher/YearPlanScreen';
import { PlanProvider, usePlans } from './src/teacher/PlanContext';
import TimetableScreen from './src/screens/teacher/TimetableScreen';
import NotesScreen from './src/screens/teacher/NotesScreen';
import { DeskProvider, useDesk } from './src/teacher/DeskContext';
import LearnScreen from './src/screens/LearnScreen';
import RoleSelectScreen from './src/screens/RoleSelectScreen';
import { TeacherProvider, useTeacher } from './src/teacher/TeacherContext';
import { RoleProvider, useRole } from './src/context/RoleContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import TeacherSignInScreen from './src/screens/teacher/TeacherSignInScreen';
import ActivitiesScreen from './src/screens/teacher/ActivitiesScreen';
import ActivityPlayScreen from './src/screens/teacher/ActivityPlayScreen';

// Geliştirmede girişi atlamak için true yap (sunucu özellikleri — ödev gönderme, eşitleme — o zaman çalışmaz).
const SKIP_TEACHER_LOGIN = true;
import NewPasswordScreen from './src/screens/teacher/NewPasswordScreen';
import { ConfirmHost } from './src/teacher/ui';
import BellOverlay from './src/components/BellOverlay';
import StudentJoinScreen from './src/screens/StudentJoinScreen';
import StudentProfileScreen from './src/screens/StudentProfileScreen';
import TeacherProfileScreen from './src/screens/teacher/TeacherProfileScreen';
import BranchSelectScreen from './src/screens/BranchSelectScreen';
import TaskScreen from './src/screens/TaskScreen';
import TaskCreateScreen from './src/screens/teacher/TaskCreateScreen';
import { onHomeworkNotification } from './src/utils/push';

const Stack = createNativeStackNavigator();
const navRef = createNavigationContainerRef();

function RootNavigator() {
  const { loaded, refreshHomeworks, state: progress } = useProgress();
  const { loaded: teacherLoaded } = useTeacher();
  const { colors, mode, loaded: themeLoaded } = useTheme();
  const { role, branch, loaded: roleLoaded } = useRole();
  const { loaded: plansLoaded } = usePlans();
  const { loaded: deskLoaded } = useDesk();
  const auth = useAuth();

  // Öğrenci: ödev bildirimine dokununca ödevleri çek ve o ödevi aç (görev → Task, cümle → ödev listesi).
  const pendingOpen = useRef(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const openHomework = async ({ homeworkId, branch }) => {
    if (!navRef.isReady()) {
      pendingOpen.current = { homeworkId, branch };
      return;
    }
    try {
      await refreshHomeworks();
    } catch (e) {}
    setTimeout(() => {
      const hw = progressRef.current.homeworks[homeworkId];
      if (hw && hw.type === 'task') navRef.navigate('Task', { id: homeworkId });
      else navRef.navigate('StudentHomework', branch ? { branch } : undefined);
    }, 50);
  };
  useEffect(() => {
    if (!loaded || role !== 'student') return undefined;
    return onHomeworkNotification(openHomework);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, role]);

  const navTheme = {
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: colors.bg,
      card: colors.bg,
      text: colors.text,
      primary: colors.primary,
    },
  };

  if (!loaded || !themeLoaded || !teacherLoaded || !roleLoaded || !plansLoaded || !deskLoaded || !auth.loaded) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!role) {
    return (
      <>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <RoleSelectScreen />
      </>
    );
  }

  const isTeacher = role === 'teacher';

  // Öğretmen önce branşını seçer (kalıcı).
  if (isTeacher && !branch) {
    return (
      <>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <BranchSelectScreen />
      </>
    );
  }

  // Şifre sıfırlama linkinden gelindiyse önce yeni şifre.
  if (isTeacher && auth.recovery && auth.session) {
    return (
      <>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <NewPasswordScreen />
      </>
    );
  }

  // Öğretmen sunucuya bağlıyken önce giriş yapar (sınıflar ve ödevler hesabına bağlanır).
  // Geliştirme sırasında (Expo Go / simülatör) giriş ekranı atlanır; veriler yalnız cihazda kalır.
  // Mağaza sürümünde (__DEV__ false) giriş istenir.
  if (isTeacher && auth.cloudEnabled && !auth.session && !SKIP_TEACHER_LOGIN) {
    return (
      <>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <TeacherSignInScreen />
      </>
    );
  }

  // key={role}: rol değişince yığın sıfırlanır, yeni modun ana ekranı açılır.
  return (
    <NavigationContainer
      key={role}
      ref={navRef}
      theme={navTheme}
      onReady={() => {
        if (pendingOpen.current) {
          const p = pendingOpen.current;
          pendingOpen.current = null;
          openHomework(p);
        }
      }}
    >
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="Home" component={isTeacher ? TeacherHomeScreen : HomeScreen} />
        <Stack.Screen name="Learn" component={LearnScreen} />
        <Stack.Screen name="Study" component={StudyScreen} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ gestureEnabled: false }} />
        <Stack.Screen name="Progress">
          {(props) => (
            <ErrorBoundary>
              <ProgressScreen {...props} />
            </ErrorBoundary>
          )}
        </Stack.Screen>
        <Stack.Screen name="Library" component={LibraryScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Scan" component={ScanScreen} />
        <Stack.Screen name="Profile" component={isTeacher ? TeacherProfileScreen : StudentProfileScreen} />
        {isTeacher ? (
          <>
            <Stack.Screen name="TeacherClass" component={TeacherClassScreen} />
            <Stack.Screen name="TeacherStudent" component={TeacherStudentScreen} />
            <Stack.Screen name="RosterImport" component={RosterImportScreen} />
            <Stack.Screen name="YearPlan" component={YearPlanScreen} />
            <Stack.Screen name="Timetable" component={TimetableScreen} />
            <Stack.Screen name="Notes" component={NotesScreen} />
            <Stack.Screen name="HomeworkCreate" component={HomeworkCreateScreen} />
            <Stack.Screen name="TaskCreate" component={TaskCreateScreen} />
            <Stack.Screen name="HomeworkShare" component={HomeworkShareScreen} />
            <Stack.Screen name="TeacherBackup" component={TeacherBackupScreen} />
            <Stack.Screen name="Board" component={BoardScreen} />
            <Stack.Screen name="Docs" component={DocsScreen} />
            <Stack.Screen name="BoardConnect" component={BoardConnectScreen} />
            <Stack.Screen name="BoardRemote" component={BoardRemoteScreen} />
            <Stack.Screen name="Activities" component={ActivitiesScreen} />
            <Stack.Screen name="ActivityPlay" component={ActivityPlayScreen} options={{ orientation: 'default', gestureEnabled: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="StudentHomework" component={StudentHomeworkScreen} />
            <Stack.Screen name="StudentJoin" component={StudentJoinScreen} />
            <Stack.Screen name="Task" component={TaskScreen} />
            <Stack.Screen name="HomeworkDone" component={HomeworkDoneScreen} options={{ gestureEnabled: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  // Uygulama yazı tipi (Manrope). Yüklenene kadar bekle: sistem fontuyla bir an görünüp değişmesin.
  const [fontlarHazir] = useFonts(FONT_YUKLEME);

  // En kaliteli TTS sesini açılışta önceden seç (ilk okumada gecikme olmasın).
  useEffect(() => {
    warmUpVoices();
  }, []);

  // Web: gövde yazı tipini de Manrope yap (stilsiz metinler serif'e düşmesin).
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.fontFamily = 'Manrope_400Regular, system-ui, -apple-system, sans-serif';
    }
  }, []);

  // Uygulama normalde DİKEY: yalnız tam ekran ders programı yatay kilidi açar (src/utils/orientation.js).
  useEffect(() => {
    dikeyKilitle();
  }, []);

  if (!fontlarHazir) {
    return <View style={{ flex: 1, backgroundColor: '#F1F5F9' }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ThemeProvider>
            <RoleProvider>
              <AuthProvider>
                <ProgressProvider>
                  <TeacherProvider>
                    <PlanProvider>
                      <DeskProvider>
                        <BoardLinkProvider>
                          {/* Klavye açılınca tüm ekran (oyunlar dahil) klavyenin üstüne sığsın.
                              Android tam ekran (edge-to-edge) düzende pencere kendiliğinden küçülmüyor; iOS'ta hiç küçülmez. */}
                          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
                            <RootNavigator />
                          </KeyboardAvoidingView>
                          <ConfirmHost />
                          <BellOverlay />
                        </BoardLinkProvider>
                      </DeskProvider>
                    </PlanProvider>
                  </TeacherProvider>
                </ProgressProvider>
              </AuthProvider>
            </RoleProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
