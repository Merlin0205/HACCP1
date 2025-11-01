# 🚀 PŘÍKAZY PRO LOKÁLNÍ VÝVOJ

## Spuštění lokálního serveru

```powershell
cd D:\Programovani\HACCP1
npm run dev
```

Server poběží na: **http://localhost:3000**

---

## Zastavení všech běžících serverů

### Zastavit procesy na portu 3000 a 3001:

```powershell
# Zastavit proces na portu 3000
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($port3000) { Stop-Process -Id $port3000 -Force }

# Zastavit proces na portu 3001
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($port3001) { Stop-Process -Id $port3001 -Force }

Write-Host "Všechny procesy na portu 3000 a 3001 byly zastaveny"
```

### Nebo jednodušeji (zastaví všechny Node procesy):

```powershell
# Zastavit všechny Node.js procesy
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "Všechny Node.js procesy byly zastaveny"
```

### Nebo nejjednodušeji (v terminálu kde běží server):

```powershell
# Stiskněte Ctrl + C
```

---

## Kompletní restart lokálního serveru

```powershell
# 1. Zastavit všechny Node procesy
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Počkat 2 sekundy
Start-Sleep -Seconds 2

# 3. Spustit znovu
cd D:\Programovani\HACCP1
npm run dev
```

