# 🎬 Watch-2-Gether

Watch-2-Gether is a premium, real-time synchronized video-watching web application. It allows friends to create private viewing rooms, watch videos together synchronously, chat in real-time, manage dynamic playlists, view social activities, and analyze viewing analytics on a sleek dashboard.

---

## 🚀 Key Features

### 🔄 Real-Time Synchronized Player
- **Drift Correction Heartbeat**: The server runs an authoritative 10-second heartbeat ensuring guest playback coordinates match the host's exactly, preventing drift.
- **Unified Sync**: Actions such as play, pause, seek, and video changes immediately propagate to all room members.
- **Host Settings**: Hosts can toggle permission rules dynamically, either restricting control solely to themselves or enabling guest playback commands.
- **Host Transfer**: Effortlessly transfer room leadership (`👑`) to any other member in the room.

### 📋 Video Queue Management
- **Request Queue**: Guests can request YouTube or online video links.
- **Host Approval**: A moderation system requiring the host to review, approve, or reject video suggestions before they join the active playlist.
- **Dynamic Playlist Updates**: Real-time queue sync across all participants as additions, playbacks, and removals happen.

### 💬 In-Room Chat System
- **Real-Time Messaging**: Built-in chat channel for room participants.
- **System Logs**: System messages automatically log critical room events in chat, e.g., when videos change, users join/leave, or when requests are queued.
- **Persistent Logs**: Saves and displays up to the 50 most recent messages when users refresh or join mid-session.

### 👥 Social & Friends System
- **Friend Directory**: Discover users, send/accept/retract friend requests, and manage active friendships.
- **Shared Watch Metrics**: Tracks mutual watch duration, keeping logs of which friends you spend the most watch-time with.
- **Leaderboard / Top Friends**: A customized tab celebrating your top friends ranked by shared watch minutes.

### 📊 Rich Analytical Dashboard
- **Daily Watch Activity**: Beautiful bar charts illustrating the minutes watched on different days.
- **Content Classification**: Automated classification categorizing watch history into *Music*, *Gaming*, *Education*, *Comedy*, *Film & Animation*, *News & Politics*, and *People & Blogs* based on video titles.
- **Distribution Charts**: Modern pie/donut charts visually parsing content preferences.
- **Personal Records**: Track lifetime watch minutes, shared watch minutes, largest hosted rooms, and longest continuous watch sessions.

### 🔒 Secure Auth System
- **Dual Flow**: Native developer authentication coupled with standard Google OAuth 2.0.
- **Route Guarding**: JWT-driven session security keeping room, social, profile, and analytics pages private.

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 19 & Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Charts**: Recharts
- **Routing**: React Router v7
- **APIs**: Axios & Socket.io Client

### Backend
- **Platform**: Node.js & Express (ES Modules)
- **Database**: MongoDB & Mongoose
- **Real-Time Gateway**: Socket.io
- **Auth Strategy**: Passport.js (Google OAuth 2.0 Strategy) & JSON Web Tokens (JWT)

---

## 📂 Project Structure

```text
watch-2-gether/
├── client/                     # Frontend Vite + React application
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # Reusable components (VideoPlayer, ChatBox, Navbar, etc.)
│   │   ├── pages/              # Main viewpages (Dashboard, Room, Profile, Analytics, etc.)
│   │   ├── services/           # Axios interceptors and API client
│   │   ├── store/              # Zustand global state (Auth, Room, Socket, Friends)
│   │   ├── App.jsx             # Main routing and theme initializer
│   │   └── index.css           # Tailwind system directives
│   └── package.json            # Client packages & scripts
│
└── server/                     # Backend Express server
    ├── config/                 # DB configuration & Passport strategy definition
    ├── controllers/            # Request handlers (auth, room, analytics, friends)
    ├── middleware/             # Route protections (protect middleware)
    ├── models/                 # Mongoose database schemas (User, Room, Message, etc.)
    ├── routes/                 # API endpoints
    ├── sockets/                # Socket.io handlers & sync heartbeats
    ├── server.js               # Entry point
    └── package.json            # Server packages & scripts
```

