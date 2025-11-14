// src/components/ThemeProvider.tsx

import { createContext, useContext, useEffect, ReactNode } from "react";

type ThemeProviderProps = {
  children: ReactNode;
};

type ThemeProviderState = {
  theme: "light";
};

const initialState: ThemeProviderState = {
  theme: "light",
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps) {
  useEffect(() => {
    // Hapus kelas 'dark' jika ada dan pastikan 'light' selalu ada
    const root = window.document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
  }, []); // Efek ini hanya berjalan sekali saat komponen dimuat

  const value: ThemeProviderState = {
    theme: "light",
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  // Hook ini masih berfungsi dan akan selalu mengembalikan { theme: 'light' }
  return context;
};