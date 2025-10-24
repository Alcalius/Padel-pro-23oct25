// En App.js o un archivo separado data.js
const initialData = {
  users: [
    { 
      id: 1, 
      name: "Juan Pérez", 
      email: "juan@email.com", 
      avatar: "👨", 
      password: "123456",
      activeClub: 1,
      clubMemberships: [1, 2] // Puede pertenecer a múltiples clubes
    },
    { 
      id: 2, 
      name: "María García", 
      email: "maria@email.com", 
      avatar: "👩", 
      password: "123456",
      activeClub: 1,
      clubMemberships: [1]
    }
  ],
  
  clubs: [
    {
      id: 1,
      name: "Pádel Masters",
      description: "Club de pádel para jugadores intermedios",
      createdBy: 1, // ID del administrador
      password: "club123", // Contraseña para unirse
      members: [1, 2, 3, 4], // IDs de miembros
      createdAt: "2024-01-15"
    },
    {
      id: 2,
      name: "Elite Pádel",
      description: "Para jugadores avanzados",
      createdBy: 2,
      password: "elite456",
      members: [1, 5, 6],
      createdAt: "2024-01-20"
    }
  ],
  
  clubStats: [
    {
      userId: 1,
      clubId: 1,
      totalPoints: 45,
      matchesPlayed: 12,
      matchesWon: 8,
      globalScore: 3.75
    },
    {
      userId: 1,
      clubId: 2,
      totalPoints: 30,
      matchesPlayed: 10,
      matchesWon: 6,
      globalScore: 3.0
    }
  ]
};