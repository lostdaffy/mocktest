import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { colors } from "./src/theme/theme";

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

// PYQ and Live Exam are the same TestList screen with a different mode.
// Small wrappers let them sit in the bottom tab bar.
function PyqTab({ navigation }) {
  return <TestListScreen navigation={navigation} route={{ params: { mode: "pyq" } }} />;
}
function LiveTab({ navigation }) {
  return <TestListScreen navigation={navigation} route={{ params: { mode: "live" } }} />;
}

// Bottom tab bar - the 5 things a student actually does.
// Profile is NOT here: it's the avatar in the top-left of Home (modern app pattern).
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.slate,
        tabBarStyle: {
          height: 64,
          paddingBottom: 10,
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
        component={PyqTab}
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
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return <NavigationContainer>{user ? <AppStack /> : <AuthStack />}</NavigationContainer>;
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}