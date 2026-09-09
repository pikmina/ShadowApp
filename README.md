# Shadowmore

A comprehensive full-stack application built for managing character sheets, inventories, and a system catalog.

## Tech Stack
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- Backend: Express (Node.js) + TypeScript
- Database: PostgreSQL (via Drizzle ORM)
- Authentication: Firebase Auth

## Deployment Guidelines (Render.com)
Since this application includes a custom Express backend (`server.ts`) to securely handle database connections and third-party API interactions, it cannot be deployed as a static site. It requires an environment capable of running a Node.js server.

### Steps to Deploy on Render

1. **Database Setup (Neon.tech):**
   - Go to [Neon.tech](https://neon.tech/) and create a free PostgreSQL database.
   - Copy the connection string provided (it looks like `postgresql://user:password@endpoint.neon.tech/neondb?sslmode=require`).

2. **Render Configuration:**
   - Go to [Render.com](https://render.com/) and create a new **Web Service**.
   - Connect your GitHub repository.
   - Configure the service as follows:
     - **Environment:** `Node`
     - **Build Command:** `npm run build`
     - **Start Command:** `npm run start`

3. **Environment Variables:**
   - In the Render dashboard for your Web Service, go to the "Environment" tab.
   - Add a new variable:
     - **Key:** `DATABASE_URL`
     - **Value:** (Paste the connection string from Neon.tech)

4. **Deploy:**
   - Click "Save Changes" and Render will automatically build and deploy your application.
   - Note: On the free tier, the application will spin down after 15 minutes of inactivity. It may take ~40 seconds to spin back up on the next request.
