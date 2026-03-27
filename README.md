# 🎙️ VoiceBill CRM — Voice-Enabled Intelligent Billing System

A full-stack, production-grade billing and CRM system where you speak to create invoices. Powered by React, Spring Boot, Flask AI, and MySQL.

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Project Structure](#project-structure)
3. [Prerequisites](#prerequisites)
4. [Database Setup](#database-setup)
5. [Environment Configuration](#environment-configuration)
6. [Installation Guide](#installation-guide)
7. [Running the Project](#running-the-project)
8. [API Reference & Testing](#api-reference--testing)
9. [Voice Pipeline Flow](#voice-pipeline-flow)
10. [GitHub Setup (Safe)](#github-setup-safe)
11. [Troubleshooting](#troubleshooting)

---

## System Overview

| Layer | Technology | Port |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind CSS | `5173` |
| Backend API | Spring Boot 3.2 (Java 17) | `8080` |
| AI / Voice Service | Python 3.11 + Flask | `5000` |
| Database | MySQL 8.x | `3306` |

**What it does:**
- Record your voice → transcribed in real time
- NLP extracts customer name, products, quantities
- Automatically matches products from the database (fuzzy matching)
- Generates a GST invoice with ₹ currency
- Full CRM: manage customers, products, invoices, dashboard

---

## Project Structure

```
voice-billing-crm/
│
├── frontend/                        # React + Vite application
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js             # Configured Axios clients
│   │   ├── components/
│   │   │   └── ui/
│   │   │       └── Button.jsx
│   │   ├── layouts/
│   │   │   └── DashboardLayout.jsx  # Sidebar + topbar
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Invoices.jsx
│   │   │   ├── Customers.jsx
│   │   │   └── VoiceBilling.jsx     # Core voice recording UI
│   │   ├── routes/
│   │   │   └── index.jsx            # Protected route setup
│   │   ├── store/
│   │   │   └── useAuthStore.js      # Zustand auth state
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env                         # Frontend environment variables
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── backend/                         # Spring Boot API
│   ├── src/main/java/com/billingcrm/
│   │   ├── client/
│   │   │   └── AiServiceClient.java
│   │   ├── config/
│   │   │   ├── SecurityConfig.java
│   │   │   ├── OpenApiConfig.java
│   │   │   └── WebClientConfig.java
│   │   ├── controller/
│   │   │   ├── AuthController.java
│   │   │   ├── CustomerController.java
│   │   │   ├── InvoiceController.java
│   │   │   ├── ProductController.java
│   │   │   ├── DashboardController.java
│   │   │   └── VoiceController.java
│   │   ├── dto/
│   │   │   ├── request/
│   │   │   └── response/
│   │   ├── exception/
│   │   │   └── GlobalExceptionHandler.java
│   │   ├── mapper/
│   │   ├── model/
│   │   │   ├── Customer.java
│   │   │   ├── Product.java
│   │   │   ├── Invoice.java
│   │   │   ├── InvoiceItem.java
│   │   │   ├── User.java
│   │   │   └── VoiceSession.java
│   │   ├── repository/
│   │   ├── security/
│   │   │   ├── JwtService.java
│   │   │   └── JwtAuthenticationFilter.java
│   │   ├── service/
│   │   │   ├── impl/
│   │   │   └── ProductMatchService.java
│   │   └── BillingCrmApplication.java
│   ├── src/main/resources/
│   │   └── application.properties
│   └── pom.xml
│
├── ai-service/                      # Python Flask AI + Voice service
│   ├── app/
│   │   ├── routes/
│   │   │   ├── health.py
│   │   │   ├── voice.py             # Audio upload + transcription
│   │   │   └── nlp.py               # Intent detection
│   │   ├── services/
│   │   │   ├── voice_service.py     # Multi-provider STT
│   │   │   └── nlp_service.py       # Regex + synonym NLP
│   │   ├── utils/
│   │   │   ├── synonyms.py          # Product synonym map
│   │   │   └── fuzzy_matcher.py     # rapidfuzz matching
│   │   └── __init__.py
│   ├── config.py
│   ├── run.py
│   ├── requirements.txt
│   └── .env
│
├── .gitignore                       # Protects secrets and build files
└── README.md
```

---

## Prerequisites

Install **all** of these before starting. Click the links for official download pages.

### 1. Node.js 18+ (for React frontend)

**Check if installed:**
```bash
node --version
# Expected: v18.x.x or higher
```

**Download:** https://nodejs.org/en/download  
Choose the **LTS** version. Install with default settings.

---

### 2. Java JDK 17 (for Spring Boot backend)

**Check if installed:**
```bash
java -version
# Expected: openjdk version "17.x.x"
```

**Download:** https://adoptium.net/temurin/releases/?version=17  
Select: `JDK 17` → your OS → `.msi` (Windows) or `.pkg` (macOS)

> ⚠️ **After installing on Windows:** You may need to add Java to PATH.  
> Search "Environment Variables" → System Variables → Path → Add: `C:\Program Files\Eclipse Adoptium\jdk-17...\bin`

---

### 3. Maven 3.9+ (Spring Boot build tool)

**Check if installed:**
```bash
mvn --version
# Expected: Apache Maven 3.9.x
```

**Download:** https://maven.apache.org/download.cgi  
Extract the archive and add the `bin/` folder to your PATH.

**Windows PATH setup:**
```
Control Panel → System → Advanced → Environment Variables
→ System Variables → Path → New → C:\apache-maven-3.9.x\bin
```

**macOS / Linux:**
```bash
export PATH=/opt/apache-maven-3.9.x/bin:$PATH
# Add this line to ~/.zshrc or ~/.bashrc to make it permanent
```

> 💡 **Easier alternative on macOS:** `brew install maven`  
> 💡 **Easier alternative on Windows:** `choco install maven`

---

### 4. Python 3.11+ (for Flask AI service)

**Check if installed:**
```bash
python --version
# or on macOS/Linux:
python3 --version
# Expected: Python 3.11.x or 3.12.x
```

**Download:** https://www.python.org/downloads/  
Select the latest **3.11.x** or **3.12.x** release.

> ⚠️ **Windows:** During installation, check ✅ **"Add Python to PATH"** before clicking Install.

---

### 5. MySQL 8.x (database)

**Check if installed:**
```bash
mysql --version
# Expected: mysql  Ver 8.x.x
```

**Download:** https://dev.mysql.com/downloads/installer/  
Download **MySQL Installer** (Windows) or **MySQL Community Server** (macOS/Linux).

During setup, when asked to create a root password — **write it down**, you will need it.

> 💡 Also install **MySQL Workbench** during setup — it provides a GUI for managing the database.

---

### 6. ffmpeg (required for audio conversion)

ffmpeg converts the browser's `.webm` audio recording to `.wav` so the AI service can process it.

**Check if installed:**
```bash
ffmpeg -version
# Expected: ffmpeg version 7.x.x ...
```

**Install on Windows (choose one method):**
```powershell
# Method A — winget (built into Windows 10/11)
winget install ffmpeg

# Method B — Chocolatey
choco install ffmpeg

# Method C — Manual
# 1. Go to https://ffmpeg.org/download.html
# 2. Click "Windows builds from gyan.dev"
# 3. Download ffmpeg-release-essentials.zip
# 4. Extract to C:\ffmpeg\
# 5. Add C:\ffmpeg\bin to your PATH (see Java PATH instructions above)
```

**Install on macOS:**
```bash
brew install ffmpeg
```

**Install on Linux (Ubuntu/Debian):**
```bash
sudo apt update && sudo apt install ffmpeg
```

> ⚠️ **After installing ffmpeg on Windows:** Close and reopen your terminal for PATH changes to take effect, then run `ffmpeg -version` to confirm.

---

### 7. Git

**Check if installed:**
```bash
git --version
# Expected: git version 2.x.x
```

**Download:** https://git-scm.com/downloads

---

### 8. Code Editor (Recommended)

- **VS Code** (best for frontend + Python): https://code.visualstudio.com/
- **IntelliJ IDEA** (best for Java backend): https://www.jetbrains.com/idea/download/ (Community edition is free)

---

## Database Setup

### Step 1 — Start MySQL server

**Windows:**
```
Search → "Services" → Find "MySQL80" → Right-click → Start
```

**macOS:**
```bash
brew services start mysql
```

**Linux:**
```bash
sudo systemctl start mysql
```

---

### Step 2 — Create the databases

Open **MySQL Workbench** or a terminal and run:

```bash
# Connect to MySQL (enter your root password when prompted)
mysql -u root -p
```

Once inside the MySQL prompt, run these SQL commands:

```sql
-- Create the main application database
CREATE DATABASE IF NOT EXISTS billing_crm
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Create the AI service database (stores voice session logs)
CREATE DATABASE IF NOT EXISTS billing_crm_ai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Create a dedicated user (more secure than using root)
CREATE USER IF NOT EXISTS 'billinguser'@'localhost' IDENTIFIED BY 'YourPassword123!';
GRANT ALL PRIVILEGES ON billing_crm.*    TO 'billinguser'@'localhost';
GRANT ALL PRIVILEGES ON billing_crm_ai.* TO 'billinguser'@'localhost';
FLUSH PRIVILEGES;

-- Verify databases were created
SHOW DATABASES;
```

Expected output includes:
```
billing_crm
billing_crm_ai
```

> 💡 The Spring Boot backend will automatically create all tables on first run (`spring.jpa.hibernate.ddl-auto=update`).

---

### Step 3 — Seed sample products (optional but recommended for voice testing)

```sql
USE billing_crm;

INSERT INTO products (name, description, price, gst_percentage, unit, status, created_at, updated_at)
VALUES
  ('Laptop',      'Standard laptop',        55000.00, 18.0, 'unit',  'ACTIVE', NOW(), NOW()),
  ('Mobile',      'Smartphone',             18000.00, 18.0, 'unit',  'ACTIVE', NOW(), NOW()),
  ('Tablet',      'Android tablet',         22000.00, 18.0, 'unit',  'ACTIVE', NOW(), NOW()),
  ('Monitor',     '24-inch display',        12000.00, 18.0, 'unit',  'ACTIVE', NOW(), NOW()),
  ('Keyboard',    'Mechanical keyboard',     3500.00,  18.0, 'unit', 'ACTIVE', NOW(), NOW()),
  ('Mouse',       'Wireless mouse',          1200.00,  18.0, 'unit', 'ACTIVE', NOW(), NOW()),
  ('Headphone',   'Noise-cancelling',        8000.00,  18.0, 'unit', 'ACTIVE', NOW(), NOW()),
  ('Printer',     'Laser printer',          15000.00,  18.0, 'unit', 'ACTIVE', NOW(), NOW()),
  ('Pen Drive',   'USB 3.0 64GB',             500.00,  18.0, 'unit', 'ACTIVE', NOW(), NOW()),
  ('Desktop',     'Desktop computer',       35000.00,  18.0, 'unit', 'ACTIVE', NOW(), NOW());
```

---

## Environment Configuration

> ⚠️ **Never commit `.env` files or any file containing real passwords/API keys to GitHub.**

### Frontend — `frontend/.env`

Create this file at `frontend/.env`:

```env
# URL of the Spring Boot backend
VITE_BACKEND_BASE_URL=http://localhost:8080/api

# URL of the Flask AI service
VITE_AI_SERVICE_BASE_URL=http://localhost:5000/api

# App display name
VITE_APP_NAME=VoiceBill CRM
VITE_APP_VERSION=1.0.0

# LocalStorage key for JWT token
VITE_TOKEN_KEY=vbcrm_token
```

---

### Backend — `backend/src/main/resources/application.properties`

```properties
# ── Application ─────────────────────────────────────────────────────────
spring.application.name=billing-crm-backend
server.port=8080
server.servlet.context-path=/api

# ── Database ─────────────────────────────────────────────────────────────
# Replace YOUR_DB_PASSWORD with the password you set during MySQL setup
spring.datasource.url=jdbc:mysql://localhost:3306/billing_crm?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
spring.datasource.username=billinguser
spring.datasource.password=YOUR_DB_PASSWORD
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# ── JPA / Hibernate ───────────────────────────────────────────────────────
spring.jpa.database-platform=org.hibernate.dialect.MySQLDialect
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.open-in-view=false

# ── Security — JWT ────────────────────────────────────────────────────────
# Change this to a long random string in production
app.jwt.secret=change-this-to-a-long-random-secret-string-at-least-64-chars
app.jwt.expiration-ms=86400000

# ── CORS ─────────────────────────────────────────────────────────────────
app.cors.allowed-origins=http://localhost:5173

# ── Flask AI Service ─────────────────────────────────────────────────────
app.ai-service.base-url=http://localhost:5000/api

# ── Swagger ──────────────────────────────────────────────────────────────
springdoc.swagger-ui.path=/swagger-ui.html

# ── Logging ──────────────────────────────────────────────────────────────
logging.level.com.billingcrm=INFO
```

---

### AI Service — `ai-service/.env`

Create this file at `ai-service/.env`:

```env
FLASK_ENV=development
FLASK_DEBUG=1
FLASK_PORT=5000

# Generate a random string for this
SECRET_KEY=change-me-to-a-random-string

# Spring Boot backend URL
BACKEND_BASE_URL=http://localhost:8080/api

# Optional: Deepgram API key for best transcription quality
# Get a free key at https://console.deepgram.com
# Leave blank to use Google Speech Recognition (free, no key needed)
DEEPGRAM_API_KEY=

# Optional: OpenAI API key for advanced NLP
OPENAI_API_KEY=

# MySQL (for AI service session logs)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=billing_crm_ai
DB_USER=billinguser
DB_PASSWORD=YOUR_DB_PASSWORD

# CORS — must match your React dev server port
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Installation Guide

### Frontend Setup

Open a terminal, navigate to the `frontend` folder, and run:

```bash
cd frontend
```

Install all dependencies:
```bash
npm install
```

> This installs React, Vite, Tailwind, Axios, Zustand, React Query, and all other packages listed in `package.json`. It may take 1–2 minutes.

Verify the installation worked:
```bash
npm list react
# Expected: react@18.x.x
```

---

### Backend Setup

Navigate to the backend folder:

```bash
cd backend
```

Build the project and download all Java dependencies:
```bash
mvn clean install -DskipTests
```

> This downloads Spring Boot, JPA, JWT, and all other Maven dependencies. First run may take 2–5 minutes.

Verify the build succeeded — you should see:
```
[INFO] BUILD SUCCESS
```

---

### AI Service Setup

Navigate to the AI service folder:
```bash
cd ai-service
```

**Step 1 — Create a virtual environment** (keeps Python packages isolated):

```bash
# Windows
python -m venv venv

# macOS / Linux
python3 -m venv venv
```

**Step 2 — Activate the virtual environment:**

```bash
# Windows (Command Prompt)
venv\Scripts\activate.bat

# Windows (PowerShell)
venv\Scripts\Activate.ps1

# macOS / Linux
source venv/bin/activate
```

> ✅ When activated, your terminal prompt will show `(venv)` at the start.

**Step 3 — Install Python dependencies:**

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

This installs:
- `flask` + `flask-cors` — web framework
- `SpeechRecognition` — Google STT (free, no API key)
- `pydub` — audio format conversion (needs ffmpeg)
- `gTTS` — text to speech
- `rapidfuzz` — fuzzy product name matching
- `deepgram-sdk` — optional better STT

**Step 4 — Verify key packages are installed:**

```bash
python -c "import speech_recognition; print('SpeechRecognition:', speech_recognition.__version__)"
python -c "import pydub; print('pydub: OK')"
python -c "import flask; print('Flask:', flask.__version__)"
```

**Step 5 — Verify ffmpeg is accessible from Python's venv:**

```bash
ffmpeg -version
```

Expected first line: `ffmpeg version 7.x.x ...`

> ❌ If you see `'ffmpeg' is not recognized` — see [Troubleshooting → ffmpeg not found](#ffmpeg-not-found).

---

## Running the Project

You need **three separate terminals** open at the same time. Open them all before starting.

---

### Terminal 1 — Spring Boot Backend

```bash
cd backend
mvn spring-boot:run
```

**Wait for this output:**
```
Started BillingCrmApplication in 8.3 seconds
Tomcat started on port(s): 8080 (http)
```

✅ Backend is ready at: http://localhost:8080/api

---

### Terminal 2 — Flask AI Service

```bash
cd ai-service

# Activate venv (REQUIRED every time you open a new terminal)

# Windows
venv\Scripts\activate.bat

# macOS / Linux
source venv/bin/activate

# Start Flask
python run.py
```

**Wait for this output:**
```
Flask AI service started — env=development
Running on http://127.0.0.1:5000
Running on http://0.0.0.0:5000
```

✅ AI service is ready at: http://localhost:5000/api

---

### Terminal 3 — React Frontend

```bash
cd frontend
npm run dev
```

**Wait for this output:**
```
VITE v5.x.x  ready in 800ms
➜  Local:   http://localhost:5173/
```

✅ Frontend is ready at: http://localhost:5173

---

### Login

Open your browser and go to: **http://localhost:5173**

**Demo credentials:**
```
Email:    admin@billingcrm.com
Password: admin123
```

> 💡 To create a real user account, use the register API:  
> `POST http://localhost:8080/api/auth/register`

---

## API Reference & Testing

### Swagger UI (Interactive API Docs)

Once the backend is running, open:

**http://localhost:8080/api/swagger-ui.html**

This gives you a full interactive API explorer where you can test every endpoint directly in the browser.

---

### Health Check Endpoints

Verify all services are running:

```bash
# Backend health
curl http://localhost:8080/api/actuator/health

# AI service health
curl http://localhost:5000/api/health/

# Frontend (just open in browser)
http://localhost:5173
```

Expected responses:
```json
// Backend
{ "status": "UP" }

// AI service
{ "status": "ok", "service": "ai-voice-service", "version": "1.0.0" }
```

---

### Key API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/auth/login` | Login, get JWT token |
| `POST` | `/api/auth/register` | Register new user |
| `GET`  | `/api/customers` | List all customers |
| `POST` | `/api/customers` | Create customer |
| `GET`  | `/api/products` | List all products |
| `POST` | `/api/products` | Create product |
| `GET`  | `/api/invoices` | List all invoices |
| `POST` | `/api/invoices` | Create invoice manually |
| `GET`  | `/api/dashboard/stats` | Dashboard statistics |
| `POST` | `/api/ai/process-voice/generate-invoice` | Voice → invoice |

---

### Test the Voice API manually

```bash
curl -X POST http://localhost:5000/api/nlp/intent \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Create invoice for Arun, 2 laptops and 3 phones"}'
```

Expected response:
```json
{
  "intent": "CREATE_INVOICE",
  "confidence": 0.95,
  "customerName": "Arun",
  "items": [
    { "name": "laptop", "rawName": "laptop", "quantity": 2 },
    { "name": "mobile", "rawName": "phone",  "quantity": 3 }
  ],
  "discountPercent": null,
  "dueInDays": 30
}
```

---

## Voice Pipeline Flow

This is the full journey from your voice to a generated invoice:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VOICE PIPELINE                               │
│                                                                      │
│  1. USER SPEAKS                                                       │
│     "Create invoice for Arun, 2 laptops and 3 phones"               │
│           │                                                           │
│           ▼                                                           │
│  2. BROWSER (React)                                                   │
│     MediaRecorder API captures microphone → audio/webm blob          │
│           │                                                           │
│           ▼  POST /api/voice/transcribe-form (multipart)             │
│  3. FLASK AI SERVICE — STT                                           │
│     • pydub converts webm → 16kHz mono WAV                           │
│     • Tries: Deepgram → Google SpeechRecognition → Whisper           │
│     • Returns: { transcript: "create invoice for Arun..." }          │
│           │                                                           │
│           ▼  POST /api/nlp/intent                                    │
│  4. FLASK AI SERVICE — NLP                                           │
│     • Regex extracts: customer="Arun", items=[laptop×2, phone×3]     │
│     • Synonym resolution: "phone" → "mobile"                         │
│     • Returns structured JSON intent                                  │
│           │                                                           │
│           ▼  POST /api/ai/process-voice/generate-invoice             │
│  5. SPRING BOOT BACKEND                                               │
│     • Receives transcript + customer name + items                    │
│     • Fuzzy matches "mobile" → Product("Mobile") in MySQL            │
│     • Fuzzy matches "laptop" → Product("Laptop") in MySQL            │
│     • Finds or creates Customer("Arun")                              │
│     • Calculates: subtotal + GST (18%) + discount = finalAmount ₹   │
│     • Generates invoice number: INV-20260322-0001                    │
│     • Saves Invoice + InvoiceItems to MySQL                          │
│     • Returns full InvoiceResponse JSON                              │
│           │                                                           │
│           ▼                                                           │
│  6. REACT FRONTEND                                                    │
│     • Displays transcript, detected intent, generated invoice        │
│     • Shows: INV-20260322-0001  Customer: Arun  Total: ₹1,71,540    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## GitHub Setup (Safe)

### Step 1 — Create `.gitignore`

Create a file named `.gitignore` in the **root** of your project (`voice-billing-crm/.gitignore`):

```gitignore
# ══════════════════════════════════════════
#  SECRETS & ENVIRONMENT — NEVER COMMIT
# ══════════════════════════════════════════
.env
.env.local
.env.production
.env.development
*.env

# ══════════════════════════════════════════
#  NODE / REACT
# ══════════════════════════════════════════
node_modules/
dist/
build/
.vite/
*.local

# ══════════════════════════════════════════
#  PYTHON / FLASK
# ══════════════════════════════════════════
venv/
__pycache__/
*.py[cod]
*.pyo
.Python
*.egg-info/
dist/
.pytest_cache/

# ══════════════════════════════════════════
#  JAVA / MAVEN / SPRING BOOT
# ══════════════════════════════════════════
target/
*.class
*.jar
*.war
.mvn/wrapper/maven-wrapper.jar

# ══════════════════════════════════════════
#  IDE FILES
# ══════════════════════════════════════════
.idea/
*.iml
.vscode/
*.swp
*.swo
.DS_Store
Thumbs.db

# ══════════════════════════════════════════
#  LOGS
# ══════════════════════════════════════════
logs/
*.log
spring.log

# ══════════════════════════════════════════
#  TEMP / AUDIO UPLOADS
# ══════════════════════════════════════════
*.tmp
*.temp
*_converted.wav
tmp/
temp/
```

---

### Step 2 — Create `.env.example` files

These show teammates which variables they need **without** revealing real values.

**`frontend/.env.example`:**
```env
VITE_BACKEND_BASE_URL=http://localhost:8080/api
VITE_AI_SERVICE_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=VoiceBill CRM
VITE_APP_VERSION=1.0.0
VITE_TOKEN_KEY=vbcrm_token
```

**`ai-service/.env.example`:**
```env
FLASK_ENV=development
FLASK_DEBUG=1
FLASK_PORT=5000
SECRET_KEY=your-random-secret-key-here
BACKEND_BASE_URL=http://localhost:8080/api
DEEPGRAM_API_KEY=your-deepgram-key-here-optional
OPENAI_API_KEY=your-openai-key-here-optional
DB_HOST=localhost
DB_PORT=3306
DB_NAME=billing_crm_ai
DB_USER=billinguser
DB_PASSWORD=your-db-password-here
CORS_ORIGINS=http://localhost:5173
```

---

### Step 3 — Push to GitHub

```bash
# Navigate to the project root
cd voice-billing-crm

# Initialise Git repository
git init

# Add everything (the .gitignore will automatically exclude secrets)
git add .

# Verify nothing sensitive was staged — look through this list carefully
git status

# Commit
git commit -m "Initial commit — Voice-Enabled Billing CRM"

# Create a new repository on GitHub at https://github.com/new
# Then connect and push:
git remote add origin https://github.com/YOUR-USERNAME/voice-billing-crm.git
git branch -M main
git push -u origin main
```

---

### Step 4 — Verify secrets were NOT pushed

```bash
# These commands must return NOTHING (empty output = safe)
git log --all --full-history -- "**/.env"
git grep "password" HEAD
git grep "api_key" HEAD
```

---

### Step 5 — What teammates do after cloning

```bash
git clone https://github.com/YOUR-USERNAME/voice-billing-crm.git
cd voice-billing-crm

# Copy example files and fill in real values
cp frontend/.env.example       frontend/.env
cp ai-service/.env.example     ai-service/.env

# Edit the copied files with real DB passwords, API keys, etc.
# Then follow the Installation Guide above
```

---

## Troubleshooting

### ffmpeg not found

**Error:** `ffmpeg is not recognized as an internal or external command`  
or: `FileNotFoundError: [WinError 2] ffmpeg`

**Fix on Windows:**
```powershell
# Option 1 — winget
winget install ffmpeg

# Option 2 — Chocolatey
choco install ffmpeg
```

After installing, **close and reopen your terminal**, then test:
```bash
ffmpeg -version
```

If it still fails, manually add ffmpeg to PATH:
1. Find where ffmpeg was installed (usually `C:\ProgramData\chocolatey\bin` or `C:\ffmpeg\bin`)
2. Open: Start → Search "Environment Variables" → System Variables → Path → Edit → New → paste the path
3. Click OK → restart terminal

**Fix on macOS:**
```bash
brew install ffmpeg
```

---

### SpeechRecognition or pydub not installed

**Error:** `ModuleNotFoundError: No module named 'speech_recognition'`

**Fix:**
```bash
# Make sure your venv is activated first!
cd ai-service
venv\Scripts\activate.bat     # Windows
# OR
source venv/bin/activate       # macOS/Linux

# Then install
pip install SpeechRecognition pydub
```

---

### CORS error in browser

**Error in browser console:** `Access to XMLHttpRequest blocked by CORS policy`

**Fix — check `application.properties`:**
```properties
app.cors.allowed-origins=http://localhost:5173
```

Make sure the port matches your React dev server (default is `5173`).

**Fix — check `ai-service/.env`:**
```env
CORS_ORIGINS=http://localhost:5173
```

Then restart both the backend and the AI service.

---

### MySQL connection error

**Error:** `Communications link failure` or `Access denied for user`

**Check 1 — Is MySQL running?**
```bash
# Windows
net start MySQL80

# macOS
brew services list | grep mysql

# Linux
sudo systemctl status mysql
```

**Check 2 — Are the credentials correct?**
```bash
mysql -u billinguser -p billing_crm
# Type the password when prompted
```

**Check 3 — Does the database exist?**
```sql
SHOW DATABASES;
-- billing_crm should appear in the list
```

**Check 4 — Wrong password in `application.properties`?**
```properties
spring.datasource.password=YOUR_ACTUAL_PASSWORD_HERE
```

---

### Microphone not working in browser

**Error:** `Microphone access denied` or `getUserMedia not supported`

**Fix 1 — Allow microphone in browser:**
- Chrome: Click the padlock 🔒 in the address bar → Microphone → Allow
- Firefox: Click the microphone icon in address bar → Allow

**Fix 2 — Must use `localhost` or HTTPS:**  
The MediaRecorder API only works on `localhost` or a secure (`https://`) domain. It will NOT work on plain `http://` with an IP address like `http://192.168.x.x:5173`.

**Fix 3 — Check no other app is using the microphone:**  
Close Zoom, Teams, or any other app using the mic, then reload the page.

---

### Flask ImportError

**Error:** `cannot import name 'voice_bp' from 'app.routes.voice'`

This means the Blueprint variable was renamed. Open `ai-service/app/routes/voice.py` and verify the Blueprint is defined as:
```python
voice_bp = Blueprint("voice", __name__)
```

Then verify `ai-service/app/__init__.py` imports it as:
```python
from app.routes.voice import voice_bp
```

---

### Spring Boot port already in use

**Error:** `Port 8080 was already in use`

```bash
# Windows — find what is using port 8080
netstat -ano | findstr :8080
# Note the PID number, then kill it:
taskkill /PID <PID_NUMBER> /F

# macOS / Linux
lsof -i :8080
kill -9 <PID_NUMBER>
```

---

### npm install fails

**Error:** `ENOENT` or `cb() never called`

```bash
# Clear the npm cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json   # macOS/Linux
# OR on Windows:
rd /s /q node_modules && del package-lock.json

npm install
```

---

### Axios not installed

**Error:** `Cannot find module 'axios'`

```bash
cd frontend
npm install axios
```

---

### Voice transcription returns 500 error

This is almost always caused by a missing provider. The Flask console will tell you exactly which package is missing.

**Check Flask console output** — it will show something like:
```
Transcription error: All STT providers failed:
Google-SpeechRecognition: pip install SpeechRecognition
```

**Fix:**
```bash
cd ai-service
source venv/bin/activate   # or venv\Scripts\activate.bat on Windows
pip install SpeechRecognition pydub
```

Then make sure ffmpeg is installed (see above), and restart Flask.

---

### JWT token expired

**Error in browser:** `Session expired. Please login again.`

This is expected — the token expires after 24 hours by default. Simply log in again. To extend the duration, change in `application.properties`:
```properties
# 86400000 = 24 hours in milliseconds
# 604800000 = 7 days
app.jwt.expiration-ms=604800000
```

---

## Summary — Service URLs

| Service | URL | Notes |
|---|---|---|
| React Frontend | http://localhost:5173 | Main UI |
| Spring Boot API | http://localhost:8080/api | REST API |
| Swagger UI | http://localhost:8080/api/swagger-ui.html | API docs |
| Health Check | http://localhost:8080/api/actuator/health | Backend status |
| Flask AI | http://localhost:5000/api | AI + Voice |
| Flask Health | http://localhost:5000/api/health/ | AI status |
| MySQL | localhost:3306 | Database |

---

*Built with React 18, Spring Boot 3.2, Flask 3.0, MySQL 8. Voice pipeline: MediaRecorder → Deepgram/Google STT → Regex NLP → JaroWinkler fuzzy match → GST invoice.*
