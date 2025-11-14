// src/components/common/Icon.js
import React from 'react';

export default function Icon({ name, size = 20, color = "currentColor", className = "" }) {
  const icons = {

    home: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M3 9l9-7 9 7v2M3 9v11M21 9v11M3 20h6M15 20h6" stroke={color} strokeWidth="2" fill="none"/>
        <path d="M9 12v8M15 12v8M9 12h6" stroke={color} strokeWidth="2" fill="none"/>
      </svg>
    ),
    tournament: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="2" y="4" width="20" height="16" rx="1.5" stroke={color} strokeWidth="2.5"/>
        <line x1="12" y1="4" x2="12" y2="20" stroke={color} strokeWidth="1" strokeDasharray="1,1"/>
        <line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="1"/>
        <line x1="5.5" y1="4" x2="5.5" y2="20" stroke={color} strokeWidth="1"/>
        <line x1="18.5" y1="4" x2="18.5" y2="20" stroke={color} strokeWidth="1"/>
      </svg>
    ),
    club: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="2"/>
        <circle cx="9" cy="7" r="4" stroke={color} strokeWidth="2"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    profile: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="2"/>
        <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    add: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
        <path d="M12 8v8M8 12h8" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    stats: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <line x1="18" y1="20" x2="18" y2="10" stroke={color} strokeWidth="2"/>
        <line x1="12" y1="20" x2="12" y2="4" stroke={color} strokeWidth="2"/>
        <line x1="6" y1="20" x2="6" y2="14" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    magic: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 3L13.5 7.5L18 9L13.5 10.5L12 15L10.5 10.5L6 9L10.5 7.5L12 3Z" stroke={color} strokeWidth="2"/>
        <path d="M19 21L20 19L21 21L23 22L21 23L20 25L19 23L17 22L19 21Z" stroke={color} strokeWidth="2"/>
        <path d="M3 15L4 13L5 15L7 16L5 17L4 19L3 17L1 16L3 15Z" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    trophy: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M6 2C6 0 10 0 12 0C14 0 18 0 18 2V9C18 12 15 14 12 14C9 14 6 12 6 9V2Z" 
              stroke={color} strokeWidth="2" fill="none"/>
        <line x1="12" y1="14" x2="12" y2="17" stroke={color} strokeWidth="2"/>
        <rect x="8" y="17" width="8" height="4" stroke={color} strokeWidth="2" fill="none"/>
        <path d="M4 5C3 6 3 8 5 9" 
              stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M20 5C21 6 21 8 19 9" 
              stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"/>
      </svg>
    ),
    starCircle: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2"/>
        <path d="M12 6.5l1.4 4.2 4.2.5-3.2 2.8 1 4.2-3.6-2.5-3.6 2.5 1-4.2-3.2-2.8 4.2-.5z" 
              stroke={color} strokeWidth="1.5" fill="none"/>
      </svg>
    ),
    summary: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="5" y="5" width="14" height="14" rx="2" stroke={color} strokeWidth="2"/>
        <line x1="8" y1="9" x2="16" y2="9" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <line x1="8" y1="15" x2="16" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    settings: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    logout: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={color} strokeWidth="2"/>
        <polyline points="16 17 21 12 16 7" stroke={color} strokeWidth="2"/>
        <line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    edit: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth="2"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    lock: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} strokeWidth="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    calendar: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke={color} strokeWidth="2"/>
        <line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="2"/>
        <line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="2"/>
        <line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="2"/>
        <circle cx="9" cy="7" r="4" stroke={color} strokeWidth="2"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    play: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <polygon points="5,3 19,12 5,21" stroke={color} strokeWidth="2" fill={color}/>
      </svg>
    ),
    history: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
        <polyline points="12 6 12 12 16 14" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <polyline points="20 6 9 17 4 12" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    close: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2"/>
        <line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    delete: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <polyline points="3,6 5,6 21,6" stroke={color} strokeWidth="2"/>
        <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6" stroke={color} strokeWidth="2"/>
        <line x1="10" y1="11" x2="10" y2="17" stroke={color} strokeWidth="2"/>
        <line x1="14" y1="11" x2="14" y2="17" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    target: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
        <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2"/>
        <circle cx="12" cy="12" r="2" stroke={color} strokeWidth="2"/>
      </svg>
    ),    
    padel: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
        <path d="M2 12C2 7 7 2 12 2C17 2 22 7 22 12C22 17 17 22 12 22C7 22 2 17 2 12Z" stroke={color} strokeWidth="1.5"/>
        <path d="M6 4C9 8 9 16 6 20M18 4C15 8 15 16 18 20" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
        star: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path
          d="M12 3.5l2.1 4.3 4.7.7-3.4 3.2.8 4.6L12 13.9 7.8 16.3l.8-4.6-3.4-3.2 4.7-.7L12 3.5z"
          stroke={color}
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
        sun: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2" />
        <line x1="12" y1="2" x2="12" y2="5" stroke={color} strokeWidth="2" />
        <line x1="12" y1="19" x2="12" y2="22" stroke={color} strokeWidth="2" />
        <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" stroke={color} strokeWidth="2" />
        <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" stroke={color} strokeWidth="2" />
        <line x1="2" y1="12" x2="5" y2="12" stroke={color} strokeWidth="2" />
        <line x1="19" y1="12" x2="22" y2="12" stroke={color} strokeWidth="2" />
        <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" stroke={color} strokeWidth="2" />
        <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" stroke={color} strokeWidth="2" />
      </svg>
    ),
     bug: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="8" y="8" width="8" height="10" rx="3" stroke={color} strokeWidth="2"/>
        <circle cx="12" cy="6" r="2" stroke={color} strokeWidth="2"/>
        <line x1="6" y1="10" x2="4" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <line x1="6" y1="14" x2="3.5" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <line x1="6" y1="18" x2="4" y2="19" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <line x1="18" y1="10" x2="20" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <line x1="18" y1="14" x2="20.5" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <line x1="18" y1="18" x2="20" y2="19" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <line x1="12" y1="4" x2="12" y2="2" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    moon: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path
          d="M20 14.5A7.5 7.5 0 0 1 10.5 5 6 6 0 1 0 20 14.5z"
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
swords: (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    {/* Espada izquierda completa y grande */}
    <rect x="6" y="2" width="3" height="4" fill={color} rx="1"/> {/* Empuñadura */}
    <rect x="7" y="6" width="1" height="12" fill={color}/> {/* Hoja */}
    <rect x="5" y="6" width="5" height="2" fill={color} rx="0.5"/> {/* Guarda */}
    <path d="M7 18L5 22" stroke={color} strokeWidth="2" strokeLinecap="round"/> {/* Punta */}
    
    {/* Espada derecha completa y grande */}
    <rect x="15" y="2" width="3" height="4" fill={color} rx="1"/> {/* Empuñadura */}
    <rect x="16" y="6" width="1" height="12" fill={color}/> {/* Hoja */}
    <rect x="14" y="6" width="5" height="2" fill={color} rx="0.5"/> {/* Guarda */}
    <path d="M17 18L19 22" stroke={color} strokeWidth="2" strokeLinecap="round"/> {/* Punta */}
  </svg>
),
    sofa: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M3 18V10C3 8.34315 4.34315 7 6 7H18C19.6569 7 21 8.34315 21 10V18" stroke={color} strokeWidth="2"/>
        <path d="M3 18H21" stroke={color} strokeWidth="2"/>
        <path d="M6 15V18" stroke={color} strokeWidth="2"/>
        <path d="M18 15V18" stroke={color} strokeWidth="2"/>
        <path d="M9 12H15" stroke={color} strokeWidth="1.5"/>
      </svg>
    )
  };

  return icons[name] || null;
}