---

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **MongoDB** (Local instance or MongoDB Atlas cluster connection string)
- **Google Cloud Console Credentials** (for Google OAuth)

### 1. Clone & Prepare
```bash
git clone <repository-url>
cd watch-2-gether
```

### 2. Backend Setup
1. Navigate to the server folder:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `server` directory and define the following variables:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>
   JWT_SECRET=your_jwt_secret_key_here
   CLIENT_URL=http://localhost:5173
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
   ```
4. Start the backend in development mode:
   ```bash
   npm run dev
   ```
   The backend server will run on `http://localhost:5000`.

### 3. Frontend Setup
1. Navigate to the client folder (from the root directory):
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. (Optional) Create a `.env` file in the `client` directory to point to a custom API URL:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
4. Start the frontend:
   ```bash
   npm run dev
   ```
   The application will run on `http://localhost:5173`.

---

## 📡 Socket.io Event Documentation

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `join-room` | Client ➡️ Server | `{ roomCode: string }` | Registers user to room socket channel, broadcasts join, and syncs room state. |
| `user-joined` | Server ➡️ Client | `{ userId, username, users }` | Emitted when a new user enters a room. |
| `video-change` | Client ➡️ Server | `{ videoId: string }` | Sent by host to select a new YouTube video. |
| `video-play` | Bidirectional | `{ currentTime: number, syncVersion }` | Commands participants to seek to target and play. |
| `video-pause` | Bidirectional | `{ currentTime: number, syncVersion }` | Commands participants to pause. |
| `video-seek` | Bidirectional | `{ currentTime: number, syncVersion }` | Forces all clients to seek to matching timestamp. |
| `video-sync` | Server ➡️ Client | `{ currentTime, syncVersion, isPlaying }` | Periodic drift alignment packet broadcasted to guests. |
| `add-to-queue` | Client ➡️ Server | `{ videoId: string }` | Appends a video request into the room's queue. |
| `approve-queue-item`| Client ➡️ Server | `{ itemId: string }` | Sent by host to approve a video and make it active. |
| `remove-from-queue` | Client ➡️ Server | `{ itemId: string }` | Sent by host to decline or delete a queue request. |
| `transfer-host` | Client ➡️ Server | `{ newHostId: string }` | Passes room control / host privileges to another user. |
| `chat-message` | Bidirectional | `{ message: string }` | Broadcasts standard/system text messages inside the room. |

---

## 🔐 API Routes Summary

### Authentication & Profile (`/api/auth`)
- `GET /google` - Redirects to Google authentication consent screen.
- `GET /google/callback` - OAuth success landing handler that signs JWT and sets user cookies.
- `GET /me` - Fetches the authenticated user profile details.
- `PUT /profile` - Edits user avatar, bio, and visual profiles.

### Room Management (`/api/rooms`)
- `GET /` - Gets all public/available watch rooms.
- `POST /` - Creates a new room (hosts can set custom passwords or guest permissions).
- `GET /:roomCode` - Retreives individual metadata for a target room.

### Friends Directory (`/api/friends`)
- `GET /` - Fetches list of active friends and pending requests.
- `POST /request` - Sends a friend request to a target user.
- `POST /accept` - Accepts an incoming friend request.
- `DELETE /:friendshipId` - Removes friend or declines a pending invitation.

### Analytics Endpoint (`/api/analytics`)
- `GET /` - Aggregates lifetime usage watch records, categories, and visual coordinates.

---

## 🎨 Design Theme
Watch-2-Gether employs a stunning design aesthetic featuring:
- **Dark Mode First**: Deep background colors accented with vibrant violet and indigo controls.
- **Glassmorphism Panels**: Semi-transparent, blurred layers creating depths of interface context.
- **Micro-Animations**: Smooth scale-ups, list slide-ins (via Framer Motion), and reactive hover configurations.
- **Modern Charts**: Rich interactive diagrams detailing watch durations and category trends.
