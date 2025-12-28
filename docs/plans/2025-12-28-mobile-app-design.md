# Cinematch Mobile App Design

## Overview

Build native iOS and Android apps for Cinematch using **Expo (React Native)**. The mobile apps will provide a polished, native swiping experience while sharing the same backend API as the existing Next.js web app.

### Goals

- App Store and Play Store presence
- Native-feeling swipe gestures and animations
- Push notifications for matches, friend requests, and session invites
- Maximize code reuse through shared React/TypeScript knowledge

### Distribution

- **iOS:** TestFlight (requires $99/year Apple Developer account)
- **Android:** Direct APK sharing or Play Store ($25 one-time)

---

## Architecture

### Two Separate Codebases

```
cinematch/              # Existing Next.js web app (unchanged)
├── app/
├── package.json
└── ...

cinematch-mobile/       # New Expo app
├── app/                # Screens (Expo Router)
├── components/
├── hooks/
├── lib/                # API client, shared logic
└── package.json
```

### Integration Point

Both apps talk to the same Next.js backend API. No backend changes required except for push notification support.

---

## Navigation & Screens

```
app/
├── (auth)/
│   ├── login.tsx           # Login screen (OAuth)
│   └── _layout.tsx         # Auth flow layout
│
├── (tabs)/
│   ├── _layout.tsx         # Tab bar layout
│   ├── index.tsx           # Dashboard (home tab)
│   ├── solo/
│   │   ├── index.tsx       # Solo mode entry
│   │   ├── swipe.tsx       # Swipe interface (core UX)
│   │   └── list.tsx        # My List (liked movies)
│   └── friends.tsx         # Friends tab
│
├── session/
│   ├── create.tsx          # Create multiplayer session
│   └── [id].tsx            # Active session view
│
└── _layout.tsx             # Root layout (auth check, providers)
```

### Navigation Pattern

- **Tab bar** at bottom for main sections (Dashboard, Solo, Friends)
- **Stack navigation** for session flows
- **Modals** for movie details

---

## Swipe Experience

### Libraries

- `react-native-gesture-handler` - Native gesture recognition
- `react-native-reanimated` - 60fps animations on native thread

### Behavior

- **Swipe right** → Like (card flies off with spring animation)
- **Swipe left** → Dismiss (card flies off left)
- **Tap card** → Expand movie details (modal)
- **Buttons** → Accessibility fallback for Like/Skip

### Performance

- Pre-load 3-5 cards behind current card
- Fetch next batch when stack gets low
- Animations run on native thread (no JS bottleneck)

---

## Authentication

### Flow

1. User taps "Sign in with Google"
2. `expo-auth-session` opens secure browser for OAuth
3. User authenticates with Google
4. Token returned to app
5. Token stored in `expo-secure-store` (encrypted)
6. All API calls include token in Authorization header

### Session Persistence

Token stored locally. User stays logged in until explicit logout or token expiration.

---

## API Layer

### API Client

```typescript
// lib/api.ts
import * as SecureStore from 'expo-secure-store';

const API_BASE = 'https://your-cinematch-domain.com';

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = await SecureStore.getItemAsync('session_token');

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}
```

### Key Endpoints

| Endpoint | Usage |
|----------|-------|
| `GET /api/solo/movies` | Fetch swipe cards |
| `POST /api/solo/list` | Save liked movie |
| `POST /api/solo/dismissed` | Track dismissed movie |
| `GET /api/solo/list` | My List screen |
| `GET /api/friends` | Friends list |
| `POST /api/sessions` | Create session |

### Data Fetching

Use **TanStack Query** for caching, refetching, and loading states.

---

## Push Notifications

### Use Cases

- Match found (multiplayer): "You and Alex both liked Inception!"
- Friend request: "Sam wants to be friends"
- Session invite: "Join movie night with the group"

### Implementation

Use `expo-notifications` with Expo Push Service (free):

1. App registers for push notifications on startup
2. Push token sent to backend: `POST /api/users/push-token`
3. Backend stores token associated with user
4. When event occurs, backend sends notification via Expo Push API

### Backend Changes Required

- New endpoint: `POST /api/users/push-token`
- Notification sending logic for match/friend/session events

---

## Development Workflow

### Local Development

```bash
cd cinematch-mobile
npx expo start
```

Options:
- Scan QR with Expo Go app (physical device)
- Press `i` for iOS Simulator
- Press `a` for Android Emulator

### Building for Distribution

```bash
# iOS (uploads to TestFlight)
eas build --platform ios

# Android (generates APK)
eas build --platform android
```

### EAS Build Pricing

| Plan | Cost | Builds/Month |
|------|------|--------------|
| Free | $0 | 30 |
| Production | $15/mo | Unlimited |

### Over-the-Air Updates

Push JS updates without App Store review:

```bash
eas update --branch production
```

---

## Testing Approach

### Manual Testing (Primary)

- Test on physical iPhone for gesture feel
- Test on Android emulator
- Use Expo Go during development for fast iteration

### Automated Testing (Lightweight)

| Type | Tool | What to Test |
|------|------|--------------|
| Unit | Jest | API client, utilities |
| Component | React Native Testing Library | Screen rendering |
| E2E | Skip initially | - |

### Focus Areas

- Auth flow (token storage, logout)
- API error handling
- Critical business logic (swipe saves, list updates)

---

## Key Dependencies

```json
{
  "expo": "~50.x",
  "expo-router": "~3.x",
  "expo-auth-session": "~5.x",
  "expo-secure-store": "~12.x",
  "expo-notifications": "~0.27.x",
  "react-native-gesture-handler": "~2.x",
  "react-native-reanimated": "~3.x",
  "@tanstack/react-query": "~5.x"
}
```

---

## Implementation Phases

### Phase 1: Foundation
- Initialize Expo project with Expo Router
- Set up navigation structure (tabs, stacks)
- Implement OAuth login flow
- Create API client with token management

### Phase 2: Core Features
- Build swipe card component with gestures
- Implement solo mode (swipe, like, dismiss)
- Build My List screen
- Add movie details modal

### Phase 3: Social Features
- Friends list screen
- Session creation flow
- Multiplayer session view

### Phase 4: Polish & Distribution
- Push notification setup
- Backend endpoints for push tokens
- EAS Build configuration
- TestFlight and Play Store submission

---

## Open Questions

None at this time. Design validated through brainstorming session.
