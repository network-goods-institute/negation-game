# Negation Game 

## Getting Started

### Prerequisites

#### Windows
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

#### Linux (Tested on Linux Mint)
1. Install pnpm:
```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc  ## or restart your terminal
```

2. Install PostgreSQL 16:
```bash
## Add PostgreSQL repository (for Ubuntu/Linux Mint)
## slight changes may be needed for other distros (or ubuntu versions)
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(. /etc/os-release && echo $UBUNTU_CODENAME)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

## Update package list and install PostgreSQL
sudo apt update
sudo apt install postgresql-16
```

3. Install build dependencies and pgvector:
```bash
## Install build dependencies
sudo apt install git gcc make postgresql-server-dev-16

## Clone and install pgvector
cd /tmp
git clone --branch v0.8.0 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

4. Start PostgreSQL service:
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

5. Set up PostgreSQL user password:
```bash
## please do not use admin on production
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'admin';"
```

### Database Setup

1. Create a new database:
```bash
sudo -u postgres psql -c "CREATE DATABASE negation_game;"
```

2. Enable pgvector extension:
```bash
sudo -u postgres psql -d negation_game -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

For GUI management (optional):
- Install pgAdmin4 following instructions at: https://www.pgadmin.org/download/

### Installation

Make sure you're back in the root directory of the project.

1. Install the project dependencies:
```bash
pnpm install
```

2. Create a `.env.local` file in the root directory with the following content:
```bash
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
NEXT_PUBLIC_PRIVY_APP_SECRET=your_privy_app_secret_here
POSTGRES_URL=postgres://postgres:your_password@localhost:5432/negation_game
```

Replace:
- `your_privy_app_id_here` with your Privy App ID (from https://privy.io/)
- `your_privy_app_secret_here` with your Privy App Secret (from https://privy.io/)
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

#### Windows Issues
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

#### Linux Issues
- If PostgreSQL service fails to start:
  ```bash
  sudo systemctl status postgresql
  # Check logs for errors
  sudo journalctl -u postgresql
  ```
- If you can't connect to PostgreSQL:
  - Verify the service is running: `sudo systemctl status postgresql`
  - Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-16-main.log`
  - Ensure your pg_hba.conf allows local connections:
    ```bash
    sudo nano /etc/postgresql/16/main/pg_hba.conf
    # Restart after changes
    sudo systemctl restart postgresql
    ```