

# DA Motors — Telegram MiniApp

Premium automotive catalog built as a Telegram WebApp-compatible React application with mock data, full filtering, and strict professional UI.

---

## Architecture

- React + TypeScript, mobile-first responsive design
- Telegram WebApp SDK integration (theme detection, initData, haptic feedback)
- Zustand for global state management (favorites, filters, auth, theme)
- Mock data layer with realistic car inventory (~20-30 vehicles: Mercedes-Benz, BMW, Porsche, MINI, Audi)
- Modular page-based routing with animated transitions

## Design System

- **Light theme**: clean white background, subtle gray accents
- **Dark theme**: deep graphite (#1a1a1a), muted borders
- **Accent color**: DA Motors red (#C41E3A)
- **Typography**: clean sans-serif, bold pricing, structured hierarchy
- **No emoji anywhere in UI**
- Telegram theme auto-detection with manual override

---

## Pages & Features

### 1. Catalog (Home)
- Fixed header: "DA" text logo, filter icon (opens bottom sheet), search icon, profile icon
- Horizontal scrollable brand chips: Все, Mercedes-Benz, BMW, Porsche, MINI, Audi
- Status sub-filter row: Все, В наличии, В пути, Под заказ
- Car cards grid: large photo, favorite heart, availability badge, photo count, name, price (bold), year/mileage, engine specs, "Подробнее" button
- Skeleton loading states
- Pull-to-refresh gesture support

### 2. Live Search
- Full-screen search overlay with debounced input
- Searches across brand, model, year, VIN, trim
- Real-time auto-suggestions and filtered results
- Recent searches stored locally

### 3. Deep Filters (Bottom Sheet)
- Slides up as a modal bottom sheet
- Filter fields: brand, model, year range, price range, mileage, fuel type, power, engine volume, transmission, drivetrain, color, availability, body type, condition
- "Применить фильтр" and "Сбросить" buttons
- Active filter count badge on filter icon

### 4. Car Detail Page
- Swipeable image gallery with fullscreen zoom and photo counter
- Car name, price, availability badge, VIN
- Specs grid: year, mileage, color, engine, transmission, drivetrain, trim
- Accordion sections for full specs: engine, transmission, suspension, safety, comfort, multimedia, additional equipment
- Action buttons: "Оставить заявку", "Связаться", "Написать в чат" (opens Telegram deep link), "Позвонить" (tel: link)

### 5. Chat / Contact
- "Написать менеджеру" button opens Telegram deep link to DA Motors bot/chat with auto-injected car ID in the message
- "Оставить заявку" opens a modal form: name, phone, preferred contact method, message — submitted data stored in local state (or future backend)

### 6. Personal Cabinet
- Auth via Telegram initData (user info extracted client-side)
- Profile section showing Telegram name and avatar
- Favorites list (persisted in Zustand + localStorage)
- Application history (local mock)
- Order status tracking (mock statuses)
- Trade-in applications list
- Notification preferences
- Theme toggle (light/dark/auto)

### 7. Trade-In
- Multi-step form: brand, model, year, mileage, VIN, photo upload (local preview), contact info
- Form validation with clear error states
- Submission confirmation screen

### 8. AI Virtual Assistant
- Floating action button (bottom-right)
- Opens a mini chat overlay
- Mock AI responses for car recommendations based on budget, type, and preferences
- Can suggest filters and link to specific cars
- Powered by static decision tree logic (no real AI backend in MVP)

---

## Navigation & UX
- Bottom tab navigation: Каталог, Поиск, Избранное, Trade-In, Профиль
- Page transitions: fade + slide animations
- Skeleton loading on all data-dependent views
- Smooth scroll, tap feedback via Telegram haptic API
- All interactions optimized for touch — no hover-dependent UI

## Technical Details
- Zustand stores: carsStore, filtersStore, favoritesStore, userStore, themeStore
- Lazy-loaded route components
- Image optimization with loading="lazy"
- Telegram WebApp SDK: theme params, back button, main button, haptic feedback
- LocalStorage persistence for favorites, recent searches, theme preference

