import React, { useEffect, useState } from 'react';

declare global {
  interface Window {
    acc?: {
      getTelemetry: () => Promise<any>;
    };
  }
}

const App: React.FC = () => {
  const [fuelPerLap, setFuelPerLap] = useState<string>('');
  const [lapTime, setLapTime] = useState<string>('');
  const [raceMinutes, setRaceMinutes] = useState<string>('');
  const [includeFormation, setIncludeFormation] = useState<boolean>(false);
  const [pitstops, setPitstops] = useState<number>(0);
  const [result, setResult] = useState<{
    laps: number;
    totalFuel: string;
    fuelPerStint: string;
    stintCount: number;
    firstStintFuel: string;
    formationFuel: string;
  } | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'calculator' | 'telemetry'>('calculator');
  const [lapData, setLapData] = useState([]);
  const [lastLapNumber, setLastLapNumber] = useState(null);
  const [sessionSummary, setSessionSummary] = useState(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('acc-fuel-calc');
    if (stored) {
      const parsed = JSON.parse(stored);
      setFuelPerLap(parsed.fuelPerLap || '');
      setLapTime(parsed.lapTime || '');
      setRaceMinutes(parsed.raceMinutes || '');
      setIncludeFormation(parsed.includeFormation || false);
      setPitstops(parsed.pitstops || 0);
      setDarkMode(parsed.darkMode || false);
    }
  }, []);

  // Save inputs to localStorage
  useEffect(() => {
    const payload = {
      fuelPerLap,
      lapTime,
      raceMinutes,
      includeFormation,
      pitstops,
      darkMode,
    };
    localStorage.setItem('acc-fuel-calc', JSON.stringify(payload));
  }, [fuelPerLap, lapTime, raceMinutes, includeFormation, pitstops, darkMode]);

  // Fetch telemetry every second
  useEffect(() => {
    if (!window.acc?.getTelemetry) return;
    const interval = setInterval(async () => {
      try {
        const data = await window.acc.getTelemetry();
        setTelemetry(data);
      } catch {
        setTelemetry({ error: 'ACC not running or telemetry unavailable' });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Lap-by-lap data collection
  useEffect(() => {
    if (!telemetry || telemetry.error || telemetry.completedLaps === undefined) return;
    const currentLapNumber = telemetry.completedLaps;
    if (lastLapNumber !== null && currentLapNumber > lastLapNumber) {
      // Lap completed!
      setLapData(prev => [
        ...prev,
        {
          lapNumber: lastLapNumber,
          lapTime: telemetry.lastLapTime,
          fuelEnd: telemetry.fuel,
          tyrePressure: { ...telemetry.tyrePressure },
        }
      ]);
    }
    setLastLapNumber(currentLapNumber);
  }, [telemetry]);

  // Session summary extraction
  const extractSessionSummary = () => {
    if (lapData.length === 0) return null;
    // Fuel analysis
    let totalFuelUsed = 0;
    for (let i = 1; i < lapData.length; i++) {
      totalFuelUsed += (lapData[i - 1].fuelEnd - lapData[i].fuelEnd);
    }
    const avgFuelPerLap = lapData.length > 1 ? totalFuelUsed / (lapData.length - 1) : 0;
    // Tire pressure analysis
    const avgPressures = { fl: 0, fr: 0, rl: 0, rr: 0 };
    lapData.forEach(lap => {
      avgPressures.fl += lap.tyrePressure.fl;
      avgPressures.fr += lap.tyrePressure.fr;
      avgPressures.rl += lap.tyrePressure.rl;
      avgPressures.rr += lap.tyrePressure.rr;
    });
    const tireKeys = ['fl', 'fr', 'rl', 'rr'] as const;
    tireKeys.forEach(tire => {
      avgPressures[tire] /= lapData.length;
    });
    return {
      laps: lapData.length,
      avgFuelPerLap,
      avgPressures
    };
  };

  // Button to extract and show session summary
  const handleShowSummary = () => {
    setSessionSummary(extractSessionSummary());
  };

  const parseLapTime = (str: string): number => {
    const parts = str.split(':');
    return parts.length === 2
      ? parseInt(parts[0]) * 60 + parseFloat(parts[1])
      : parseFloat(str);
  };

  const calculate = () => {
    const lapSec = parseLapTime(lapTime);
    const totalSecs = parseFloat(raceMinutes) * 60;
    const laps = Math.ceil(totalSecs / lapSec);
    const stintCount = pitstops + 1;
    const fuel = parseFloat(fuelPerLap);
    const fuelPerStint = (laps / stintCount) * fuel;
    const buffer = fuel;
    const formation = includeFormation ? fuel : 0;
    const totalFuel = (laps * fuel) + buffer + formation;
    const firstStintFuel = fuelPerStint + formation;

    setResult({
      laps,
      totalFuel: totalFuel.toFixed(2),
      fuelPerStint: fuelPerStint.toFixed(2),
      stintCount,
      firstStintFuel: firstStintFuel.toFixed(2),
      formationFuel: formation.toFixed(2),
    });
  };

  // Helper to format lap times as mm:ss.sss
  const formatLapTime = (seconds: number | undefined) => {
    if (!seconds || seconds <= 0) return "0:00.000";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms = Math.floor((seconds - min * 60 - sec) * 1000);
    return `${min}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-acc-blue to-blue-600 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
              <span className="text-acc-blue font-bold text-lg">🏁</span>
            </div>
            <h1 className="text-xl font-bold font-racing">ACC Companion</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowHelp(true)}
              className="text-sm underline hover:no-underline"
            >
              Help
            </button>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={() => setDarkMode(!darkMode)}
                className="rounded"
              />
              Dark Mode
            </label>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'calculator'
                ? 'text-acc-blue border-b-2 border-acc-blue'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Fuel Calculator
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'telemetry'
                ? 'text-acc-blue border-b-2 border-acc-blue'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Live Telemetry
          </button>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {activeTab === 'calculator' && (
          <div className="space-y-6">
            {/* Fuel Calculator */}
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4 text-acc-blue">Race Fuel Calculator</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Fuel per Lap (L)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={fuelPerLap}
                    onChange={(e) => setFuelPerLap(e.target.value)}
                    className="input-field"
                    placeholder="e.g., 2.94"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Average Lap Time (mm:ss)</label>
                  <input
                    type="text"
                    value={lapTime}
                    onChange={(e) => setLapTime(e.target.value)}
                    className="input-field"
                    placeholder="e.g., 2:06.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Race Duration (minutes)</label>
                  <input
                    type="number"
                    value={raceMinutes}
                    onChange={(e) => setRaceMinutes(e.target.value)}
                    className="input-field"
                    placeholder="e.g., 90"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Mandatory Pitstops</label>
                  <input
                    type="number"
                    value={pitstops}
                    onChange={(e) => setPitstops(parseInt(e.target.value) || 0)}
                    className="input-field"
                    placeholder="e.g., 1"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeFormation}
                    onChange={(e) => setIncludeFormation(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Include formation lap</span>
                </label>
              </div>

              <button
                onClick={calculate}
                className="btn-primary mt-4 w-full"
              >
                Calculate Fuel Requirements
              </button>
            </div>

            {/* Results */}
            {result && (
              <div className="card p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
                <h3 className="text-lg font-bold mb-4 text-green-700 dark:text-green-400">Race Strategy</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="telemetry-value text-2xl text-acc-blue">{result.laps}</div>
                    <div className="telemetry-label">Estimated Laps</div>
                  </div>
                  <div className="text-center">
                    <div className="telemetry-value text-2xl text-acc-red">{result.totalFuel}L</div>
                    <div className="telemetry-label">Total Fuel Needed</div>
                  </div>
                  <div className="text-center">
                    <div className="telemetry-value text-2xl text-acc-green">{result.fuelPerStint}L</div>
                    <div className="telemetry-label">Fuel per Stint ({result.stintCount})</div>
                  </div>
                </div>
                <div className="text-xs text-yellow-600 text-center mt-4">🔋 First Stint Setup: {result.firstStintFuel}L {includeFormation && `(+${result.formationFuel}L formation)`}</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'telemetry' && (
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4 text-acc-blue">Live Telemetry</h2>
            {telemetry?.error ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-600 dark:text-red-400">{telemetry.error}</p>
                <p className="text-sm text-red-500 dark:text-red-400 mt-2">
                  Make sure ACC is running and telemetry is enabled in the game settings.
                </p>
              </div>
            ) : telemetry ? (
              <div className="space-y-4">
                {/* Basic telemetry */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="telemetry-value text-acc-red">{telemetry.fuel?.toFixed(1)} L</div>
                    <div className="telemetry-label">Fuel Left</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="telemetry-value text-acc-blue">{formatLapTime(telemetry.currentLapTime)}</div>
                    <div className="telemetry-label">Current Lap</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="telemetry-value text-acc-blue">{formatLapTime(telemetry.lastLapTime)}</div>
                    <div className="telemetry-label">Last Lap</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="telemetry-value text-acc-blue">{formatLapTime(telemetry.bestLapTime)}</div>
                    <div className="telemetry-label">Best Lap</div>
                  </div>
                </div>

                {/* Additional telemetry from bridge */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="telemetry-value text-acc-yellow">{telemetry.speed?.toFixed(1)} km/h</div>
                    <div className="telemetry-label">Speed</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="telemetry-value text-purple-600">{telemetry.rpm?.toLocaleString()}</div>
                    <div className="telemetry-label">RPM</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="telemetry-value text-orange-600">{telemetry.gear}</div>
                    <div className="telemetry-label">Gear</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="telemetry-value text-green-600">{(telemetry.throttle * 100)?.toFixed(0)}%</div>
                    <div className="telemetry-label">Throttle</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="telemetry-value text-red-600">{(telemetry.brake * 100)?.toFixed(0)}%</div>
                    <div className="telemetry-label">Brake</div>
                  </div>
                </div>

                {/* Session info */}
                {telemetry.track && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="telemetry-label text-blue-600 dark:text-blue-400">Track</div>
                      <div className="telemetry-value text-sm">{telemetry.track || 'Unknown'}</div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div className="telemetry-label text-purple-600 dark:text-purple-400">Session</div>
                      <div className="telemetry-value text-sm">{telemetry.sessionType || 'Unknown'}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-acc-blue mx-auto mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400">Connecting to ACC...</p>
              </div>
            )}
            <button onClick={handleShowSummary} className="btn-primary mt-4">Show Session Summary</button>
            {sessionSummary && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="text-lg font-bold mb-2 text-acc-blue">Session Summary</h3>
                <div>Laps completed: {sessionSummary.laps}</div>
                <div>Average fuel per lap: {sessionSummary.avgFuelPerLap.toFixed(2)} L</div>
                <div className="mt-2 font-semibold">Average Tire Pressures (psi):</div>
                <ul className="ml-4">
                  <li>FL: {sessionSummary.avgPressures.fl.toFixed(2)}</li>
                  <li>FR: {sessionSummary.avgPressures.fr.toFixed(2)}</li>
                  <li>RL: {sessionSummary.avgPressures.rl.toFixed(2)}</li>
                  <li>RR: {sessionSummary.avgPressures.rr.toFixed(2)}</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card p-6 w-11/12 max-w-md mx-4">
            <h2 className="text-lg font-bold mb-4 text-acc-blue">How to Use ACC Companion</h2>
            <div className="space-y-3 text-sm">
              <div>
                <h3 className="font-semibold mb-2">Fuel Calculator:</h3>
                <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400">
                  <li>Enter your average fuel consumption per lap (e.g., 2.94)</li>
                  <li>Enter your average lap time in mm:ss format (e.g., 2:06.5)</li>
                  <li>Enter race duration in minutes (e.g., 90)</li>
                  <li>Specify the number of mandatory pitstops</li>
                  <li>Check the formation lap option if applicable</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Live Telemetry:</h3>
                <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400">
                  <li>Make sure ACC is running</li>
                  <li>Start ACCBridge server (dotnet run in ACCBridge folder)</li>
                  <li>Enable telemetry in ACC settings</li>
                  <li>View real-time data from your current session</li>
                </ul>
              </div>
            </div>
            <button 
              onClick={() => setShowHelp(false)} 
              className="btn-primary mt-4 w-full"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
