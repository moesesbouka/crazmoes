import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Nunito", "sans-serif"],
        display: ["Poppins", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        fun: {
          red: "hsl(var(--fun-red))",
          blue: "hsl(var(--fun-blue))",
          yellow: "hsl(var(--fun-yellow))",
          orange: "hsl(var(--fun-orange))",
          green: "hsl(var(--fun-green))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "bounce-in": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1.2)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-5px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(5px)" },
        },
        "pop-in": {
          "0%": { transform: "scale(0) rotate(-10deg)", opacity: "0" },
          "70%": { transform: "scale(1.1) rotate(3deg)" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 5px hsl(var(--primary) / 0.5), 0 0 20px hsl(var(--primary) / 0.3)" },
          "50%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.8), 0 0 40px hsl(var(--primary) / 0.5)" },
        },
        tada: {
          "0%, 100%": { transform: "scale(1) rotate(0deg)" },
          "10%, 20%": { transform: "scale(0.9) rotate(-3deg)" },
          "30%, 50%, 70%, 90%": { transform: "scale(1.1) rotate(3deg)" },
          "40%, 60%, 80%": { transform: "scale(1.1) rotate(-3deg)" },
        },
        "zoom-wiggle": {
          "0%, 100%": { transform: "scale(1) rotate(0deg)" },
          "25%": { transform: "scale(1.05) rotate(-2deg)" },
          "50%": { transform: "scale(1.08) rotate(2deg)" },
          "75%": { transform: "scale(1.05) rotate(-2deg)" },
        },
        "bounce-crazy": {
          "0%, 100%": { transform: "translateY(0) scaleY(1)" },
          "30%": { transform: "translateY(-20px) scaleY(1.1)" },
          "50%": { transform: "translateY(0) scaleY(0.9) scaleX(1.1)" },
          "70%": { transform: "translateY(-10px) scaleY(1.05)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
        float: "float 3s ease-in-out infinite",
        wiggle: "wiggle 2s ease-in-out infinite",
        "bounce-in": "bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards",
        shake: "shake 0.5s ease-in-out",
        "pop-in": "pop-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        tada: "tada 1s ease-in-out",
        "zoom-wiggle": "zoom-wiggle 2s ease-in-out infinite",
        "bounce-crazy": "bounce-crazy 1s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
