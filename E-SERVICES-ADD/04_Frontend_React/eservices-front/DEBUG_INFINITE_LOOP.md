# 🔧 Guide de debugging - Boucle infinie Login

## ❌ **Problème actuel**
```bash
2026-02-18 18:37:28 /sanctum/csrf-cookie  ~ 0.52ms
2026-02-18 18:37:28 /login  ~ 515.55ms
2026-02-18 18:37:29 /login  ~ 0.13ms
# ... répétition infinie
```

## 🔍 **Cause identifiée**
**Boucle infinie** causée par l'intercepteur axios qui retry automatiquement les requêtes 419.

## ✅ **Solutions appliquées**

### 1. **Suppression de l'intercepteur problématique**
- Retiré le retry automatique sur erreur 419
- Simplifié la gestion des erreurs CSRF
- Ajout de logs détaillés pour debugging

### 2. **Protection contre double soumission**
- Vérification `isSubmitting` pour éviter multiples clics
- Logs détaillés du processus de login

### 3. **Gestion d'erreurs améliorée**
- Messages spécifiques selon le type d'erreur
- Logs console pour debugging

## 🔧 **Tests à effectuer**

### **1. Redémarrer les serveurs**
```bash
# Backend Laravel
cd 03_Backend_Laravel/eservices-api
php artisan serve

# Frontend React (nouveau terminal)
cd 04_Frontend_React/eservices-front
npm run dev
```

### **2. Test de login simple**
1. Ouvrir `http://localhost:5173/login`
2. F12 → Console pour voir les logs
3. Tenter la connexion avec des identifiants

### **3. Vérifier les logs Console**
Vous devriez voir :
```
Starting login process...
CSRF token refreshed
Attempting login...
Login successful, fetching user data...
User data fetched: { id: 1, name: "...", ... }
```

## 🐛 **Si le problème persiste**

### **Test 1: Vérifier la route CSRF**
```bash
curl -X GET http://localhost:8000/sanctum/csrf-cookie
# Doit retourner une réponse 204 No Content
```

### **Test 2: Vérifier que la DB a des utilisateurs**
```bash
cd 03_Backend_Laravel/eservices-api
php artisan tinker
>>> App\Models\User::all()
# Doit afficher des utilisateurs
```

### **Test 3: Créer un utilisateur de test**
```bash
php artisan tinker
>>> App\Models\User::create(['name' => 'Test', 'email' => 'test@test.com', 'password' => bcrypt('password')])
```

### **Test 4: Vérifier les cookies**
F12 → Application → Cookies → localhost:8000
- Doit contenir `XSRF-TOKEN` et `laravel_session`

## 🔧 **Debugging avancé**

### **Backend Laravel - Activer les logs détaillés**
Dans `.env` :
```env
LOG_LEVEL=debug
APP_DEBUG=true
```

### **Logs en temps réel**
```bash
cd 03_Backend_Laravel/eservices-api
tail -f storage/logs/laravel.log
```

### **Test manuel avec credentials**
Frontend console :
```javascript
// Test direct dans la console du navigateur
fetch('http://localhost:8000/sanctum/csrf-cookie', { credentials: 'include' })
  .then(() => {
    return fetch('http://localhost:8000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include',
      body: JSON.stringify({
        email: 'test@test.com',
        password: 'password'
      })
    });
  })
  .then(res => res.json())
  .then(console.log);
```

## 📝 **Checklist de résolution**

- [ ] Serveurs redémarrés
- [ ] Cache navigateur vidé
- [ ] Logs console vérifiés
- [ ] Cookies présents
- [ ] Utilisateur existe en DB
- [ ] Routes CSRF/login fonctionnelles

## 🆘 **Contact et support**

Si le problème persiste après ces étapes:
1. Copier les logs console complets
2. Copier les logs Laravel (storage/logs/laravel.log)
3. Vérifier si les cookies sont transmis (F12 → Network → login request → Headers)

---
**Le problème devrait être résolu après redémarrage des serveurs.**