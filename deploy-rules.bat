@echo off
echo ========================================
echo  DEPLOY POUZE DATABAZE A RULES
echo ========================================
echo.
echo Tento skript nasadi POUZE:
echo  - Firestore rules (bezpecnostni pravidla)
echo  - Firestore indexes (indexy pro databazi)
echo.
echo Hosting NENASADUJE!
echo.
pause

echo.
echo Deploying Firestore rules and indexes...
call firebase deploy --only "firestore:rules,firestore:indexes"
if errorlevel 1 (
    echo DEPLOYMENT SELHAL!
    pause
    exit /b 1
)

echo.
echo ========================================
echo  DEPLOYMENT DOKONCEN USPESNE!
echo ========================================
pause

