# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.5] - 2025-06-25

### 🚀 Added
- **New Setups Tab**: Comprehensive setup analysis using live telemetry data
  - Real-time tyre pressure monitoring with color-coded status indicators
  - Tyre temperature analysis with optimal range detection
  - Brake temperature monitoring and warnings
  - Setup suggestions with priority levels (high/medium/low)
  - Performance analysis section with lap times and metrics
  - Intelligent setup recommendations based on telemetry imbalances

- **Enhanced Fuel Calculator**: Auto-calculation from telemetry data
  - Toggle to enable automatic fuel calculation from live ACC data
  - Auto-population of fuel per lap from `fuelXLap` telemetry field
  - Automatic lap time updates from `lastLapTime` telemetry
  - Fallback fuel estimation using throttle and speed data
  - Visual indicators for auto-populated fields
  - Persistent auto-calculate settings in localStorage

- **Backend Telemetry Enhancements**:
  - Added `fuelXLap` field to telemetry payload for fuel consumption tracking
  - Enhanced ACC shared memory reading to include fuel consumption data
  - Updated mock data with realistic fuel consumption values for testing
  - Improved telemetry data structure for setup analysis

### 🔧 Technical Improvements
- Enhanced telemetry data processing and validation
- Improved UI/UX with better visual feedback for auto-calculated values
- Added comprehensive error handling for telemetry data
- Updated help documentation with new feature explanations

### 🐛 Bug Fixes
- Fixed telemetry data parsing and display issues
- Resolved localStorage persistence for new settings

### 📚 Documentation
- Updated help modal with setup analysis information
- Added comprehensive feature documentation
- Enhanced user guidance for new auto-calculate functionality

---

## [0.0.4] - 2025-06-24

### 🚀 Added
- Live telemetry data integration
- Real-time fuel, speed, RPM, and lap time monitoring
- Enhanced telemetry data processing

### 🔧 Technical Improvements
- Improved WebSocket connection handling
- Better error handling for telemetry data

---

## [0.0.3] - 2025-06-24

### 🚀 Added
- Dark mode support
- Enhanced UI/UX improvements
- Better responsive design

### 🔧 Technical Improvements
- Improved component structure
- Enhanced styling system

---

## [0.0.2] - 2025-06-24

### 🚀 Added
- Fuel calculator functionality
- Race strategy calculations
- Formation lap support

### 🔧 Technical Improvements
- Basic application structure
- Local storage for settings persistence

---

## [0.0.1] - 2025-06-24

### 🚀 Added
- Initial project setup
- Basic Electron application structure
- ACC telemetry bridge foundation 