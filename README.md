# Testora — Complete Online Quiz & Assessment Management Platform

A production-ready web application for creating, conducting, and analyzing online quizzes and assessments with Google Forms-like ease, advanced anti-cheating browser monitoring, server-side scoring, and dynamic Excel/CSV report exports.

---

## Key Architecture & Core Requirements

### 1. Two-Tier User Model
- **ADMIN**: Authenticated with email & password (JWT sessions in HTTP-only cookies). Manages quizzes, question bank, anti-cheating rules, student responses, real-time analytics, and downloads reports.
- **STUDENT**: **Zero registration / No student login**. Accesses quizzes directly via random public link (e.g. `https://domain.com/quiz/PY8F29K`) or scannable QR Code. Identification is configured by the admin (Name, Register Number, Email, Class, Department).

### 2. Vercel & Cloud Database Ready
- Fully serverless-compatible Next.js App Router architecture.
- Does not rely on permanent local file storage — dynamic on-demand Excel, CSV, and QR code generation.
- Supports any cloud-hosted MySQL/PostgreSQL-compatible database (**Neon, PlanetScale, TiDB Cloud, Railway**) or SQLite for local dev via Prisma ORM.

---

## Default Admin Credentials

When the database is seeded, the default administrator credentials are:

- **Email**: `admin@quizplatform.com`
- **Password**: `AdminPassword@123`
- **Admin Portal URL**: `http://localhost:3000/admin/login`

---

## Pre-Seeded Sample Quizzes & Public Codes

1. **Python Programming Assessment**
   - **Public Code**: `PY8F29K`
   - **Direct Link**: `http://localhost:3000/quiz/PY8F29K`
   - **Features**: MCQ, Multiple Select, True/False, Short Answer, Matching pairs, Anti-Cheating & Auto-save enabled.
2. **Full-Stack Web Development Mastery**
   - **Public Code**: `WEB901X`
   - **Direct Link**: `http://localhost:3000/quiz/WEB901X`

---

## Features

### Admin Experience
- **SaaS Dashboard**: Real-time metrics for total quizzes, participants, completed submissions, average score, pass rate, daily response trend charts, and score distribution charts.
- **Google Forms-Style Question Builder**:
  - Drag-and-drop / Move Up & Down reordering.
  - Question types: Multiple Choice (Single), Multiple Select (Checkboxes), True/False, Short Answer (with keyword / case-insensitive evaluation), Descriptive Long Answer, Fill in the Blank, Matching Pairs, Rating (1-5), Linear Scale (1-10), File Upload.
  - Per-question marks, negative marking, explanations, and difficulty ratings.
- **Question Bank Repository**: Search and filter reusable questions by subject, topic, difficulty, and type. 1-click import into active assessments.
- **Bulk CSV / JSON Importer**: Instant live format validation and error preview before committing questions.
- **Comprehensive Settings**:
  - Response controls: Single-response enforcement, attempt limits, customizable student identity fields.
  - Browser Anti-cheating configuration: Fullscreen mode, tab switch detection, window focus tracking, copy/paste prevention, violation action thresholds (Auto-submit / Terminate / Warning).
  - Result visibility controls: Show/hide score, percentage, pass/fail badge, answer key, and solution reviews.
- **Live Student Responses Table**: Filter by status, score, class, department, and security violations. Modal for question-by-question review and audit timeline.
- **Analytics & Visualizations**: Recharts-powered score distribution bar charts, daily submission trends, and question accuracy percentages.
- **Dynamic Multi-Sheet Excel & CSV Reports**: Export workbooks with sheets for Summary, Student Results, Question Analysis, and Security Violations without relying on local server disk storage.
- **Share & QR Code Engine**: Generate scannable QR codes (downloadable as PNG) and direct links with optional code regeneration.

### Student Experience (No Login Required)
- **Instant Join**: Open quiz link or enter 7-char code from home portal.
- **Required Identity Form**: Name, Register Number, Email, Class, Department (as required by admin).
- **Distraction-Free Exam Interface**:
  - Server-backed countdown timer (calculates remaining time from server timestamps; auto-submits on expiration).
  - Question navigator palette with Answered, Unanswered, Marked for Review, and Current status indicators.
  - Continuous real-time auto-saving with cloud sync indicators.
  - Anti-cheating monitoring: Fullscreen lock, tab switch warnings, blur tracking, and auto-submit upon exceeding violation thresholds.
  - Submission confirmation modal displaying counts of answered vs unanswered questions.
- **Immediate Result Feedback**: Pass/Fail celebration badge, confetti animation, score breakdown, and optional answer solution review.

---

## Local Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file based on `.env.example`:
```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="your-super-secure-jwt-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="Testora Assessment Platform"
```

### 3. Initialize Database & Seed
```bash
npx prisma db push
node prisma/seed.mjs
```

### 4. Start Development Server
```bash
npm run dev
```
Open `http://localhost:3000` to access the student portal or `http://localhost:3000/admin/login` for the admin dashboard.

---

## Production Deployment to Vercel

1. **Database Setup**:
   - Create a cloud-hosted MySQL database (PlanetScale, TiDB Cloud, Railway, or Aiven MySQL).
   - In `prisma/schema.prisma`, ensure provider is set to `mysql` (or leave default datasource if using Prisma Accelerate/compatible connection).
2. **Push to GitHub**:
   - Push this repository to your GitHub account.
3. **Import into Vercel**:
   - Go to [vercel.com](https://vercel.com) and import the repository.
   - Configure Environment Variables:
     - `DATABASE_URL`: Your production MySQL connection string (e.g. `mysql://user:pass@host:3306/quizdb?sslaccept=strict`)
     - `AUTH_SECRET`: Random 32+ character secret string.
     - `NEXT_PUBLIC_APP_URL`: Your production domain (e.g. `https://your-quiz-app.vercel.app`)
4. **Deploy**:
   - Click **Deploy**. Vercel will automatically run `npm run build` and launch the application.

---

## Security & Anti-Cheating Disclosure

> **Important Technical Note**: A standard web browser running on a student's personal computer or phone cannot physically prevent a user from looking at a second physical device, receiving verbal assistance, or modifying local browser developer tools.
>
> Therefore, this application implements **detection, deterrence, and structured logging**:
> - Fullscreen enforcement with violation triggers on exit.
> - Tab visibility tracking (`visibilitychange` API) detecting tab switches and window minimizing.
> - Window focus loss detection (`blur` events).
> - Copy, paste, and context menu blocking.
> - Configurable violation thresholds that can automatically submit or terminate the attempt.
> - For high-stakes government or certification exams, this platform can be integrated with dedicated Secure Exam Browsers.

---

## License
MIT License.
