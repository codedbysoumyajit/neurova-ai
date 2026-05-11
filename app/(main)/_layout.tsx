import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useChatStore } from '@/src/store/useChatStore';
import { useTheme } from '@/src/theme/useTheme';
import { useSettingsStore } from '@/src/store/useSettingsStore';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  DrawerContentScrollView,
} from '@react-navigation/drawer';

function CustomDrawerContent(props: any) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { sessions, activeSessionId, createSession, setActiveSession } = useChatStore();
  const router = useRouter();
  const c = useTheme();

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const handleNewChat = () => {
    createSession();
    router.push('/(main)');
    props.navigation.closeDrawer();
  };

  const handleSelectChat = (id: string) => {
    setActiveSession(id);
    router.push('/(main)');
    props.navigation.closeDrawer();
  };

  return (
    <View style={[styles.drawerContainer, { backgroundColor: c.drawerBg }]}>
      {/* Header */}
      <View style={[styles.drawerHeader, { borderBottomColor: c.border }]}>
        <View style={styles.drawerLogoRow}>
          <View style={[styles.drawerLogoCircle, { backgroundColor: c.primaryGlow, borderColor: c.primary }]}>
            <Text style={[styles.drawerLogoText, { color: c.primary }]}>N</Text>
          </View>
          <View>
            <Text style={[styles.drawerTitle, { color: c.text }]}>Neurova AI</Text>
            <Text style={[styles.drawerSubtitle, { color: c.textSecondary }]}>
              {user?.name ?? 'Guest'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.newChatBtn, { backgroundColor: c.primary }]}
          onPress={handleNewChat}
          activeOpacity={0.8}
        >
          <Text style={styles.newChatText}>+ New Chat</Text>
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      <ScrollView style={styles.chatList} showsVerticalScrollIndicator={false}>
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          return (
            <TouchableOpacity
              key={session.id}
              style={[
                styles.chatItem,
                {
                  backgroundColor: isActive ? c.primaryGlow : 'transparent',
                  borderColor: isActive ? c.primary + '40' : 'transparent',
                },
              ]}
              onPress={() => handleSelectChat(session.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chatItemText,
                  { color: isActive ? c.primary : c.textSecondary },
                ]}
                numberOfLines={1}
              >
                {session.title}
              </Text>
              <Text style={[styles.chatItemMeta, { color: c.textSecondary }]}>
                {session.messages.length} msgs
              </Text>
            </TouchableOpacity>
          );
        })}
        {sessions.length === 0 && (
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>
            No conversations yet
          </Text>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.drawerFooter, { borderTopColor: c.border }]}>
        <TouchableOpacity
          style={styles.drawerFooterBtn}
          onPress={() => {
            router.push('/(main)/settings');
            props.navigation.closeDrawer();
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.footerBtnText, { color: c.textSecondary }]}>⚙ Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.drawerFooterBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={[styles.footerBtnText, { color: c.danger }]}>↪ Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MainLayout() {
  const c = useTheme();

  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: c.headerBg },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: '600', fontSize: 18 },
        drawerStyle: { backgroundColor: c.drawerBg, width: 300 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Drawer.Screen name="index" options={{ title: 'Neurova AI' }} />
      <Drawer.Screen name="settings" options={{ title: 'Settings' }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: { flex: 1 },
  drawerHeader: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1 },
  drawerLogoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  drawerLogoCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  drawerLogoText: { fontSize: 18, fontWeight: '700' },
  drawerTitle: { fontSize: 18, fontWeight: '700' },
  drawerSubtitle: { fontSize: 13, marginTop: 1 },
  newChatBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#4F8EF7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  newChatText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  chatList: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },
  chatItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatItemText: { fontSize: 15, fontWeight: '500', flex: 1, marginRight: 8 },
  chatItemMeta: { fontSize: 12 },
  emptyText: { textAlign: 'center', marginTop: 32, fontSize: 14 },
  drawerFooter: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, gap: 8 },
  drawerFooterBtn: { paddingVertical: 10 },
  footerBtnText: { fontSize: 15, fontWeight: '500' },
});
