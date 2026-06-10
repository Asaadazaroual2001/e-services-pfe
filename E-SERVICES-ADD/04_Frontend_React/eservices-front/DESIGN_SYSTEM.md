# 🎨 Système de Design - E-Services

## 📋 Guide d'utilisation

### Variables CSS disponibles

#### 🎨 **Couleurs**
```css
/* Couleurs principales */
--primary-500: #6366f1  /* Bleu principal */
--primary-600: #4f46e5  /* Bleu foncé pour hover */

/* Grays */
--gray-50 à --gray-900  /* Du plus clair au plus foncé */

/* Couleurs sémantiques */
--success: #10b981  /* Vert */
--warning: #f59e0b  /* Orange */
--error: #ef4444    /* Rouge */
--info: #3b82f6     /* Bleu info */
```

#### 📏 **Espacement**
```css
--space-1: 0.25rem  /* 4px */
--space-2: 0.5rem   /* 8px */
--space-4: 1rem     /* 16px */
--space-6: 1.5rem   /* 24px */
--space-8: 2rem     /* 32px */
```

#### 📝 **Typography**
```css
--text-sm: 0.875rem   /* 14px */
--text-base: 1rem     /* 16px */
--text-lg: 1.125rem   /* 18px */
--text-xl: 1.25rem    /* 20px */
--text-2xl: 1.5rem    /* 24px */
```

## 🧱 Composants de base

### **Boutons**
```jsx
<button className="btn-primary">Bouton principal</button>
<button className="btn-secondary">Bouton secondaire</button>
<button className="btn-primary btn-lg">Grand bouton</button>
<button className="btn-primary btn-sm">Petit bouton</button>
```

### **Cards**
```jsx
<div className="card">
  <div className="card-header">
    <h3 className="card-title">Titre</h3>
    <p className="card-description">Description</p>
  </div>
  <div className="card-body">
    Contenu
  </div>
  <div className="card-footer">
    <button className="btn-primary">Action</button>
  </div>
</div>
```

### **Formulaires**
```jsx
<div className="form-group">
  <label className="form-label">Email</label>
  <input className="form-input" type="email" />
  <p className="form-error">Message d'erreur</p>
</div>
```

### **Alerts**
```jsx
<div className="alert alert-success">Message de succès</div>
<div className="alert alert-error">Message d'erreur</div>
<div className="alert alert-warning">Avertissement</div>
```

## 🎯 Classes utilitaires

### **Layout**
```css
.container       /* Container responsive */
.flex           /* display: flex */
.flex-col       /* flex-direction: column */
.grid           /* display: grid */
.grid-cols-2    /* 2 colonnes */
.items-center   /* align-items: center */
.justify-center /* justify-content: center */
```

### **Espacement**
```css
.p-4     /* padding: 1rem */
.m-4     /* margin: 1rem */
.px-4    /* padding horizontal */
.py-4    /* padding vertical */
.mt-4    /* margin-top */
.mx-auto /* margin: 0 auto */
```

### **Typography**
```css
.text-center   /* text-align: center */
.font-semibold /* font-weight: 600 */
.font-bold     /* font-weight: 700 */
```

### **Couleurs**
```css
.text-primary    /* Couleur texte principale */
.text-secondary  /* Couleur texte secondaire */
.text-muted      /* Couleur texte atténuée */
.text-success    /* Vert */
.text-error      /* Rouge */
.bg-primary      /* Arrière-plan principal */
.bg-secondary    /* Arrière-plan secondaire */
```

### **Borders & Shadows**
```css
.border       /* Border standard */
.rounded      /* Border radius standard */
.rounded-lg   /* Border radius large */
.shadow       /* Ombre standard */
.shadow-md    /* Ombre moyenne */
.shadow-lg    /* Ombre large */
```

## 📱 Responsive Design

Le système inclut des breakpoints standards :
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

## 🌙 Dark Mode

Le dark mode est automatique selon les préférences système :
```css
@media (prefers-color-scheme: dark) {
  /* Styles dark automatiques */
}
```

## ✨ Animations

```css
.animate-fade-in  /* Animation d'entrée */
.animate-spin     /* Animation de rotation */
```

## 💡 Exemples d'utilisation

```jsx
// Page avec layout complet
<div className="app-layout">
  <header className="app-header">
    <nav className="nav">
      <a href="/" className="nav-brand">E-Services</a>
    </nav>
  </header>
  
  <main className="app-main">
    <div className="container">
      <h1 className="text-center mb-4">Titre</h1>
      <div className="grid grid-cols-2 gap-6">
        <div className="card">...</div>
      </div>
    </div>
  </main>
</div>
```

## 🔧 Personnalisation

Modifiez les variables CSS dans `index.css` pour personnaliser :
```css
:root {
  --primary-500: votre-couleur;
  --font-sans: votre-font;
}
```