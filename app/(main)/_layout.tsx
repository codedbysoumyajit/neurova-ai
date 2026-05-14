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
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  Image,
} from 'react-native';
import {
  DrawerContentScrollView,
} from '@react-navigation/drawer';

function CustomDrawerContent(props: any) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { sessions, activeSessionId, createSession, setActiveSession, deleteSession } = useChatStore();
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

  const [deleteModalVisible, setDeleteModalVisible] = React.useState(false);
  const [chatToDelete, setChatToDelete] = React.useState<{ id: string; title: string } | null>(null);

  const handleDeleteChat = (id: string, title: string) => {
    setChatToDelete({ id, title });
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    if (chatToDelete) {
      deleteSession(chatToDelete.id);
    }
    setDeleteModalVisible(false);
    setChatToDelete(null);
  };

  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setChatToDelete(null);
  };

  return (
    <View style={[styles.drawerContainer, { backgroundColor: c.drawerBg }]}>
      {/* Header */}
      <View style={[styles.drawerHeader, { borderBottomColor: c.border }]}>
        <View style={styles.drawerLogoRow}>
          <Image 
            source={require('../../assets/images/icon.png')} 
            style={styles.drawerLogoImage} 
            resizeMode="contain" 
          />
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
              onLongPress={() => handleDeleteChat(session.id, session.title)}
              delayLongPress={400}
              activeOpacity={0.7}
            >
              <View style={styles.chatItemLeft}>
                <Text
                  style={[styles.chatItemText, { color: isActive ? c.primary : c.text }]}
                  numberOfLines={1}
                >
                  {session.title}
                </Text>
                <Text style={[styles.chatItemMeta, { color: c.textSecondary }]}>
                  {session.messages.length} msgs
                </Text>
              </View>
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

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <TouchableWithoutFeedback onPress={cancelDelete}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={[styles.modalIconContainer, { backgroundColor: c.danger + '1A' }]}>
                  <Text style={[styles.modalIcon, { color: c.danger }]}>🗑</Text>
                </View>
                <Text style={[styles.modalTitle, { color: c.text }]}>Delete Chat</Text>
                <Text style={[styles.modalMessage, { color: c.textSecondary }]}>
                  Are you sure you want to delete <Text style={{ fontWeight: '700', color: c.text }}>"{chatToDelete?.title}"</Text>? This action cannot be undone.
                </Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalCancelBtn, { borderColor: c.border }]}
                    onPress={cancelDelete}
                  >
                    <Text style={[styles.modalBtnText, { color: c.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalDeleteBtn, { backgroundColor: c.danger }]}
                    onPress={confirmDelete}
                  >
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  drawerLogoImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginRight: 12,
  },
  drawerTitle: { fontSize: 20, fontWeight: '800' },
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
  chatItemText: { fontSize: 14, fontWeight: '500', marginRight: 4 },
  chatItemMeta: { fontSize: 11, marginTop: 1 },
  chatItemLeft: { flex: 1, marginRight: 4 },
  emptyText: { textAlign: 'center', marginTop: 32, fontSize: 14 },
  drawerFooter: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, gap: 8 },
  drawerFooterBtn: { paddingVertical: 10 },
  footerBtnText: { fontSize: 15, fontWeight: '500' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 340, borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10 },
  modalIconContainer: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalIcon: { fontSize: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  modalMessage: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalActions: { flexDirection: 'row', width: '100%', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalCancelBtn: { borderWidth: 1 },
  modalDeleteBtn: {},
  modalBtnText: { fontSize: 16, fontWeight: '600' },
});
