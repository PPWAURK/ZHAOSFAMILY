/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#1D1A16",
        paper: "#F7F2EA",
        brand: "#7A4E2D",
        line: "#E8DED2",
      },
    },
  },
  plugins: [],
};