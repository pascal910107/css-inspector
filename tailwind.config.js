/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./popup.html", "./styles/*.css", "./scripts/*.js"],
  theme: {
    extend: {
      colors: {
        primary: "#61afef",
        secondary: "#c678dd",
        dark: "#1e1e1e",
        "dark-light": "#2c2c2c",
        success: "#4CAF50",
      },
      keyframes: {
        fadeInOut: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "10%": { opacity: "1", transform: "translateY(0)" },
          "90%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-20px)" },
        },
      },
      animation: {
        fadeInOut: "fadeInOut 2s ease-in-out",
      },
    },
  },
  plugins: [],
};
