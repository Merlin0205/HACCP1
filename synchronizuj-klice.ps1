# SYNCHRONIZACE GEMINI API KLICE DO FIREBASE SECRETS
#
# Tento skript nacte klic z functions/.env a nastavi ho do Firebase Secrets
# Po spusteni bude klic dostupny jak lokalne (z .env), tak v produkci (z Firebase Secrets)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SYNCHRONIZACE GEMINI API KLICE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Cesta k .env souboru
$envFile = "functions\.env"

# Zkontrolovat, jestli .env soubor existuje
if (-not (Test-Path $envFile)) {
    Write-Host "CHYBA: Soubor $envFile neexistuje!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Vytvorte soubor functions/.env s timto obsahem:" -ForegroundColor Yellow
    Write-Host "GEMINI_API_KEY=TVUJ_GEMINI_API_KLIC" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

# Nacist .env soubor a najit GEMINI_API_KEY
Write-Host "Nacitam klic z $envFile..." -ForegroundColor Yellow
$envContent = Get-Content $envFile -Raw
$apiKey = $null

# Parsovat .env soubor - najit radek s GEMINI_API_KEY
$lines = Get-Content $envFile
foreach ($line in $lines) {
    # Ignorovat komentare a prazdne radky
    $trimmedLine = $line.Trim()
    if ($trimmedLine -match '^#.*' -or [string]::IsNullOrWhiteSpace($trimmedLine)) {
        continue
    }
    
    # Najit GEMINI_API_KEY=...
    if ($trimmedLine -match '^GEMINI_API_KEY\s*=\s*(.+)$') {
        $apiKey = $matches[1].Trim()
        # Odstranit uvozovky pokud existuji
        $apiKey = $apiKey -replace '^["''](.+)["'']$', '$1'
        break
    }
}

# Zkontrolovat, jestli jsme nasli klic
if ([string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Host "CHYBA: Nepodarilo se najit GEMINI_API_KEY v $envFile!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Zkontrolujte, ze soubor obsahuje radek:" -ForegroundColor Yellow
    Write-Host "GEMINI_API_KEY=TVUJ_GEMINI_API_KLIC" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

# Zobrazit klic (maskovany pro bezpecnost)
$maskedKey = if ($apiKey.Length -gt 10) {
    $apiKey.Substring(0, 10) + "..." + $apiKey.Substring($apiKey.Length - 4)
} else {
    "***"
}

Write-Host "OK: Klic nalezen: $maskedKey" -ForegroundColor Green
Write-Host ""

# Potvrdit akci
Write-Host "Nastavuji klic do Firebase Secrets..." -ForegroundColor Yellow
Write-Host ""
Write-Host "POZOR: Tento prikaz prepise existujici Secret v Firebase!" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Pokracovat? (A/N)"

if ($confirm -ne "A" -and $confirm -ne "a" -and $confirm -ne "Y" -and $confirm -ne "y") {
    Write-Host ""
    Write-Host "Zruseno uzivatelem" -ForegroundColor Red
    pause
    exit 0
}

Write-Host ""
Write-Host "Nastavuji Secret do Firebase..." -ForegroundColor Yellow

# Firebase CLI pro secrets:set vyzaduje interaktivni zadani
# Pouzijeme echo s pipeline pro predani hodnoty
try {
    # Vytvorit docasny soubor s klicem (bezpecnejsi nez echo)
    $tempFile = [System.IO.Path]::GetTempFileName()
    $apiKey | Out-File -FilePath $tempFile -Encoding utf8 -NoNewline
    
    # Nacist klic z temp souboru a predat do Firebase CLI
    # Firebase CLI automaticky nacte hodnotu z stdin
    Get-Content $tempFile | firebase functions:secrets:set GEMINI_API_KEY
    
    # Smazat temp soubor
    Remove-Item $tempFile -Force
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "USPECH! Klic byl nastaven do Firebase Secrets" -ForegroundColor Green
        Write-Host ""
        Write-Host "Dalsi kroky:" -ForegroundColor Cyan
        Write-Host "   1. Deploy Cloud Functions: firebase deploy --only functions" -ForegroundColor White
        Write-Host "   2. Klic je nyni synchronizovan lokalne i v produkci!" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "CHYBA: Nepodarilo se nastavit Secret do Firebase (exit code: $LASTEXITCODE)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Mozne priciny:" -ForegroundColor Yellow
        Write-Host "   - Nejste prihlaseni k Firebase (spustte: firebase login)" -ForegroundColor White
        Write-Host "   - Nemate opravneni k projektu" -ForegroundColor White
        Write-Host "   - Firebase CLI nepodporuje non-interaktivni nastaveni secrets" -ForegroundColor White
        Write-Host ""
        Write-Host "Zkuste rucne:" -ForegroundColor Cyan
        Write-Host "   firebase functions:secrets:set GEMINI_API_KEY" -ForegroundColor White
        Write-Host "   (a pak zadejte klic: $maskedKey)" -ForegroundColor Gray
        Write-Host ""
        pause
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "CHYBA: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Zkuste rucne:" -ForegroundColor Cyan
    Write-Host "   firebase functions:secrets:set GEMINI_API_KEY" -ForegroundColor White
    Write-Host ""
    pause
    exit 1
}

Write-Host ""
pause

