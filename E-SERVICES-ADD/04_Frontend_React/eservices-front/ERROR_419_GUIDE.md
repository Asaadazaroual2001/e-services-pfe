# 🐛 Guide de résolution - Erreur 419 "Page Expired"

## ❌ **Problème**
```
Request failed with status code 419
```

## 🔍 **Cause**
L'erreur 419 en Laravel signifie **"Page Expired"** - problème de **token CSRF** :
- Token CSRF manquant, invalide ou expiré
- Configuration incorrecte des cookies de session
- Problème CORS entre frontend React et backend Laravel

## ✅ **Solution appliquée**

### 1. **Configuration Laravel (.env)**
```bash
# Configuration CORS et sessions pour développement local  
SANCTUM_STATEFUL_DOMAINS="localhost:5173,127.0.0.1:5173,localhost,127.0.0.1"
SESSION_DOMAIN=                    # Vide pour développement local
SESSION_SECURE_COOKIE=false        # False pour HTTP (développement)
SESSION_HTTP_ONLY=true             # Sécurité
SESSION_SAME_SITE=lax              # Lax pour cross-origin
```

### 2. **Intercepteur Axios amélioré**
- Retry automatique sur erreur 419
- Nouveau token CSRF récupéré automatiquement
- Meilleure gestion d'erreurs

### 3. **Message d'erreur spécifique**
- Affichage "Session expirée" pour l'erreur 419
- Guide utilisateur pour actualiser la page

## 🔧 **Actions requises**

### **Backend Laravel** ⚠️
```bash
# 1. Redémarrer le serveur Laravel pour appliquer .env
php artisan serve

# 2. Optionnel : Clear les caches
php artisan config:clear
php artisan cache:clear
```

### **Frontend React**
```bash
# 1. Redémarrer le serveur de développement Vite
npm run dev

# 2. Vider le cache du navigateur (F12 > Network > Disable cache)
```

## 🔧 **Vérifications supplémentaires**

### **1. URLs correctes**
- Backend Laravel : `http://localhost:8000`
- Frontend React : `http://localhost:5173` 
- Variable `VITE_API_BASE_URL=http://localhost:8000`

### **2. Configuration CORS (config/cors.php)**
```php
'paths' => ['api/*', 'login', 'logout', 'register', 'sanctum/csrf-cookie'],
'allowed_origins' => ['http://localhost:5173'],
'supports_credentials' => true,
```

### **3. Test manuel**
```bash
# Tester la route CSRF
curl http://localhost:8000/sanctum/csrf-cookie

# Vérifier que les cookies sont transmis
# F12 > Application > Cookies > localhost
```

## 🎯 **Prévention future**

### **Messages d'erreur améliorés**
- Erreur 419 → "Session expirée, actualisez la page"
- Retry automatique sur erreur CSRF
- Logs détaillés en console

### **Développement local**
- Toujours utiliser `localhost` (pas `127.0.0.1`)
- Redémarrer les serveurs après changement de config
- Vider le cache navigateur en cas de problème

## 📝 **Checklist de débogage**

- [ ] Serveur Laravel redémarré après modification .env
- [ ] Frontend React redémarré 
- [ ] Cache navigateur vidé
- [ ] URLs identiques (localhost vs 127.0.0.1)
- [ ] Cookies visibles dans DevTools
- [ ] CORS configuré avec `supports_credentials: true`
- [ ] Headers `X-Requested-With: XMLHttpRequest` présent

## 🚨 **Si le problème persiste**

1. **Logs Laravel** : `storage/logs/laravel.log`
2. **Console navigateur** : F12 > Console 
3. **Network tab** : F12 > Network pour voir les requêtes
4. **Test avec cURL** : Tester les endpoints manuellement

---
**✅ Le problème devrait être résolu avec les modifications appliquées.**