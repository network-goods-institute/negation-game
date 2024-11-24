# Negation Game 

## Getting Started

### Prerequisites

1. Install pnpm if you haven't already:
```bash
npm install -g pnpm
```

2. Install PostgreSQL 16:
   - Download from https://www.postgresql.org/download/windows/
   - During installation:
     - Remember the password you set for the postgres user
     - Keep the default port (5432)
     - Complete the installation

3. Install Visual Studio Build Tools:
   - Go to: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Download and run the installer
   - Select "Desktop development with C++"
   - Install

4. Install pgvector extension:
   - Open Command Prompt as Administrator
   - Run these commands:
   ```cmd
   call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"
   set "PGROOT=C:\Program Files\PostgreSQL\16"
   cd %TEMP%
   git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git
   cd pgvector
   nmake /F Makefile.win
   nmake /F Makefile.win install
   ```

### Database Setup

1. Open pgAdmin 4:
   - Find "pgAdmin 4" in your Start Menu
   - When prompted, enter the master password you created during installation
   - In the left sidebar, expand "Servers" → "PostgreSQL 16" and connect to it
   - Enter your postgres user password when prompted

2. Create a new database:
   - Right-click on "Databases"
   - Select "Create" → "Database"
   - Name: `negation_game`
   - Click "Save"

3. Enable pgvector extension:
   - Right-click on your new database (`negation_game`)
   - Select "Query Tool"
   - Run this SQL command:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

### Installation

1. Install the project dependencies:
```bash
pnpm install
```

2. Create a `.env.local` file in the root directory with the following content:
```bash
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
POSTGRES_URL=postgres://postgres:your_password@localhost:5432/negation_game
```

Replace:
- `your_privy_app_id_here` with your Privy App ID (from https://privy.io/)
- `postgres` with your PostgreSQL username if you changed it from the default
- `your_password` with your PostgreSQL password
- `negation_game` with your database name if you used a different one

3. Run the database migrations:
```bash
pnpm drizzle-kit push
```

### Development Server

Run the development server:
```bash
pnpm dev
```

Then, go to [http://localhost:3000](http://localhost:3000).

### Troubleshooting

If you encounter database connection issues:
- Verify PostgreSQL is running:
  - Open Services (Win + R, type "services.msc")
  - Look for "postgresql-x64-16" - should be "Running"
- Verify your credentials:
  - Try connecting with pgAdmin to test your username/password
- Check your POSTGRES_URL:
  - Format should be: `postgres://postgres:your_password@localhost:5432/negation_game`
  - Special characters in password need to be URL-encoded
- If pgvector compilation fails:
  - Make sure Visual Studio Build Tools is properly installed
  - Ensure you're running Command Prompt as Administrator
  - Verify the paths to Visual Studio and PostgreSQL are correct
  - Try restarting your computer after installing Build Tools