@echo off
echo ========================================
echo  KOMPLETNI DEPLOY NA FIREBASE
echo ========================================
echo.
echo Tento skript nasadi:
echo  - Hosting (frontend aplikace)
echo  - Firestore rules (bezpecnostni pravidla)
echo  - Firestore indexes (indexy pro databazi)
echo.
echo POZOR: Cloud Functions se deployuji SAMOSTATNE:
echo        firebase deploy --only functions
echo.
echo POZOR: Pokud Firebase zepta na smazani starych indexu,
echo        odpoved "N" (ne) - deploy pokracuje bez smazani.
echo.
pause

echo.
echo Building application...
call npm run build
if errorlevel 1 (
    echo BUILD SELHAL! Nelze pokracovat s deployem.
    pause
    exit /b 1
)

echo.
echo Deploying to Firebase...
call firebase deploy --only "hosting,firestore:rules,firestore:indexes"
if errorlevel 1 (
    echo DEPLOYMENT SELHAL!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  DEPLOYMENT DOKONCEN USPESNE!
echo ========================================
echo.
echo Pro deploy Cloud Functions spust:
echo   firebase deploy --only functions
echo.
pause



