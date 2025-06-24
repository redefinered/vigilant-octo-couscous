# ACC Companion 🏎️⚙️

A native desktop application built with **Electron Forge**, **React**, **TypeScript**, and **Webpack**. Designed to help Assetto Corsa Competizione (ACC) drivers calculate fuel requirements, analyze setups, and view live telemetry data — with full offline support and a clean UI.

---

## 🔧 Tech Stack

- [Electron Forge](https://www.electronforge.io/) – packaging + cross-platform support
- [React](https://reactjs.org/) – UI framework
- [TypeScript](https://www.typescriptlang.org/) – typed safety
- [Webpack](https://webpack.js.org/) – bundling
- [Tailwind CSS](https://tailwindcss.com/) – styling
- [.NET Core](https://dotnet.microsoft.com/) – ACC telemetry bridge

---

## ✨ Features

### 🧮 Fuel Calculator
- **Manual Input Mode**:
  - Fuel per lap (L)
  - Lap time (`MM:SS`)
  - Race duration (minutes)
  - Mandatory pitstops
  - Formation lap toggle
- **Auto-Calculate Mode**:
  - Automatic fuel per lap from ACC telemetry (`fuelXLap`)
  - Real-time lap time updates from `lastLapTime`
  - Smart fallback estimation using throttle and speed data
  - Visual indicators for auto-populated fields
- **Outputs**:
  - Estimated total laps
  - Fuel per stint
  - Total fuel needed (including 1-lap buffer + optional formation lap)

### 📊 Live Telemetry
- Real-time data from ACC via WebSocket connection
- Fuel level, speed, RPM, gear, throttle, brake
- Lap times (current, last, best)
- Session information and track details
- Tyre pressures, temperatures, and brake temperatures

### 🔧 Setup Analysis
- **Real-time Setup Monitoring**:
  - Tyre pressure analysis with color-coded status
  - Tyre temperature monitoring with optimal range detection
  - Brake temperature warnings
  - Performance metrics and lap time consistency
- **Intelligent Suggestions**:
  - Setup recommendations with priority levels (high/medium/low)
  - Pressure and temperature imbalance detection
  - Performance optimization tips
  - Driving style recommendations

### 🎨 User Experience
- Dark/Light mode toggle
- Help modal with comprehensive guidance
- Persistent settings with localStorage
- Responsive design for all screen sizes
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

### 3. Start ACC Telemetry Bridge (Optional)

For live telemetry and auto-calculate features:

```bash
cd ACCBridge
dotnet run
```

### 4. Run the App in Dev Mode

```bash
npm start
```

Electron will launch with hot-reloaded React + TypeScript.

---

## 🧱 Project Structure

```
acc-companion/
├── src/
│   ├── App.tsx              # Main application component
│   ├── index.css            # Global styles and Tailwind
│   ├── index.html           # HTML template
│   ├── index.ts             # Electron main process
│   ├── preload.ts           # Preload scripts
│   ├── renderer.tsx         # React entry point
├── ACCBridge/               # .NET Core telemetry bridge
│   ├── Program.cs           # WebSocket server
│   ├── RealACCData.cs       # ACC shared memory reader
│   ├── MockACCData.cs       # Mock data for testing
│   └── ACCBridge.csproj     # .NET project file
├── forge.config.ts          # Electron Forge configuration
├── package.json             # Node.js dependencies
├── tailwind.config.js       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── README.md
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

### Fuel Calculator
- **Auto-Calculate Mode**: Enable toggle for automatic data from ACC
- **Manual Mode**: 
  - Fuel per lap: `2.94`
  - Lap time: `2:06.5`
  - Race length: `90`
  - Pit stops: `1`
  - Formation lap: ✅

Results: ~43 laps → ~132L fuel (with buffer)

### Setup Analysis
- Monitor tyre pressures (optimal: 1.9-2.1 bar)
- Check tyre temperatures (optimal: 75-90°C)
- Review brake temperatures (warning: >300°C)
- Get setup suggestions based on telemetry imbalances

---

## 🔧 Configuration

### ACC Telemetry Setup
1. Enable telemetry in ACC settings
2. Start the ACCBridge server (`dotnet run` in ACCBridge folder)
3. Launch ACC Companion
4. Switch to "Live Telemetry" or "Setups" tab

### Auto-Calculate Fuel
1. Enable "Auto-calculate from telemetry" toggle
2. Enter race duration manually
3. Set pit stops and formation lap preferences
4. Watch real-time calculations update automatically

---

## ✅ Recent Updates (v0.0.5)

- ✨ **New Setups Tab**: Comprehensive setup analysis with telemetry-based recommendations
- 🔄 **Auto-Calculate Fuel**: Smart fuel calculator using live ACC data
- 📊 **Enhanced Telemetry**: Improved data structure and processing
- 🎨 **Better UI/UX**: Visual indicators and improved user feedback
- 📚 **Updated Documentation**: Comprehensive help system and guides

---

## 👤 Author

Created by [Red De Guzman](https://github.com/redefinered) — for sim racers who want to ditch spreadsheets and focus on racing.

---

## 📃 License

MIT
