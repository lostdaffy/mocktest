import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { colors, TAB_BAR_HEIGHT } from "./src/theme/theme";
import { AppAlertHost } from "./src/components/AppAlert";
import SplashScreen from "./src/screens/SplashScreen";

import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import HomeScreen from "./src/screens/HomeScreen";
import TestListScreen from "./src/screens/TestListScreen";
import TestTakingScreen from "./src/screens/TestTakingScreen";
import ResultScreen from "./src/screens/ResultScreen";
import AnalysisScreen from "./src/screens/AnalysisScreen";
import SubscriptionScreen from "./src/screens/SubscriptionScreen";
import PaymentScreen from "./src/screens/PaymentScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import SubjectsScreen from "./src/screens/SubjectsScreen";
import SelectSubjectsScreen from "./src/screens/SelectSubjectsScreen";
import ChapterListScreen from "./src/screens/ChapterListScreen";
import ReferralScreen from "./src/screens/ReferralScreen";
import ExamSeriesScreen from "./src/screens/ExamSeriesScreen";
import ExamPickerScreen from "./src/screens/ExamPickerScreen";
import ChapterPracticeScreen from "./src/screens/ChapterPracticeScreen";
import PyqExamPickerScreen from "./src/screens/PyqExamPickerScreen";
import PyqYearListScreen from "./src/screens/PyqYearListScreen";
import PyqPapersScreen from "./src/screens/PyqPapersScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused, color }) {
  return <Ionicons name={focused ? name : `${name}-outline`} size={22} color={color} />;
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// Live Exam still uses the shared TestList screen in "live" mode - only PYQ
// moved to its own dedicated exam -> year -> papers flow (see PyqExamPickerScreen).
function LiveTab({ navigation }) {
  return <TestListScreen navigation={navigation} route={{ params: { mode: "live" } }} />;
}

// Bottom tab bar - the 5 things a student actually does.
// Profile is NOT here: it's the avatar in the top-left of Home (modern app pattern).
function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.slate,
        tabBarStyle: {
          // Real device safe-area bottom inset (0 on old/notch-free phones,
          // ~20-34 on gesture-nav phones) instead of a fixed guess - the
          // bar always sits above the home indicator, never under it or
          // floating with a big dead gap on devices that don't need one.
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 8,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -2 },
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color }) => <TabIcon name="home" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="MockTab"
        component={ExamPickerScreen}
        options={{
          title: "Mock Tests",
          tabBarIcon: ({ focused, color }) => <TabIcon name="document-text" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="PracticeTab"
        component={SubjectsScreen}
        options={{
          title: "Practice",
          tabBarIcon: ({ focused, color }) => <TabIcon name="book" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="PyqTab"
        component={PyqExamPickerScreen}
        options={{
          title: "PYQs",
          tabBarIcon: ({ focused, color }) => <TabIcon name="library" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="LiveTab"
        component={LiveTab}
        options={{
          title: "Live Exam",
          tabBarIcon: ({ focused, color }) => <TabIcon name="radio" focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.brand }, headerTintColor: "#fff" }}>
      <Stack.Screen name="Home" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
      <Stack.Screen name="HistoryTab" component={HistoryScreen} options={{ title: "Test History" }} />
      <Stack.Screen name="TestList" component={TestListScreen} options={{ title: "Tests" }} />
      <Stack.Screen name="TestTaking" component={TestTakingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Result" component={ResultScreen} options={{ title: "Result", headerBackVisible: false }} />
      <Stack.Screen name="Analysis" component={AnalysisScreen} options={{ title: "My Analysis" }} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ title: "Upgrade" }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: "Payment", headerBackVisible: false }} />
      <Stack.Screen name="SelectSubjects" component={SelectSubjectsScreen} options={{ title: "Select Subjects" }} />
      <Stack.Screen name="ChapterList" component={ChapterListScreen} options={{ title: "Chapters" }} />
      <Stack.Screen name="Referral" component={ReferralScreen} options={{ title: "Refer & Earn" }} />
      <Stack.Screen name="ExamSeries" component={ExamSeriesScreen} options={{ title: "Mock Series" }} />
      <Stack.Screen name="ExamPicker" component={ExamPickerScreen} options={{ title: "Mock Tests" }} />
      <Stack.Screen name="ChapterPractice" component={ChapterPracticeScreen} options={{ title: "Practice Tests" }} />
      <Stack.Screen name="PyqYears" component={PyqYearListScreen} options={{ title: "Previous Year Papers" }} />
      <Stack.Screen name="PyqPapers" component={PyqPapersScreen} options={{ title: "Papers" }} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return <NavigationContainer>{user ? <AppStack /> : <AuthStack />}</NavigationContainer>;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
        <AppAlertHost />
      </AuthProvider>
    </SafeAreaProvider>
  );
}