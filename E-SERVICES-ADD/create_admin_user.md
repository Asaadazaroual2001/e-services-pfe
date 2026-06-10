# Créer un utilisateur admin via Laravel Tinker

# 1. Dans votre projet Laravel backend, lancez tinker :
php artisan tinker

# 2. Créez un utilisateur admin :
$user = \App\Models\User::create([
    'name' => 'Admin Principal',
    'email' => 'admin@test.com',
    'password' => \Hash::make('admin123')
]);

# 3. Récupérez le rôle admin :
$adminRole = \App\Models\Role::where('name', 'admin')->first();

# 4. Assignez le rôle à l'utilisateur :
$user->roles()->attach($adminRole->id);

# 5. Vérifiez :
$user->load('roles');
echo "Utilisateur créé: " . $user->name . " avec rôles: " . $user->roles->pluck('name')->join(', ');

exit