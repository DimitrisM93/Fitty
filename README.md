# Fitty

Fitty is a full-stack fitness and meal tracking application powered by AI. It uses Gemini and Groq AI to automatically analyze your meals, calculate nutritional values, and help you track your fitness goals.

## Tech Stack
- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **AI Integration**: Google Gemini API & Groq API

---

## 🚀 Quick Deployment (Vercel)

The easiest way to host Fitty for yourself is by deploying it on Vercel. 

### 1. Prepare your APIs
Before deploying, you will need to get a few free API keys:
- **Gemini API Key**: Get it for free at [Google AI Studio](https://aistudio.google.com/).
- **Groq API Key**: Get it for free at [Groq Console](https://console.groq.com/).

### 2. Deploy on Vercel
1. **Import the Code**: Fork or clone this repository to your own GitHub account. **We highly recommend making your repository Private** so that if you ever accidentally commit your `.env` file, your keys remain safe. Go to [Vercel](https://vercel.com/) and create a new project by importing your GitHub repository.
2. **Set up the Database**: Before hitting deploy, go to the **Storage** tab in your new Vercel project, click **Create Database** -> **Postgres**, and follow the prompts to create a free database. Vercel will automatically link it to your project.
3. **Configure Environment Variables**: In your Vercel Project Settings, navigate to the **Environment Variables** section and add the following keys:
   - `GEMINI_API_KEY`: Your Gemini API key.
   - `GROQ_API_KEY`: Your Groq API key.
   - `APP_PIN`: A custom numeric PIN to lock your app (e.g., `1234`).
   - `JWT_SECRET`: A random, secure password string used for managing login sessions (e.g., `hf834y98rh34f89h34f`). If omitted, it will fall back to using your APP_PIN.
4. **Deploy**: Hit **Deploy**! Vercel will build the app, connect to the database, and give you a live URL.

---

## 💻 Local Development Setup

If you want to run Fitty locally on your own machine instead, follow these steps:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- A local or cloud PostgreSQL database

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/Fitty.git
   cd Fitty
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   Copy the example environment file and rename it to `.env`:
   ```bash
   cp .env.example .env
   ```
   *Make sure to open your `.env` file and fill in your API keys, App PIN, and `DATABASE_URL`!*

4. Start the application:
   You can start both the React frontend and the Express backend concurrently with one command:
   ```bash
   npm run dev:all
   ```

5. Open your browser and navigate to `http://localhost:5173`. 
