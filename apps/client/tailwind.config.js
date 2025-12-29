/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // 启用基于 class 的暗黑模式
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 定义语义化颜色变量，方便后续调整
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}
