import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebase';

// Crear el contexto
const AppContext = createContext();

// Hook personalizado para usar el contexto
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp debe ser usado dentro de AppProvider');
  }
  return context;
};

// Proveedor del contexto
export const AppProvider = ({ children }) => {
  const [state, setState] = useState({
    currentUser: null,
    isAuthenticated: false,
    users: [],
    tournaments: [],
    clubs: [],
    loading: true
  });

  // Cargar datos iniciales desde Firestore
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        console.log('🔄 Cargando datos iniciales desde Firestore...');
        
        // Cargar torneos
        const tournamentsSnapshot = await getDocs(collection(db, 'tournaments'));
        const tournamentsData = tournamentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`📊 Torneos cargados: ${tournamentsData.length}`);

        // Cargar clubes
        const clubsSnapshot = await getDocs(collection(db, 'clubs'));
        const clubsData = clubsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`🏢 Clubes cargados: ${clubsData.length}`);

        // Cargar usuarios
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`👥 Usuarios cargados: ${usersData.length}`);

        setState(prev => ({
          ...prev,
          tournaments: tournamentsData,
          clubs: clubsData,
          users: usersData,
          loading: false
        }));

        console.log('✅ Datos iniciales cargados correctamente');

      } catch (error) {
        console.error('❌ Error cargando datos iniciales:', error);
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    loadInitialData();

    // Suscripción en tiempo real a torneos
    const tournamentsUnsubscribe = onSnapshot(
      collection(db, 'tournaments'), 
      (snapshot) => {
        const tournamentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`🔄 Torneos actualizados: ${tournamentsData.length}`);
        setState(prev => ({ ...prev, tournaments: tournamentsData }));
      },
      (error) => {
        console.error('❌ Error en suscripción a torneos:', error);
      }
    );

    // Suscripción en tiempo real a clubes
    const clubsUnsubscribe = onSnapshot(
      collection(db, 'clubs'),
      (snapshot) => {
        const clubsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`🔄 Clubes actualizados: ${clubsData.length}`);
        setState(prev => ({ ...prev, clubs: clubsData }));
      },
      (error) => {
        console.error('❌ Error en suscripción a clubes:', error);
      }
    );

    // Cleanup subscriptions
    return () => {
      tournamentsUnsubscribe();
      clubsUnsubscribe();
    };
  }, []);

  // ACTIONS - Funciones para modificar el estado
  const actions = {
    // Autenticación
    login: (user) => {
      console.log('🔐 Usuario logueado:', user.name);
      setState(prev => ({
        ...prev,
        currentUser: user,
        isAuthenticated: true
      }));
    },

    logout: () => {
      console.log('🚪 Usuario deslogueado');
      setState(prev => ({
        ...prev,
        currentUser: null,
        isAuthenticated: false
      }));
    },

    updateUserProfile: async (userId, updates) => {
      try {
        console.log('📝 Actualizando perfil usuario en Firebase:', userId);
        const userRef = doc(db, 'users', userId);
        
        await updateDoc(userRef, {
          ...updates,
          updatedAt: new Date().toISOString()
        });

        setState(prev => ({
          ...prev,
          currentUser: { ...prev.currentUser, ...updates },
          users: prev.users.map(user => 
            user.id === userId ? { ...user, ...updates } : user
          )
        }));

        console.log('✅ Perfil actualizado correctamente en Firebase');
      } catch (error) {
        console.error('❌ Error actualizando perfil en Firebase:', error);
        throw error;
      }
    },

    // CLUBES - Funciones para gestión de clubes
    createClub: async (clubData) => {
      try {
        console.log('🏢 Creando nuevo club en Firebase:', clubData.name);
        
        const newClub = {
          ...clubData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'clubs'), newClub);
        
        console.log('✅ Club creado en Firebase con ID:', docRef.id);
        return docRef.id;
      } catch (error) {
        console.error('❌ Error creando club en Firebase:', error);
        throw error;
      }
    },

    joinClub: async (clubId, userId) => {
      try {
        console.log(`👥 Usuario ${userId} uniéndose al club ${clubId} en Firebase`);
        
        const clubRef = doc(db, 'clubs', clubId);
        const clubDoc = await getDoc(clubRef);
        
        if (!clubDoc.exists()) {
          throw new Error('Club no encontrado en Firebase');
        }

        const clubData = clubDoc.data();
        const currentMembers = clubData.members || [];
        
        if (currentMembers.includes(userId)) {
          throw new Error('Ya eres miembro de este club');
        }

        const updatedMembers = [...currentMembers, userId];

        await updateDoc(clubRef, {
          members: updatedMembers,
          updatedAt: new Date().toISOString()
        });

        console.log('✅ Usuario unido al club correctamente en Firebase');
        
        await actions.setActiveClub(userId, clubId);

      } catch (error) {
        console.error('❌ Error uniéndose al club en Firebase:', error);
        throw error;
      }
    },

    leaveClub: async (clubId, userId) => {
      try {
        console.log(`🚪 Usuario ${userId} saliendo del club ${clubId} en Firebase`);
        
        const clubRef = doc(db, 'clubs', clubId);
        const clubDoc = await getDoc(clubRef);
        
        if (!clubDoc.exists()) {
          throw new Error('Club no encontrado en Firebase');
        }

        const clubData = clubDoc.data();
        const currentMembers = clubData.members || [];
        const updatedMembers = currentMembers.filter(id => id !== userId);

        await updateDoc(clubRef, {
          members: updatedMembers,
          updatedAt: new Date().toISOString()
        });

        if (state.currentUser?.activeClub === clubId) {
          await actions.setActiveClub(userId, null);
        }

        console.log('✅ Usuario salió del club correctamente en Firebase');
      } catch (error) {
        console.error('❌ Error saliendo del club en Firebase:', error);
        throw error;
      }
    },

    setActiveClub: async (userId, clubId) => {
      try {
        console.log(`🎯 Estableciendo club activo ${clubId} para usuario ${userId} en Firebase`);
        
        const userRef = doc(db, 'users', userId);
        
        await updateDoc(userRef, {
          activeClub: clubId,
          updatedAt: new Date().toISOString()
        });

        setState(prev => ({
          ...prev,
          currentUser: { ...prev.currentUser, activeClub: clubId },
          users: prev.users.map(user => 
            user.id === userId ? { ...user, activeClub: clubId } : user
          )
        }));

        console.log('✅ Club activo actualizado correctamente en Firebase');
      } catch (error) {
        console.error('❌ Error estableciendo club activo en Firebase:', error);
        throw error;
      }
    },

    updateClub: async (clubId, updates) => {
      try {
        console.log(`✏️ Actualizando club ${clubId} en Firebase`);
        
        const clubRef = doc(db, 'clubs', clubId);
        
        const cleanUpdates = Object.fromEntries(
          Object.entries(updates).filter(([_, value]) => value !== undefined)
        );
        
        await updateDoc(clubRef, {
          ...cleanUpdates,
          updatedAt: new Date().toISOString()
        });

        console.log('✅ Club actualizado correctamente en Firebase');
      } catch (error) {
        console.error('❌ Error actualizando club en Firebase:', error);
        throw error;
      }
    },

    removeMemberFromClub: async (clubId, memberId) => {
      try {
        console.log(`👤 Eliminando miembro ${memberId} del club ${clubId} en Firebase`);
        
        const clubRef = doc(db, 'clubs', clubId);
        const clubDoc = await getDoc(clubRef);
        
        if (!clubDoc.exists()) {
          throw new Error('Club no encontrado en Firebase');
        }

        const clubData = clubDoc.data();
        const currentMembers = clubData.members || [];
        const updatedMembers = currentMembers.filter(id => id !== memberId);

        await updateDoc(clubRef, {
          members: updatedMembers,
          updatedAt: new Date().toISOString()
        });

        const userRef = doc(db, 'users', memberId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists() && userDoc.data().activeClub === clubId) {
          await updateDoc(userRef, {
            activeClub: null,
            updatedAt: new Date().toISOString()
          });
        }

        console.log('✅ Miembro eliminado correctamente en Firebase');
      } catch (error) {
        console.error('❌ Error eliminando miembro en Firebase:', error);
        throw error;
      }
    },

    // TORNEOS - Funciones para gestión de torneos (COMPLETAMENTE CORREGIDAS)
