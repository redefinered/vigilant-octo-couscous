# ACC Companion 🏎️⚙️

A native desktop application built with **Electron Forge**, **React**, **TypeScript**, and **Webpack**. Designed to help Assetto Corsa Competizione (ACC) drivers calculate fuel requirements and view live telemetry data — with full offline support and a clean UI.

---

## 🔧 Tech Stack

- [Electron Forge](https://www.electronforge.io/) – packaging + cross-platform support
- [React](https://reactjs.org/) – UI framework
- [TypeScript](https://www.typescriptlang.org/) – typed safety
- [Webpack](https://webpack.js.org/) – bundling
- [Tailwind CSS](https://tailwindcss.com/) *(optional for styling)*

---

## ✨ Features

- Inputs:
  - Fuel per lap (L)
  - Lap time (`MM:SS`)
  - Race duration (minutes)
  - Mandatory pitstops
  - Formation lap toggle
- Outputs:
  - Estimated total laps
  - Fuel per stint
  - Total fuel needed (including 1-lap buffer + optional formation lap)
- Live Telemetry from ACC via Broadcast API
- Help modal for users
- Fully offline, distributable `.exe`

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/redefinered/vigilant-octo-couscous.git
cd vigilant-octo-couscous
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the App in Dev Mode

```bash
npm start
```

Electron will launch with hot-reloaded React + TypeScript.

---

## 🧱 Project Structure

```
vigilant-octo-couscous/
├── src/
│   ├── App.tsx
│   ├── index.css
│   ├── index.html
│   ├── index.ts
│   ├── preload.ts
│   ├── renderer.tsx
├── forge.config.ts
├── package.json
├── README.md
└── ...
```

---

## 📦 Build for Production

To generate the distributable package:

```bash
npm run make
```

The final `.exe` (or platform binary) will be output to the `out/` directory.

---

## 🧪 Example Usage

- Fuel per lap: `2.94`
- Lap time: `2:06.5`
- Race length: `90`
- Pit stops: `1`
- Formation lap: ✅

Results: ~43 laps → ~132L fuel (with buffer)

---

## ✅ Future Enhancements

- Dark mode toggle
- Track presets and favorites
- Export to CSV or PDF
- Config saving with localStorage or JSON file

---

## 👤 Author

Created by [Red De Guzman](https://github.com/redefinered) — for sim racers who want to ditch spreadsheets and focus on racing.

---

## 📃 License

MIT
