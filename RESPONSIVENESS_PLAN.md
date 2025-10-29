# 📱 Plán Responsivity a Sjednocení Šířek

## 🎯 Cíl:
- Sjednotit šířky napříč všemi obrazovkami
- Zajistit responsivitu pro mobil (primárně pro audity v terénu)
- PC only: Administrace a tisknutí

---

## 📐 Jednotná Šířka:
```
max-w-7xl (1280px) - Standardní pro všechny obrazovky
```

---

## 🔧 Komponenty k úpravě:

### ✅ HOTOVO:
1. **SettingsScreen** - změněno z max-w-4xl na max-w-7xl

### 📋 TODO - Mobilní priorita:

2. **CustomerDashboard** ⭐ DŮLEŽITÉ
   - Seznam zákazníků
   - Musí fungovat na mobilu
   - Cards responsive layout

3. **AuditList** ⭐ DŮLEŽITÉ
   - Seznam auditů zákazníka
   - Musí fungovat na mobilu
   - Table → Cards na mobilu

4. **AuditChecklist** ⭐⭐⭐ KRITICKÉ
   - Provádění auditu v terénu
   - MUSÍ fungovat perfektně na mobilu
   - Touch-friendly checkboxy
   - Responsive formuláře

5. **Header**
   - Hamburger menu na mobilu?

### 🖥️ PC Only (nižší priorita):

6. **AdminScreen**
   - Správa auditů
   - Jen pro PC - OK

7. **ReportView**
   - Tisknutí
   - Jen pro PC - OK

---

## 📱 Breakpoints:
```css
sm: 640px   /* Mobilní (landscape) */
md: 768px   /* Tablet */
lg: 1024px  /* Laptop */
xl: 1280px  /* Desktop */
```

---

## 🚀 Postup:
1. ✅ Opravit SettingsScreen šířku
2. ⏭️ CustomerDashboard - responsive cards
3. ⏭️ AuditList - table → cards na mobilu
4. ⏭️ AuditChecklist - plně mobilní
5. ⏭️ Header - hamburger menu

