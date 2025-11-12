@echo off
echo ========================================
echo  LOKALNI BUILD
echo ========================================
echo.
echo Aktualizuji build cislo...
call node scripts/incrementVersion.js
if errorlevel 1 (
    echo AKTUALIZACE VERZE SELHALA! Nelze pokracovat s buildem.
    pause
    exit /b 1
)

echo.
echo Building application...
call npm run build
if errorlevel 1 (
    echo BUILD SELHAL!
    pause
    exit /b 1
)

echo.
echo Build complete! Check the 'dist' folder for output files.
pause






