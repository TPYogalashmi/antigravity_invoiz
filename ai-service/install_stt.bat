@echo off
echo ============================================================
echo  Installing STT dependencies for voice-billing-crm
echo ============================================================

echo.
echo [1/3] Installing Python packages...
pip install SpeechRecognition==3.10.3 pydub==0.25.1 gTTS==2.5.1 rapidfuzz==3.6.2

echo.
echo [2/3] Checking for ffmpeg...
where ffmpeg >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ffmpeg NOT found on PATH.
    echo.
    echo Install ffmpeg using ONE of these methods:
    echo   A) winget:      winget install ffmpeg
    echo   B) chocolatey:  choco install ffmpeg
    echo   C) manual:      https://ffmpeg.org/download.html
    echo                   Extract and add the bin\ folder to your PATH
    echo.
    echo After installing ffmpeg, re-run this script or restart your terminal.
) ELSE (
    echo ffmpeg found:
    ffmpeg -version 2>&1 | findstr "ffmpeg version"
)

echo.
echo [3/3] Verifying SpeechRecognition...
python -c "import speech_recognition; print('SpeechRecognition OK:', speech_recognition.__version__)"

echo.
echo ============================================================
echo  Done. Now restart Flask: python run.py
echo ============================================================
pause