// REEMPLAZAR la función createTournament en AppContext.js
createTournament: async (tournamentData) => {
  try {
    console.log('🏆 Creando nuevo torneo en Firebase:', tournamentData.name);
    
    const newTournament = {
      name: tournamentData.name,
      clubId: tournamentData.clubId,
      createdBy: tournamentData.createdBy,
      players: tournamentData.players || [],
      guestPlayers: tournamentData.guestPlayers || [],
      status: "active",
      matches: tournamentData.matches || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('📝 Datos del torneo a guardar en Firebase:', newTournament);

    const docRef = await addDoc(collection(db, 'tournaments'), newTournament);
    
    // ✅ CORRECCIÓN: Usar el ID de Firebase y mantener consistencia
    const tournamentWithFirebaseId = {
      id: docRef.id, // Usar el ID de Firebase, no Date.now()
      ...newTournament
    };
    
    console.log('✅ Torneo creado en Firebase con ID:', docRef.id);
    return tournamentWithFirebaseId;

  } catch (error) {
    console.error('❌ Error creando torneo en Firebase:', error);
    throw error;
  }
},
    updateTournament: async (tournamentId, updates) => {
      try {
        console.log(`✏️ Actualizando torneo ${tournamentId} en Firebase`);
        
        const tournamentRef = doc(db, 'tournaments', tournamentId);
        
        const tournamentDoc = await getDoc(tournamentRef);
        if (!tournamentDoc.exists()) {
          throw new Error(`Torneo no encontrado en Firebase: ${tournamentId}`);
        }
        
        const cleanUpdates = {
          ...updates,
          updatedAt: new Date().toISOString()
        };
        
        await updateDoc(tournamentRef, cleanUpdates);

        console.log('✅ Torneo actualizado correctamente en Firebase');
      } catch (error) {
        console.error('❌ Error actualizando torneo en Firebase:', error);
        throw error;
      }
    },

    completeTournament: async (tournamentId) => {
      try {
        console.log(`🏁 Completando torneo ${tournamentId} en Firebase`);
        
        const tournamentRef = doc(db, 'tournaments', tournamentId);
        
        const tournamentDoc = await getDoc(tournamentRef);
        if (!tournamentDoc.exists()) {
          throw new Error(`Torneo no encontrado en Firebase: ${tournamentId}`);
        }
        
        await updateDoc(tournamentRef, {
          status: 'completed',
          updatedAt: new Date().toISOString()
        });

        console.log('✅ Torneo completado correctamente en Firebase');
      } catch (error) {
        console.error('❌ Error completando torneo en Firebase:', error);
        throw error;
      }
    },

    addTournamentMatch: async (tournamentId, matchData) => {
      try {
        console.log(`🎾 Añadiendo partido al torneo ${tournamentId} en Firebase`);
        
        const tournamentRef = doc(db, 'tournaments', tournamentId);
        
        const tournamentDoc = await getDoc(tournamentRef);
        if (!tournamentDoc.exists()) {
          throw new Error(`Torneo no encontrado en Firebase: ${tournamentId}`);
        }

        const tournamentData = tournamentDoc.data();
        const currentMatches = tournamentData.matches || [];
        const updatedMatches = [...currentMatches, matchData];

        await updateDoc(tournamentRef, {
          matches: updatedMatches,
          updatedAt: new Date().toISOString()
        });

        console.log('✅ Partido añadido correctamente en Firebase');
      } catch (error) {
        console.error('❌ Error añadiendo partido en Firebase:', error);
        throw error;
      }
    },

    updateMatchScore: async (tournamentId, matchId, updates) => {
      try {
        console.log(`📊 Actualizando puntuación del partido ${matchId} en torneo ${tournamentId} en Firebase`);
        
        const tournamentRef = doc(db, 'tournaments', tournamentId);
        
        const tournamentDoc = await getDoc(tournamentRef);
        if (!tournamentDoc.exists()) {
          throw new Error(`Torneo no encontrado en Firebase: ${tournamentId}`);
        }

        const tournamentData = tournamentDoc.data();
        const currentMatches = tournamentData.matches || [];
        
        const matchExists = currentMatches.some(match => match.id === matchId);
        if (!matchExists) {
          throw new Error(`Partido no encontrado en el torneo: ${matchId}`);
        }

        const updatedMatches = currentMatches.map(match =>
          match.id === matchId ? { ...match, ...updates } : match
        );

        await updateDoc(tournamentRef, {
          matches: updatedMatches,
          updatedAt: new Date().toISOString()
        });

        console.log('✅ Puntuación actualizada correctamente en Firebase');
      } catch (error) {
        console.error('❌ Error actualizando puntuación en Firebase:', error);
        throw error;
      }
    },

    // ✅ FUNCIÓN ELIMINAR TORNEO - COMPLETAMENTE CORREGIDA
// REEMPLAZAR la función deleteTournament en AppContext.js
deleteTournament: async (tournamentId) => {
  try {
    console.log(`🗑️ Eliminando torneo de Firebase: ${tournamentId}`);
    
    // ✅ CORRECCIÓN: Asegurar que el ID sea string
    const tournamentRef = doc(db, 'tournaments', tournamentId.toString());
    const tournamentDoc = await getDoc(tournamentRef);
    
    if (tournamentDoc.exists()) {
      await deleteDoc(tournamentRef);
      console.log('✅ Torneo eliminado de Firebase');
      
      // Actualizar estado local
      setState(prev => ({
        ...prev,
        tournaments: prev.tournaments.filter(t => t.id !== tournamentId)
      }));
      
      return true;
    } else {
      console.log('⚠️ Torneo no encontrado en Firebase');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error eliminando torneo de Firebase:', error);
    throw error;
  }
},
    updateTournaments: (updatedTournaments) => {
      setState(prev => ({ ...prev, tournaments: updatedTournaments }));
    }
  };

  // GETTERS - Funciones para obtener datos calculados
  const getters = {
    // Clubes
    getUserClubs: () => {
      if (!state.currentUser || !state.currentUser.id) return [];
      return state.clubs.filter(club => 
        club.members?.includes(state.currentUser.id)
      );
    },

    getClubMembers: (clubId) => {
      const club = state.clubs.find(c => c.id === clubId);
      if (!club || !club.members) return [];
      
      return club.members.map(memberId => 
        state.users.find(user => user.id === memberId)
      ).filter(Boolean);
    },

    isClubAdmin: (clubId) => {
      const club = state.clubs.find(c => c.id === clubId);
      return club && club.createdBy === state.currentUser?.id;
    },

    getActiveClub: () => {
      if (!state.currentUser?.activeClub) return null;
      return state.clubs.find(club => club.id === state.currentUser.activeClub);
    },

    // Torneos
    getActiveTournaments: () => {
      return state.tournaments.filter(t => t.status === 'active');
    },

    getCompletedTournaments: () => {
      return state.tournaments.filter(t => t.status === 'completed');
    },

    getTournamentById: (tournamentId) => {
      // Manejar tanto string como number IDs
      if (!tournamentId) return null;
    
     const idStr = tournamentId.toString();
     return state.tournaments.find(t => {
      if (!t || !t.id) return false;
      return (
        t.id === tournamentId || 
        t.id === parseInt(tournamentId) || 
        t.id.toString() === idStr
      );
    });
   },


    getTournamentsByClub: () => {
      const activeClub = getters.getActiveClub();
      if (!activeClub) return [];
      
      console.log('🔍 Filtrando torneos por club:', activeClub.id);
      
      return state.tournaments.filter(t => {
        const tournamentClubId = t.clubId;
        const activeClubId = activeClub.id;
        return tournamentClubId === activeClubId;
      });
    },

    getTournamentById: (tournamentId) => {
      return state.tournaments.find(t => t.id === tournamentId);
    },

    // Usuarios
    getUserStats: () => {
      return state.currentUser?.stats || {
        totalMatches: 0,
        totalWins: 0,
        winRate: 0,
        avgPointsPerMatch: 0
      };
    }
  };

  const value = {
    state,
    actions,
    getters
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;