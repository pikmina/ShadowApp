
import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { ThemeProvider } from "next-themes";
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

const NextThemesProvider = ThemeProvider as unknown as React.FC<
  React.ComponentProps<typeof ThemeProvider> & { children: React.ReactNode }
>;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </NextThemesProvider>
  </StrictMode>,
);
