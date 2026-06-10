# Page de Login - Documentation

## 🚀 Fonctionnalités implémentées

### Logique métier complète
- ✅ **Validation côté client** - Email format, mot de passe minimum 6 caractères
- ✅ **Protection CSRF** - Token automatique avant chaque requête
- ✅ **Gestion des erreurs** - Messages spécifiques selon le type d'erreur (422, 429, 500)
- ✅ **États de chargement** - Spinner pendant la connexion
- ✅ **Navigation conditionnelle** - Redirection admin/dashboard selon les rôles
- ✅ **Persistence session** - Option "Se souvenir de moi"
- ✅ **Protection de route** - Redirection automatique si déjà connecté

### Interface utilisateur moderne
- ✅ **Design responsive** - Mobile-first approach
- ✅ **Glassmorphism** - Effet de transparence moderne
- ✅ **Show/Hide password** - Bouton pour afficher/masquer le mot de passe
- ✅ **Validation visuelle** - Erreurs affichées par champ
- ✅ **Animations fluides** - Transitions CSS
- ✅ **Accessibilité** - Labels, ARIA attributes, focus management

## 🔧 API Endpoints utilisés

```javascript
// Backend Laravel routes
POST /login          // Authentification
POST /logout         // Déconnexion
POST /register       // Inscription
GET /api/me         // Informations utilisateur
GET /sanctum/csrf-cookie // Token CSRF
```

## ⚙️ Configuration

### Variables d'environnement

```bash
# .env
VITE_API_BASE_URL=http://localhost:8000
```

### Validation Backend
```php
// AuthController@login
$credentials = $request->validate([
    'email' => ['required','email'],
    'password' => ['required'],
]);
```

## 🎯 Gestion des erreurs

| Code | Message | Description |
|------|---------|-------------|
| 422  | "Email ou mot de passe incorrect" | Credentials invalides |
| 429  | "Trop de tentatives..." | Rate limiting |
| 500  | "Erreur du serveur..." | Erreur serveur |

## 📝 Utilisation

```jsx
import { useAuth } from "../auth/AuthContext";

function LoginPage() {
  const { login, user, loading } = useAuth();
  
  // Auto-redirect si connecté
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }
}
```

## 🔒 Sécurité

- **CSRF Protection** - Token automatique
- **XSS Protection** - Validation des inputs
- **Session Security** - Regeneration après login
- **CORS Configuration** - Credentials inclus
- **Rate Limiting** - Protection contre brute force

## 🎨 Personnalisation

Les styles peuvent être modifiés dans `LoginPage.css`:
- Variables CSS pour les couleurs
- Animations et transitions
- Responsive breakpoints
- Themes dark/light support

## 📱 Responsive Design

| Breakpoint | Design |
|------------|--------|
| > 768px    | Design complet avec animations |
| 480-768px  | Layout adapté tablette |
| < 480px    | Mobile optimisé |