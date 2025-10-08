# CricBid - Premier Cricket Auction Platform

Welcome to CricBid, the ultimate cricket auction platform where strategy meets passion!

## 🏏 Features

- **Real-time Bidding**: Experience live cricket auctions with WebSocket-powered real-time updates
- **Team Building**: Build your dream cricket team through strategic bidding
- **Wallet Management**: Secure wallet system with crores-based currency
- **AI Analytics**: Post-auction insights and team performance analysis
- **Role-based Access**: Separate dashboards for users and administrators
- **Responsive Design**: Beautiful, cricket-themed UI that works on all devices

## 🚀 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with custom cricket theme
- **State Management**: Zustand
- **Real-time**: Socket.IO Client
- **HTTP Client**: Axios with credentials support
- **UI Components**: shadcn/ui with custom variants
- **Animations**: Framer Motion
- **Routing**: React Router v6

## 🎯 Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm
- Backend API running on `http://localhost:3000`

### Installation

1. Clone the repository:
```bash
git clone <YOUR_GIT_URL>
cd cricbid-frontend
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure:
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

4. Start the development server:
```bash
npm run dev
# or
pnpm dev
```

The application will be available at `http://localhost:8080`

## 🏗️ Architecture

### Pages Structure
- `/` - Auth Splash (Login/Register)
- `/dashboard` - User Dashboard
- `/admin` - Admin Dashboard
- `/auctions` - Auction Marketplace
- `/auctions/:id/waiting-room` - Pre-auction waiting
- `/auctions/:id/live` - Live Auction Interface
- `/players` - Player Database
- `/team` - Team Management
- `/wallet` - Wallet & Transactions
- `/leaderboard` - Rankings & Statistics

### Key Components
- **AppLayout**: Main application shell with sidebar navigation
- **RequireAuth**: Route protection with role-based access
- **StatCard**: Reusable statistics display
- **CountdownRing**: Animated countdown timer
- **RoleBadge**: Player role indicators

### State Management
- **Auth Store**: User authentication and profile
- **Auction Store**: Real-time auction state and bidding
- **Socket Integration**: Live updates and notifications

## 🎨 Design System

The application uses a custom cricket-themed design system built on Tailwind CSS:

- **Colors**: Rich greens inspired by cricket pitches
- **Typography**: Clean, readable fonts with proper hierarchy
- **Components**: Consistent, accessible UI components
- **Animations**: Smooth transitions and micro-interactions
- **Responsive**: Mobile-first design approach

## 🔧 API Integration

All API calls use session-based authentication with `withCredentials: true`. The app automatically handles:

- Auth token refresh
- Error boundaries and user feedback
- Loading states and optimistic updates
- Real-time synchronization via WebSockets

## 🚀 Deployment

The app is ready for deployment on any static hosting service:

```bash
npm run build
```

The built files will be in the `dist` directory.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ for cricket enthusiasts worldwide!