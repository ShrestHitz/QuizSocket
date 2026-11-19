/**
 * SVG Avatars matching the playful cartoon aesthetic from the screenshot
 */

const AVATARS = [
  {
    id: "avatar-1",
    name: "Cheeky Scholar",
    svg: `<svg viewBox="0 0 100 100" class="avatar-svg">
      <circle cx="50" cy="50" r="46" fill="#FDE047" stroke="#18181B" stroke-width="4"/>
      <!-- Hair/Cap -->
      <path d="M 25 38 C 25 15, 75 15, 75 38 C 65 30, 35 30, 25 38 Z" fill="#6366F1" stroke="#18181B" stroke-width="3"/>
      <path d="M 50 18 L 82 22 L 72 32 Z" fill="#EC4899" stroke="#18181B" stroke-width="2.5"/>
      <!-- Face -->
      <circle cx="50" cy="56" r="28" fill="#FED7AA" stroke="#18181B" stroke-width="3.5"/>
      <!-- Big Round Glasses -->
      <circle cx="40" cy="54" r="11" fill="#FFFFFF" stroke="#18181B" stroke-width="3"/>
      <circle cx="60" cy="54" r="11" fill="#FFFFFF" stroke="#18181B" stroke-width="3"/>
      <line x1="51" y1="54" x2="49" y2="54" stroke="#18181B" stroke-width="3.5"/>
      <!-- Eyes -->
      <circle cx="41" cy="54" r="4.5" fill="#18181B"/>
      <circle cx="61" cy="54" r="4.5" fill="#18181B"/>
      <circle cx="43" cy="52" r="1.5" fill="#FFFFFF"/>
      <circle cx="63" cy="52" r="1.5" fill="#FFFFFF"/>
      <!-- Cheeky Smile -->
      <path d="M 44 68 Q 50 76, 58 68" fill="none" stroke="#18181B" stroke-width="3.5" stroke-linecap="round"/>
      <ellipse cx="32" cy="62" rx="3.5" ry="2" fill="#F43F5E" opacity="0.6"/>
      <ellipse cx="68" cy="62" rx="3.5" ry="2" fill="#F43F5E" opacity="0.6"/>
    </svg>`
  },
  {
    id: "avatar-2",
    name: "Cyber Kid",
    svg: `<svg viewBox="0 0 100 100" class="avatar-svg">
      <circle cx="50" cy="50" r="46" fill="#A78BFA" stroke="#18181B" stroke-width="4"/>
      <!-- Head -->
      <circle cx="50" cy="54" r="28" fill="#FFEDD5" stroke="#18181B" stroke-width="3.5"/>
      <!-- Spiky Teal Hair -->
      <path d="M 24 45 L 32 20 L 42 32 L 54 16 L 62 30 L 76 22 L 74 46 Z" fill="#06B6D4" stroke="#18181B" stroke-width="3"/>
      <!-- Headset -->
      <path d="M 22 52 C 22 28, 78 28, 78 52" fill="none" stroke="#18181B" stroke-width="5" stroke-linecap="round"/>
      <rect x="18" y="48" width="8" height="15" rx="3" fill="#FF5B89" stroke="#18181B" stroke-width="2.5"/>
      <rect x="74" y="48" width="8" height="15" rx="3" fill="#FF5B89" stroke="#18181B" stroke-width="2.5"/>
      <!-- Eyes & Smile -->
      <circle cx="41" cy="55" r="4" fill="#18181B"/>
      <circle cx="59" cy="55" r="4" fill="#18181B"/>
      <path d="M 43 68 Q 50 74, 57 68" fill="none" stroke="#18181B" stroke-width="3" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: "avatar-3",
    name: "Pixel Wizard",
    svg: `<svg viewBox="0 0 100 100" class="avatar-svg">
      <circle cx="50" cy="50" r="46" fill="#38E54D" stroke="#18181B" stroke-width="4"/>
      <!-- Wizard Hat -->
      <path d="M 20 44 L 50 10 L 80 44 Z" fill="#7C3AED" stroke="#18181B" stroke-width="3.5"/>
      <ellipse cx="50" cy="44" rx="34" ry="7" fill="#FBBF24" stroke="#18181B" stroke-width="3"/>
      <!-- Face -->
      <circle cx="50" cy="58" r="26" fill="#FED7AA" stroke="#18181B" stroke-width="3.5"/>
      <!-- Cool Star Glasses -->
      <path d="M 33 56 L 45 56 L 39 50 Z" fill="#EC4899" stroke="#18181B" stroke-width="2"/>
      <path d="M 55 56 L 67 56 L 61 50 Z" fill="#EC4899" stroke="#18181B" stroke-width="2"/>
      <circle cx="39" cy="58" r="3" fill="#18181B"/>
      <circle cx="61" cy="58" r="3" fill="#18181B"/>
      <path d="M 45 70 Q 50 76, 55 70" fill="none" stroke="#18181B" stroke-width="3" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: "avatar-4",
    name: "Router Fox",
    svg: `<svg viewBox="0 0 100 100" class="avatar-svg">
      <circle cx="50" cy="50" r="46" fill="#FB923C" stroke="#18181B" stroke-width="4"/>
      <!-- Ears -->
      <polygon points="26,38 20,18 42,28" fill="#EA580C" stroke="#18181B" stroke-width="3"/>
      <polygon points="74,38 80,18 58,28" fill="#EA580C" stroke="#18181B" stroke-width="3"/>
      <!-- Head -->
      <circle cx="50" cy="56" r="28" fill="#FB923C" stroke="#18181B" stroke-width="3.5"/>
      <path d="M 26 56 Q 50 76, 74 56 Q 50 86, 26 56 Z" fill="#FFFFFF" stroke="#18181B" stroke-width="2.5"/>
      <!-- Eyes & Nose -->
      <ellipse cx="38" cy="52" rx="4" ry="5" fill="#18181B"/>
      <ellipse cx="62" cy="52" rx="4" ry="5" fill="#18181B"/>
      <polygon points="46,65 54,65 50,70" fill="#18181B"/>
    </svg>`
  },
  {
    id: "avatar-5",
    name: "Brainy Bea",
    svg: `<svg viewBox="0 0 100 100" class="avatar-svg">
      <circle cx="50" cy="50" r="46" fill="#38BDF8" stroke="#18181B" stroke-width="4"/>
      <!-- Face -->
      <circle cx="50" cy="54" r="27" fill="#FCE7F3" stroke="#18181B" stroke-width="3.5"/>
      <!-- Double Buns Hair -->
      <circle cx="25" cy="30" r="14" fill="#9333EA" stroke="#18181B" stroke-width="3"/>
      <circle cx="75" cy="30" r="14" fill="#9333EA" stroke="#18181B" stroke-width="3"/>
      <path d="M 28 42 Q 50 26, 72 42" fill="#9333EA" stroke="#18181B" stroke-width="3"/>
      <!-- Big Eyes -->
      <circle cx="40" cy="55" r="5" fill="#18181B"/>
      <circle cx="60" cy="55" r="5" fill="#18181B"/>
      <circle cx="42" cy="53" r="1.5" fill="#FFF"/>
      <circle cx="62" cy="53" r="1.5" fill="#FFF"/>
      <!-- Smile -->
      <path d="M 44 68 Q 50 74, 56 68" fill="none" stroke="#18181B" stroke-width="3" stroke-linecap="round"/>
    </svg>`
  },
  {
    id: "avatar-6",
    name: "Byte Robot",
    svg: `<svg viewBox="0 0 100 100" class="avatar-svg">
      <circle cx="50" cy="50" r="46" fill="#F472B6" stroke="#18181B" stroke-width="4"/>
      <!-- Antenna -->
      <line x1="50" y1="16" x2="50" y2="28" stroke="#18181B" stroke-width="4"/>
      <circle cx="50" cy="14" r="5" fill="#FACC15" stroke="#18181B" stroke-width="2.5"/>
      <!-- Robot Head -->
      <rect x="26" y="28" width="48" height="44" rx="8" fill="#E2E8F0" stroke="#18181B" stroke-width="3.5"/>
      <!-- Screen/Visor -->
      <rect x="34" y="38" width="32" height="16" rx="4" fill="#1E293B" stroke="#18181B" stroke-width="2"/>
      <circle cx="42" cy="46" r="3.5" fill="#38E54D"/>
      <circle cx="58" cy="46" r="3.5" fill="#38E54D"/>
      <!-- Grille Teeth -->
      <line x1="38" y1="62" x2="62" y2="62" stroke="#18181B" stroke-width="2"/>
      <line x1="44" y1="58" x2="44" y2="66" stroke="#18181B" stroke-width="2"/>
      <line x1="50" y1="58" x2="50" y2="66" stroke="#18181B" stroke-width="2"/>
      <line x1="56" y1="58" x2="56" y2="66" stroke="#18181B" stroke-width="2"/>
    </svg>`
  }
];

function getAvatarSvg(avatarId) {
  const av = AVATARS.find(a => a.id === avatarId) || AVATARS[0];
  return av.svg;
}
