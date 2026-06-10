# Guide de débogage pour l'erreur "Session expirée"

## NOUVEAU : Page de test intégrée

1. **Accédez à la page de test :** http://localhost:5173/test-session
2. **Ou depuis la page de login :** Cliquez sur "🔧 Test Session/CSRF (Debug)" en bas
3. **Créez un utilisateur test :**
   ```bash
   cd "c:\Users\ASAAD-AZ-PC\Desktop\E-SERVICES-ADD\03_Backend_Laravel\eservices-api"
   php artisan make:test-user
   ```
   - Email : `user@example.com`
   - Password : `123456`

## Étapes de résolution

### 1. Redémarrer les serveurs

1. **Arrêter Laravel :**
   - Appuyez sur `Ctrl+C` dans le terminal du backend
   
2. **Redémarrer Laravel :**
   ```bash
   cd "c:\Users\ASAAD-AZ-PC\Desktop\E-SERVICES-ADD\03_Backend_Laravel\eservices-api"
   php artisan serve
   ```

3. **Arrêter React :**
   - Appuyez sur `Ctrl+C` dans le terminal du frontend
   
4. **Redémarrer React :**
   ```bash
   cd "c:\Users\ASAAD-AZ-PC\Desktop\E-SERVICES-ADD\04_Frontend_React\eservices-front"
   npm run dev
   ```

### 2. Vérifier les logs Laravel

1. **Ouvrir un nouveau terminal**
2. **Suivre les logs en temps réel :**
   ```bash
   cd "c:\Users\ASAAD-AZ-PC\Desktop\E-SERVICES-ADD\03_Backend_Laravel\eservices-api"
   tail -f storage/logs/laravel.log
   ```

### 3. Utiliser la page de test intégrée

1. **Allez sur :** http://localhost:5173/test-session
2. **Testez dans l'ordre :**
   - Cliquez "Tester CSRF Token" → Doit réussir ✅
   - Cliquez "Tester Session" → Doit montrer les détails de session ✅
   - Cliquez "Tester Login" → Doit se connecter ✅ (après avoir créé l'utilisateur test)

3. **Analysez les résultats :**
   - Si CSRF échoue → Problème de CORS/cookies
   - Si Session échoue → Problème de configuration Laravel
   - Si Login échoue avec 419 → Problème CSRF spécifiquement

### 4. Tester la connexion manuelle

1. **Ouvrir la console développeur** (F12)
2. **Aller sur la page de login**
3. **Essayer de se connecter**
4. **Observer :**
   - Les logs dans la console du navigateur
   - Les logs dans le terminal Laravel
   - L'onglet Network pour voir les requêtes HTTP

### 5. Vérifications dans le navigateur

**Console (F12 → Console) :**
- Cherchez les messages commençant par "API Request:" et "API Response:"
- Cherchez les erreurs en rouge

**Network (F12 → Network) :**
- Regardez les requêtes vers `/sanctum/csrf-cookie`
- Regardez la requête de login vers `/api/auth/login`
- Vérifiez les cookies dans les headers

### 6. Diagnostics possibles

**Si vous voyez dans Laravel logs :**
- `Session ID:` - Vérifiez que c'est cohérent
- `CSRF Token:` - Vérifiez qu'il n'est pas null
- `Request Headers:` - Cherchez X-XSRF-TOKEN

**Si la session change à chaque requête :**
- C'est le problème ! La session n'est pas maintenue
- Solution : Vérifier la configuration SANCTUM

**Si pas de token CSRF :**
- La requête `/sanctum/csrf-cookie` a échoué
- Vérifier CORS et cookies

### 7. Solutions de secours

**Option 1 : Forcer les domaines identiques**
```bash
# Dans le fichier .env du backend
SANCTUM_STATEFUL_DOMAINS=localhost:5173
SESSION_DOMAIN=localhost
```

**Option 2 : Désactiver temporairement CSRF**
```php
// Dans routes/api.php, remplacer :
Route::middleware(['auth:sanctum'])->group(function () {
// Par :
Route::middleware(['auth:sanctum'])->withoutMiddleware([\App\Http\Middleware\VerifyCsrfToken::class])->group(function () {
```

### 8. Commandes utiles

**Créer un utilisateur de test :**
```bash
php artisan make:test-user        # Utilisateur normal
php artisan make:test-user --admin # Utilisateur admin
```

**Nettoyer le cache Laravel :**
```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

**Recréer les clés de session :**
```bash
php artisan key:generate
```

## Notes importantes

- Les logs détaillés sont maintenant activés dans le AuthController
- L'axios client affiche tous les détails des requêtes
- La route `/debug-session` permet de tester l'état de la session

## Contact

Si le problème persiste, partagez :
1. Les logs Laravel du terminal
2. Les messages de la console du navigateur
3. Les détails de l'onglet Network