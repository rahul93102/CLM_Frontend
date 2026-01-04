# CLM System - Developer Quick Reference

## 📋 Component Overview

### 1. **AuthPage.tsx**
**Purpose:** Complete authentication system with Login, Signup, and Forgot Password

**Features:**
- Split-screen purple/orange gradient design
- Form validation and error handling
- API integration for all auth endpoints
- Smooth transitions between forms
- Success/error message display

**Usage:**
```tsx
<AuthPage onAuthSuccess={() => void} />
```

**API Calls:**
- `authAPI.login({ email, password })`
- `authAPI.register({ email, password, first_name, last_name })`
- `authAPI.forgotPassword(email)`

---

### 2. **DashboardContent.tsx**
**Purpose:** Main dashboard with complete endpoint integration

**Features:**
- Statistics cards (Total, Draft, Approved, Pending, Rejected)
- Recent contracts list
- System activity (Generation Jobs)
- Templates and Clauses display
- Auto-refresh every 30 seconds
- Real-time loading indicators

**Usage:**
```tsx
<DashboardContent onLogout={() => void} />
```

**API Calls:**
- `contractAPI.getStatistics()`
- `contractAPI.getRecentContracts()`
- `templateAPI.getTemplates()`
- `clauseAPI.getClauses()`
- `jobAPI.getJobs()`

**Data Flow:**
```
useEffect → fetchAllData()
  → Promise.all([...all APIs])
  → setStats, setContracts, setTemplates, setClauses, setJobs
  → Render cards and lists
```

---

### 3. **Sidebar.tsx**
**Purpose:** Expandable navigation sidebar

**Features:**
- Hover to expand (90px → 264px)
- Navigation icons with tooltips
- User profile display
- Logout button
- Active state indicators

**Usage:**
```tsx
<Sidebar onLogout={() => void} />
```

**State:**
```tsx
const [isExpanded, setIsExpanded] = useState(false);
```

---

### 4. **page.tsx (Main App)**
**Purpose:** Root component with authentication routing

**Features:**
- Authentication state management
- Protected route logic
- Loading screen
- Component switching

**Flow:**
```
Check localStorage for token
  ↓
isAuthenticated = !!token
  ↓
Render AuthPage OR DashboardContent
```

---

### 5. **api.ts (API Service)**
**Purpose:** Centralized API management

**Features:**
- Token management (get, set, clear)
- Automatic token refresh on 401
- All endpoint implementations
- Error handling

**Structure:**
```typescript
- tokenManager
  - getAccessToken()
  - setTokens(access, refresh)
  - clearTokens()
  
- authAPI
  - login()
  - register()
  - forgotPassword()
  
- contractAPI
  - getStatistics()
  - getRecentContracts()
  
- templateAPI
  - getTemplates()
  
- clauseAPI
  - getClauses()
  
- jobAPI
  - getJobs()
```

---

## 🎨 Design System

### Colors
```css
Cream Background: #F2F0EB
Navy Sidebar:     #0F141F
Coral Start:      #FF7E5F
Orange End:       #FEB47B
Dark Text:        #2D3748
```

### Typography
```css
Font Family: 'Nunito', system-ui, -apple-system, sans-serif
Heading:     text-4xl font-bold (36px)
Subheading:  text-2xl font-bold (24px)
Body:        text-base (16px)
Small:       text-sm (14px)
Tiny:        text-xs (12px)
```

### Spacing
```css
Cards:       p-6 (24px)
Gap:         gap-6 (24px)
Margin:      mb-10 (40px)
```

### Borders
```css
Radius:      rounded-[20px] to rounded-[24px]
Shadow:      shadow-sm, shadow-md, shadow-lg, shadow-2xl
```

---

## 🔄 State Management

### Authentication State
```typescript
// In page.tsx
const [isAuthenticated, setIsAuthenticated] = useState(false);

// Check on mount
useEffect(() => {
  const token = tokenManager.getAccessToken();
  setIsAuthenticated(!!token);
}, []);
```

### Dashboard State
```typescript
// In DashboardContent.tsx
const [stats, setStats] = useState<Statistics | null>(null);
const [recentContracts, setRecentContracts] = useState<Contract[]>([]);
const [templates, setTemplates] = useState<Template[]>([]);
const [clauses, setClauses] = useState<Clause[]>([]);
const [jobs, setJobs] = useState<GenerationJob[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

---

## 🔌 API Endpoints Reference

### Base URL
```
https://clm-backend-y5ta.onrender.com/api
```

### Authentication
```bash
POST /auth/register/
POST /auth/login/
POST /auth/token/refresh/
POST /auth/forgot-password/
POST /auth/reset-password/
```

### Contracts
```bash
GET  /contracts/statistics/
GET  /contracts/recent/
POST /contracts/validate-clauses/
```

### Resources
```bash
GET /contract-templates/
GET /clauses/
GET /generation-jobs/
GET /
```

---

## 🎯 Common Tasks

### Add New API Endpoint
```typescript
// 1. Add to api.ts
export const myAPI = {
  getData: async () => {
    const response = await apiRequest('/my-endpoint/');
    if (!response.ok) throw new Error('Failed');
    return await response.json();
  }
};

// 2. Use in component
const [data, setData] = useState([]);

useEffect(() => {
  myAPI.getData().then(setData);
}, []);
```

### Add New Status Badge
```typescript
const getStatusStyles = (status: string) => {
  if (status.includes('new-status')) {
    return 'bg-purple-100 text-purple-700';
  }
  // ... existing logic
};
```

### Add Loading State
```tsx
{loading ? (
  <div className="flex items-center gap-2">
    <svg className="animate-spin h-5 w-5" ...>
    <span>Loading...</span>
  </div>
) : (
  <div>Your Content</div>
)}
```

### Add Error Handling
```tsx
try {
  const data = await api.call();
  setData(data);
} catch (err) {
  setError(err.message);
} finally {
  setLoading(false);
}
```

---

## 🐛 Debugging Tips

### Check Authentication
```javascript
// In browser console
localStorage.getItem('access_token')
localStorage.getItem('user')
```

### Test API Call
```javascript
// In browser console
fetch('https://clm-backend-y5ta.onrender.com/api/contracts/statistics/', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
  }
}).then(r => r.json()).then(console.log)
```

### Clear State
```javascript
// Reset everything
localStorage.clear();
location.reload();
```

---

## ✅ Testing Checklist

- [ ] Login works
- [ ] Signup creates new account
- [ ] Forgot password sends email
- [ ] Dashboard loads statistics
- [ ] Recent contracts display
- [ ] Templates list shows
- [ ] Clauses list shows
- [ ] Jobs display in activity
- [ ] Sidebar expands on hover
- [ ] Logout clears tokens
- [ ] Auto-refresh works
- [ ] Error messages display
- [ ] Loading states show
- [ ] Mobile responsive
- [ ] Token refresh on 401

---

## 📦 Dependencies

```json
{
  "next": "16.1.1",
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "tailwindcss": "^4",
  "typescript": "^5"
}
```

---

## 🚀 Deployment

### Build
```bash
npm run build
```

### Test Production Build
```bash
npm run start
```

### Environment Variables (if needed)
```env
NEXT_PUBLIC_API_URL=https://clm-backend-y5ta.onrender.com/api
```

---

**Happy Coding! 🎉**
