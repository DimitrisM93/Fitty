# Fitty

Fitty is a full-stack fitness and meal tracking Progressive web app (PWA) powered by AI. It uses Gemini and Groq AI to automatically analyze your meals, calculate nutritional values, and help you track your fitness goals.

💖 **If you like Fitty and want to support its open-source development, 👉[please consider buying me a coffee!](YOUR_BUY_ME_A_COFFEE_LINK_HERE)** ☕ 👈



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
1. **Import the Code**: Fork or clone this repository to your own GitHub account. **I highly recommend making your repository Private** so that if you ever accidentally commit your `.env` file, your keys remain safe. Go to [Vercel](https://vercel.com/) and create a new project by importing your GitHub repository.
2. **Set up the Database**: Before hitting deploy, go to the **Storage** tab in your new Vercel project, click **Create Database** -> **Postgres**, and follow the prompts to create a free database. Vercel will automatically link it to your project.
3. **Configure Environment Variables**: In your Vercel Project Settings, navigate to the **Environment Variables** section and add the following keys:
   - `GEMINI_API_KEY`: Your Gemini API key.
   - `GROQ_API_KEY`: Your Groq API key.
   - `APP_PIN`: A custom numeric PIN to lock your app (e.g., `1234`).
   - `JWT_SECRET`: A random, secure password string used for managing login sessions (e.g., `hf834y98rh34f89h34f`). If omitted, it will fall back to using your APP_PIN.
4. **Deploy**: Hit **Deploy**! Vercel will build the app, connect to the database, and give you a live URL.

---

## 📱 Installing on your Phone (PWA)

Since Fitty is a Progressive Web App (PWA), you can install it directly to your phone's home screen for a native app-like experience!

### iOS (iPhone/iPad)
1. Open your live Fitty URL in **Safari**.
2. Tap the **Share** button (the square with an arrow pointing up at the bottom of the screen).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add** in the top right corner.

### Android
1. Open your live Fitty URL in **Chrome**.
2. Tap the **3-dot menu icon** in the top right corner.
3. Tap **Install app** or **Add to Home screen**.
4. Follow the prompt to add it to your home screen.

---

## 🛠️ Customizing the AI Prompts (Severity & Tone)

Fitty uses AI to analyze meals and suggest foods. If you want to change the "severity" or tone of the AI (e.g., make the nutritionist stricter, more lenient, or change dietary preferences), you can modify the prompts directly in the backend code:

1. **Meal Analysis Prompt**: Open `server/routes/analyze.js` and modify the `MEAL_ANALYSIS_PROMPT` variable.
2. **Food Suggestion Prompt**: Open `server/routes/suggest.js` and modify the `prompt` variable inside the route handler.

After saving your changes, restart the backend server for the new prompts to take effect.

---

## 🤔 FAQ & API Clarification

- **Why does this app need its own API keys?**
  Fitty is designed to be a completely free, self-hosted application. Instead of charging you a monthly subscription to cover cloud AI costs, Fitty lets you plug in your own API keys. This means the app runs entirely on your own accounts, giving you full control, privacy, and no subscription fees.

- **Will I be charged for using the Gemini or Groq APIs?**
  **No!** Both Google Gemini (via Google AI Studio) and Groq offer very generous **Free Tiers** that are more than enough for personal use. 
  - **Google Gemini**: The free tier allows for plenty of daily requests, which is perfect for analyzing your daily meals and food images.
  - **Groq**: Provides lightning-fast, free access to top open-source models for text processing, suggestions, and generation.
  
  As long as you are using this app for your personal fitness tracking, you will stay well within the free limits of both services and won't pay a dime.

- **Why does the app use both Gemini and Groq AIs?**
  Fitty leverages the best tool for each specific job. Google Gemini is fantastic at analyzing images of your food and determining precise nutritional breakdowns. Groq, on the other hand, runs open-source models at lightning speed, making it perfect for instantaneous dietary suggestions and rapid text processing without making you wait.

- **How does the AI meal tracking actually work?**
  When you upload an image or type a description of your meal, the app sends it to the AI. The AI acts as a professional nutritionist: identifying the food items, estimating portion sizes, and calculating the calories, protein, carbs, and fats. It then automatically logs these into your daily dashboard.

- **Is my meal and fitness data private?**
  Yes! Because you host the application yourself and provide your own database, you are in complete control of your data. Nobody else has access to your personal logs. *(Note: Data sent to Gemini and Groq for analysis is subject to their respective privacy policies, but your historical logs remain entirely in your private database).*

- **Can I use a different database instead of Postgres?**
  Out of the box, Fitty is configured to use PostgreSQL. However, because the backend is built with standard Node.js, developers can easily modify the database configuration to support MySQL, SQLite, or other SQL databases with minimal code changes.

- **Do I need to be a developer to use Fitty?**
  Not at all! While setting it up for the first time takes a few minutes (following the Vercel steps above), once it's running, it works exactly like any normal app you'd use on your phone.

- **Is Fitty on the App Store or Google Play?**
  No. Fitty is a Progressive Web App (PWA). This means you don't need to download it from an app store. You just open your custom URL in your mobile browser, tap "Add to Home Screen", and it installs directly to your phone and behaves like a native app. 

- **Does Fitty track my workouts too?**
  Yes! Fitty isn't just for food. You can use it to log your workouts and overall fitness progress right alongside your meal nutrition so everything is in one place.

- **Is it really 100% free forever?**
  Yes. Unlike other fitness apps that hide the best features behind a "Premium" paywall, Fitty gives you every single feature for free because you are the one hosting it.

- **What if I find a bug or the app crashes?**
  Fitty is a completely free, open-source indie app built in my spare time. Because of this, you might occasionally run into bugs, hiccups, or unexpected crashes. If something breaks, please bear with me and feel free to open an Issue on GitHub so I can take a look!

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
