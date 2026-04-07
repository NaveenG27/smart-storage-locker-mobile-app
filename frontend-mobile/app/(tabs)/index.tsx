import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator, RefreshControl, 
  Dimensions, Modal, Platform 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import api from '../../services/api';

const { width } = Dimensions.get('window');

export default function Dashboard() {
  const router = useRouter();
  
  const [lockers, setLockers] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [recentReleases, setRecentReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [activeLocker, setActiveLocker] = useState<any>(null);
  const [reservedUntil, setReservedUntil] = useState("");
  
  const [newLockerNum, setNewLockerNum] = useState("");
  const [newLockerLoc, setNewLockerLoc] = useState("");

  useEffect(() => {
    loadUserData();
    
    const interval = setInterval(() => fetchData(false), 10000);
    return () => clearInterval(interval);
  }, []);

  const loadUserData = async () => {
    const user = await AsyncStorage.getItem('username');
    const isUserAdmin = user === 'admin';
    
    setCurrentUsername(user || "");
    setIsAdmin(isUserAdmin); 
    fetchData(true, isUserAdmin);
  };

  const fetchData = async (showLoading = false, adminOverride?: boolean) => {
    if (showLoading) setLoading(true);
    
    const checkIsAdmin = adminOverride !== undefined ? adminOverride : isAdmin;

    try {
      const lockerRes = await api.get('/api/lockers/');
      const resRes = await api.get('/api/reservations/');
      setLockers(lockerRes.data);
      setReservations(resRes.data);

      if (checkIsAdmin) {
        const historyRes = await api.get('/api/reservations/recent_releases/');
        setRecentReleases(historyRes.data);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        await AsyncStorage.clear();
        router.replace('/auth');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [isAdmin]);

  const handleAddLocker = async () => {
  if (!newLockerNum || !newLockerLoc) return Alert.alert("Error", "Fill all fields");
  try {
    await api.post('/api/lockers/', { 
      locker_number: newLockerNum, 
      location: newLockerLoc,
      status: 'available' 
    });
  } catch (e: any) { 
    if (e.response?.status === 400) {
      Alert.alert("Locker Exists", "This locker number is already in the system.");
    } else {
      Alert.alert("Server Error", "Could not connect to the database.");
    }
  }
};

  const openReserveModal = (locker: any) => {
    setActiveLocker(locker);
    const now = new Date();
    now.setHours(now.getHours() + 1);
    setReservedUntil(now.toISOString().slice(0, 16)); 
    setShowReserveModal(true);
  };

  const confirmBooking = async () => {
    if (!activeLocker || !reservedUntil) return;
    try {
      const payload = { 
        locker: activeLocker.id,
        reserved_until: new Date(reservedUntil).toISOString()
      };

      await api.post('/api/reservations/', payload);

      setShowReserveModal(false);
      Alert.alert("Success", `Locker #${activeLocker.locker_number} reserved! 🔒`);
      fetchData();
    } catch (e: any) {
      const serverError = e.response?.data?.error || JSON.stringify(e.response?.data);
      Alert.alert("Reservation Failed", serverError);
    }
  };

  const handleRelease = (resId: number) => {
    Alert.alert("Release", "Are you sure you want to release this locker?", [
      { text: "Cancel" },
      { text: "Release", style: 'destructive', onPress: async () => {
          try {
            await api.put(`/api/reservations/${resId}/release/`);
            fetchData();
          } catch (err) {
            Alert.alert("Error", "Could not release locker.");
          }
      }}
    ]);
  };

  const handleDeleteLocker = (id: number, num: string) => {
    Alert.alert("Delete", `Permanently delete Locker #${num}?`, [
      { text: "Cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
          await api.delete(`/api/lockers/${id}/`);
          fetchData();
      }}
    ]);
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    router.replace('/auth');
  };

  const filteredLockers = lockers.filter(l => 
    l.locker_number.toString().includes(searchTerm) || 
    l.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeReservations = reservations.filter(r => r.is_active);

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <View style={styles.logoRow}>
          <View style={styles.logoBox}><Ionicons name="lock-closed" size={18} color="#fff" /></View>
          <Text style={styles.logoText}>SmartLocker</Text>
        </View>
        <View style={styles.navIcons}>
            <Text style={styles.userText}>Hi, {currentUsername}</Text>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                <Ionicons name="log-out-outline" size={22} color="#94a3b8" />
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollArea}
      >
        <View style={styles.header}>
            <View>
                <Text style={styles.headerTitle}>Dashboard</Text>
                <Text style={styles.headerSubtitle}>Real-time monitoring</Text>
            </View>
            {isAdmin && (
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
                    <Ionicons name="add" size={20} color="#fff" />
                    <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
            )}
        </View>

        <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
            <TextInput 
                style={styles.searchInput} 
                placeholder="Search lockers..."
                value={searchTerm}
                onChangeText={setSearchTerm}
            />
        </View>

        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Locker Availability</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>{filteredLockers.length} Total</Text></View>
        </View>

        {loading ? (
            <ActivityIndicator size="large" color="#2563eb" style={{marginTop: 50}} />
        ) : (
            <View style={styles.grid}>
                {filteredLockers.map(locker => (
                    <View key={locker.id} style={[styles.lockerCard, locker.status !== 'available' && styles.lockerCardOccupied]}>
                        <View style={styles.cardHeader}>
                            <View style={[styles.iconBox, {backgroundColor: locker.status === 'available' ? '#ecfdf5' : '#f1f5f9'}]}>
                                <MaterialCommunityIcons 
                                    name={locker.status === 'available' ? 'lock-open-outline' : 'lock-outline'} 
                                    size={22} 
                                    color={locker.status === 'available' ? '#059669' : '#94a3b8'} 
                                />
                            </View>
                            {isAdmin && (
                                <TouchableOpacity onPress={() => handleDeleteLocker(locker.id, locker.locker_number)}>
                                    <Ionicons name="trash-outline" size={18} color="#cbd5e1" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={styles.cardLockerNum}>Locker #{locker.locker_number}</Text>
                        <View style={styles.locationRow}>
                            <Ionicons name="location-outline" size={12} color="#94a3b8" />
                            <Text style={styles.locationText}>{locker.location}</Text>
                        </View>
                        <TouchableOpacity 
                            disabled={locker.status !== 'available'}
                            style={[styles.reserveBtn, locker.status !== 'available' && styles.reserveBtnDisabled]}
                            onPress={() => openReserveModal(locker)}
                        >
                            <Text style={[styles.reserveBtnText, locker.status !== 'available' && {color: '#94a3b8'}]}>
                                {locker.status === 'available' ? 'Reserve' : 'Occupied'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        )}

        {/* ACTIVE RESERVATIONS */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{isAdmin ? 'System Active' : 'My Active'}</Text>
        </View>
        <View style={styles.sideList}>
            {activeReservations.length > 0 ? activeReservations.map(res => (
                <View key={res.id} style={styles.activeCard}>
                    <View style={styles.activeRow}>
                        <View>
                            <View style={styles.resBadge}><Text style={styles.resBadgeText}>Locker #{res.locker_number}</Text></View>
                            <Text style={styles.resUser}><Ionicons name="person-outline" /> {res.user_username}</Text>
                        </View>
                        {(isAdmin || res.user_username === currentUsername) && (
                            <TouchableOpacity onPress={() => handleRelease(res.id)}>
                                <Ionicons name="close-circle-outline" size={24} color="#ef4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )) : <Text style={styles.emptyText}>No active reservations.</Text>}
        </View>

        {/* HISTORY (ADMIN ONLY) */}
        {isAdmin && (
            <>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent History</Text>
                </View>
                <View style={styles.historyFixedContainer}>
                    <ScrollView nestedScrollEnabled={true}>
                        <View style={styles.sideList}>
                            {recentReleases.length > 0 ? recentReleases.map((h, i) => (
                                <View key={i} style={styles.historyCard}>
                                    <View style={styles.historyRow}>
                                        <Text style={styles.historyLocker}>Locker #{h.locker_number}</Text>
                                        <Text style={styles.historyStatus}>Released</Text>
                                    </View>
                                    <Text style={styles.historyDetail}>User: {h.user_username}</Text>
                                </View>
                            )) : <Text style={styles.emptyText}>No history records found.</Text>}
                        </View>
                    </ScrollView>
                </View>
            </>
        )}
      </ScrollView>

      {/* --- MODALS --- */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add New Locker</Text>
                <TextInput 
                    style={styles.modalInput} 
                    placeholder="Locker Number" 
                    value={newLockerNum} 
                    onChangeText={setNewLockerNum}
                    keyboardType="numeric"
                />
                <TextInput 
                    style={styles.modalInput} 
                    placeholder="Location" 
                    value={newLockerLoc} 
                    onChangeText={setNewLockerLoc}
                />
                <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.createBtn} onPress={handleAddLocker}>
                        <Text style={styles.createBtnText}>Create</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      <Modal visible={showReserveModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={[styles.iconBox, {alignSelf: 'center', marginBottom: 10, backgroundColor: '#ecfdf5'}]}>
                    <MaterialCommunityIcons name="clock-outline" size={32} color="#059669" />
                </View>
                <Text style={[styles.modalTitle, {textAlign: 'center'}]}>Book Locker #{activeLocker?.locker_number}</Text>
                
                <Text style={styles.userText}>Reserved Until:</Text>
                <TextInput 
                    style={styles.modalInput} 
                    value={reservedUntil} 
                    onChangeText={setReservedUntil}
                    placeholder="YYYY-MM-DDTHH:mm"
                />
                <Text style={{fontSize: 10, color: '#94a3b8', marginBottom: 15}}>Example: 2026-04-06T18:30</Text>

                <View style={styles.modalButtons}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowReserveModal(false)}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.createBtn} onPress={confirmBooking}>
                        <Text style={styles.createBtnText}>Confirm Booking</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollArea: { paddingBottom: 40 },
  navBar: { height: 100, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 15 },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoBox: { backgroundColor: '#2563eb', padding: 6, borderRadius: 8 },
  logoText: { fontSize: 18, fontWeight: '800', marginLeft: 8, color: '#1e293b' },
  navIcons: { flexDirection: 'row', alignItems: 'center' },
  userText: { fontSize: 13, fontWeight: '600', color: '#64748b', marginRight: 10 },
  logoutBtn: { padding: 5 },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#0f172a' },
  headerSubtitle: { color: '#64748b', fontSize: 14, marginTop: 2 },
  addBtn: { backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 4 },
  searchContainer: { marginHorizontal: 20, backgroundColor: '#f1f5f9', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, marginBottom: 20 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 45, fontSize: 14, color: '#1e293b' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
  badge: { backgroundColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, justifyContent: 'space-between' },
  lockerCard: { backgroundColor: '#fff', width: (width / 2) - 22, borderRadius: 20, padding: 18, marginBottom: 15, borderWidth: 2, borderColor: '#f1f5f9' },
  lockerCardOccupied: { opacity: 0.6, backgroundColor: '#f8fafc' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  iconBox: { padding: 8, borderRadius: 12 },
  cardLockerNum: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 15 },
  locationText: { fontSize: 12, color: '#94a3b8', marginLeft: 4 },
  reserveBtn: { backgroundColor: '#059669', paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  reserveBtnDisabled: { backgroundColor: '#e2e8f0' },
  reserveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  sideList: { paddingHorizontal: 20 },
  activeCard: { backgroundColor: '#fff', padding: 15, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9', elevation: 1 },
  activeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resBadge: { backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  resBadgeText: { color: '#4f46e5', fontWeight: 'bold', fontSize: 11 },
  resUser: { fontSize: 13, color: '#475569', marginTop: 5, fontWeight: '500' },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 13, marginVertical: 10 },
  historyFixedContainer: { height: 300, backgroundColor: '#f1f5f9', marginHorizontal: 20, borderRadius: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
  historyCard: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#cbd5e1' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  historyLocker: { fontWeight: 'bold', fontSize: 13, color: '#334155' },
  historyStatus: { color: '#059669', fontSize: 11, fontWeight: 'bold' },
  historyDetail: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 25, elevation: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
  modalInput: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 1, padding: 15, alignItems: 'center' },
  cancelBtnText: { color: '#64748b', fontWeight: '700' },
  createBtn: { flex: 1, backgroundColor: '#2563eb', padding: 15, borderRadius: 12, alignItems: 'center' },
  createBtnText: { color: '#fff', fontWeight: 'bold' },
});