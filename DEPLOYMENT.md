# Deployment Guide

This project is configured to be easily deployed to GitHub Pages.

## Automatic Deployment (Recommended)

This repository includes a GitHub Actions workflow that automatically builds and deploys the application whenever you push to the `main` branch.

### Prerequisites

1.  **Repository Settings**:
    *   Go to your repository on GitHub.
    *   Navigate to **Settings** > **Pages**.
    *   Under **Build and deployment**, select **GitHub Actions** as the source.

2.  **Push to Main**:
    *   Simply push your changes to the `main` branch.
    *   The "Deploy to GitHub Pages" action will start automatically.

3.  **View Your Site**:
    *   Once the action completes, your site will be live at `https://<your-username>.github.io/uartWebAssistant/`.

## Manual Deployment

If you prefer to deploy manually:

1.  **Build the Project**:
    ```bash
    npm run build
    ```

2.  **Deploy the `dist` folder**:
    *   The build output is located in the `dist` directory.
    *   You can upload this folder to any static hosting service (Netlify, Vercel, S3, etc.).

## Configuration

The `vite.config.ts` file is configured with a `base` path of `/uartWebAssistant/`.

*   If you are deploying to a custom domain (e.g., `app.example.com`) or the root of your GitHub Pages (e.g., `username.github.io`), you should change the base path in `vite.config.ts` to `'/'`.

```typescript
// vite.config.ts
export default defineConfig({
  // ...
  base: '/', // Change to this for root domain deployment
})
```
