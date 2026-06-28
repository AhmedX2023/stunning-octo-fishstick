@echo off
title لابك عندنا - تشغيل المشروع
color 0A
chcp 65001 > nul

echo.
echo  ====================================
echo   لابك عندنا - جاري تشغيل المشروع
echo  ====================================
echo.

:: التأكد من إننا في المجلد الصح
cd /d "%~dp0"

:: ===== تشغيل الباك إند =====
echo  [1/2] جاري تشغيل الباك إند (FastAPI - Port 8000)...

:: التحقق من وجود venv
if not exist "backend\venv\Scripts\activate.bat" (
    echo.
    echo  [!] البيئة الافتراضية مش موجودة، جاري إنشاؤها...
    cd backend
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    cd ..
)

:: تشغيل الباك إند في نافذة منفصلة
start "لابك عندنا - Backend (8000)" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && python run.py"

:: انتظار ثانيتين عشان السيرفر يبدأ
timeout /t 3 /nobreak > nul

:: ===== تشغيل الفرونت إند =====
echo  [2/2] جاري تشغيل الفرونت إند (Port 5500)...
start "لابك عندنا - Frontend (5500)" cmd /k "cd /d %~dp0frontend && python -m http.server 5500"

:: انتظار ثانيتين عشان الفرونت إند يبدأ
timeout /t 2 /nobreak > nul

:: ===== فتح المتصفح تلقائياً =====
echo  [3/3] جاري فتح المتصفح...
start "" "http://localhost:5500"

echo.
echo  ====================================
echo   تم تشغيل المشروع بنجاح!
echo.
echo   المتجر:      http://localhost:5500
echo   لوحة الأدمن: http://localhost:5500/admin/index.html
echo   API Docs:    http://localhost:8000/api/docs
echo  ====================================
echo.
echo  اضغط أي زرار لإغلاق هذه النافذة (السيرفرات هتفضل شغالة)
pause > nul
