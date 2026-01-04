# CLM (Contract Lifecycle Management) System - Production Ready

A complete, production-level Contract Lifecycle Management system with modern UI/UX design, full API integration, and authentication.

## 🎨 Design Features

### **Purple/Orange Gradient Authentication**
- Split-screen design with visual art on the left
- Three integrated forms: Login, Signup, and Forgot Password
- All connected to backend API endpoints
- Smooth transitions and professional polish

### **Soft UI Dashboard**
- Warm cream background (#F2F0EB)
- Deep navy sidebar (#0F141F)
- Coral-to-orange gradient hero card (#FF7E5F → #FEB47B)
- Nunito font family
- Rounded cards (24px radius) with soft shadows

### **Expandable Sidebar**
- Hover to expand from 90px to 264px
- Smooth transitions
- User profile with logout functionality
- Active state indicators

## 🔌 Complete API Integration

### **All 12 Endpoints Integrated:**

1. **Authentication** ✅
   - `POST /api/auth/register/` - User signup
   - `POST /api/auth/login/` - User login
   - `POST /api/auth/token/refresh/` - Auto token refresh
   - `POST /api/auth/forgot-password/` - Password reset
   - `POST /api/auth/reset-password/` - Password reset confirmation

2. **Contracts** ✅
   - `GET /api/contracts/statistics/` - Dashboard statistics
   - `GET /api/contracts/recent/` - Recent contracts list
   - `POST /api/contracts/validate-clauses/` - Clause validation

3. **Templates** ✅
   - `GET /api/contract-templates/` - Template library

4. **Clauses** ✅
   - `GET /api/clauses/` - Standard clauses

5. **Generation Jobs** ✅
   - `GET /api/generation-jobs/` - System activity tracking

6. **Features** ✅
   - `GET /api/` - Available endpoints

## 📁 File Structure

```
clm-frontend/
├── app/
│   ├── components/
│   │   ├── AuthPage.tsx          # Authentication (Login/Signup/Forgot Password)
│   │   ├── DashboardContent.tsx  # Main dashboard with all endpoints
│   │   └── Sidebar.tsx           # Expandable navigation sidebar
│   ├── lib/
│   │   └── api.ts                # Centralized API service
│   ├── globals.css               # Custom styles with Nunito font
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # App entry with routing
├── public/
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd clm-frontend
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Open Browser
Navigate to [http://localhost:3000](http://localhost:3000)

## 🔐 Authentication Flow

### **First Time Users:**
1. Click "Sign up" on the login page
2. Fill in: First Name, Last Name, Email, Password
3. Submit - Automatically logged in upon success

### **Existing Users:**
1. Enter email and password
2. Click "Sign In"
3. Access token stored in localStorage

### **Forgot Password:**
1. Click "Forgot password?" link
2. Enter email
3. Receive reset link via API

### **Automatic Token Refresh:**
- Tokens auto-refresh on 401 errors
- Seamless user experience
- Falls back to login on refresh failure

## 📊 Dashboard Features

### **Statistics Cards**
- **Total Contracts** - Large gradient hero card with completion rate
- **Drafts** - Yellow card with progress bar
- **Approved** - Green card with execution ready status
- **Pending Review** - Blue card
- **Rejected** - Red card
- **Templates Count** - Purple card
- **Active Jobs** - Gradient card with live count

### **Recent Contracts**
- List view with contract titles
- Color-coded status pills (Approved/Draft/Pending/Rejected)
- Hover effects and animations
- Document icons
- Updated timestamps

### **System Activity (Generation Jobs)**
- Real-time job status tracking
- Processing indicators with animations
- Progress bars for active jobs
- Success/Failed status badges
- Timeline view

### **Templates & Clauses**
- Side-by-side display
- Quick access to template library
- Standard clauses management
- "Add" buttons for new items

## 🎯 Key Features

### **Real-Time Updates**
- Auto-refresh every 30 seconds
- Manual refresh button
- Spinning "Syncing Data..." indicator during API calls

### **Error Handling**
- User-friendly error messages
- Automatic retry on token expiration
- Network failure handling
- Form validation

### **Loading States**
- Skeleton screens
- Spinning indicators
- Disabled buttons during submission
- Progressive enhancement

### **Responsive Design**
- Mobile-first approach
- Tablet and desktop optimized
- Grid layouts that adapt
- Touch-friendly interfaces

## 🔧 API Configuration

Base URL: `https://clm-backend-y5ta.onrender.com/api`

### **Token Management**
Tokens are stored in `localStorage`:
- `access_token` - JWT access token
- `refresh_token` - JWT refresh token
- `user` - User profile data

### **Request Headers**
```javascript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer <access_token>'
}
```

## 📱 Component Guide

### **AuthPage Component**
```typescript
<AuthPage onAuthSuccess={() => void} />
```
- Handles all authentication flows
- Split-screen gradient design
- Form validation and error handling

### **DashboardContent Component**
```typescript
<DashboardContent onLogout={() => void} />
```
- Main dashboard view
- Fetches all endpoint data
- Real-time updates
- System activity tracking

### **Sidebar Component**
```typescript
<Sidebar onLogout={() => void} />
```
- Expandable navigation
- User profile display
- Logout functionality
- Active state management

## 🎨 Color Palette

```css
--background: #F2F0EB;     /* Warm Cream */
--foreground: #2D3748;     /* Dark Gray */
--navy: #0F141F;           /* Deep Navy */
--coral-start: #FF7E5F;    /* Coral */
--coral-end: #FEB47B;      /* Orange */
```

## 🧪 Testing Credentials

You can create a new account via the Signup form, or use the API directly:

### **Register:**
```bash
curl -X POST https://clm-backend-y5ta.onrender.com/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword",
    "first_name": "Your",
    "last_name": "Name"
  }'
```

### **Login:**
```bash
curl -X POST https://clm-backend-y5ta.onrender.com/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }'
```

## 🔄 Data Flow

```
User Login
    ↓
AuthPage → authAPI.login()
    ↓
Token stored in localStorage
    ↓
Page rerenders → DashboardContent
    ↓
Fetch all endpoints in parallel:
  - contractAPI.getStatistics()
  - contractAPI.getRecentContracts()
  - templateAPI.getTemplates()
  - clauseAPI.getClauses()
  - jobAPI.getJobs()
    ↓
Display data in cards and lists
    ↓
Auto-refresh every 30s
```

## 🛡️ Security Features

- JWT token authentication
- Automatic token refresh
- Secure token storage
- HTTPS API calls
- XSS protection
- CSRF protection via SameSite cookies

## 📈 Performance

- Parallel API calls
- Lazy loading
- Image optimization
- CSS-in-JS with Tailwind
- Turbopack for fast builds
- Auto code splitting

## 🚀 Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## 🐛 Troubleshooting

### **"401 Unauthorized" errors:**
- Check if token is valid
- Try logging out and back in
- Token may have expired

### **Data not loading:**
- Check network connection
- Verify API endpoint is accessible
- Check browser console for errors

### **Sidebar not expanding:**
- Ensure hover events are working
- Check CSS transitions
- Try refreshing the page

## 📝 License

MIT License - feel free to use this code for your projects!

## 🤝 Support

For issues or questions:
1. Check browser console for errors
2. Verify API is running at https://clm-backend-y5ta.onrender.com
3. Check network tab for failed requests

---

**Built with ❤️ using Next.js 16, React 19, TypeScript, and Tailwind CSS**

