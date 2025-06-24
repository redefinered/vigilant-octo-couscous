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
  const [activeTab, setActiveTab] = useState<'calculator' | 'telemetry' | 'setups'>('calculator');
  const [autoCalculate, setAutoCalculate] = useState<boolean>(false);

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
      setAutoCalculate(parsed.autoCalculate || false);
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
      autoCalculate,
    };
    localStorage.setItem('acc-fuel-calc', JSON.stringify(payload));
  }, [fuelPerLap, lapTime, raceMinutes, includeFormation, pitstops, darkMode, autoCalculate]);

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

  // Auto-calculate fuel requirements based on telemetry
  useEffect(() => {
    if (!autoCalculate || !telemetry || telemetry.error) return;

    // Update lap times from telemetry
    if (telemetry.lastLapTime && telemetry.lastLapTime > 0) {
      setLapTime(formatLapTime(telemetry.lastLapTime));
    }

    // Calculate fuel per lap from telemetry if available
    if (telemetry.fuelXLap && telemetry.fuelXLap > 0) {
      setFuelPerLap((telemetry.fuelXLap / 1000).toFixed(2)); // Convert from ml to L
    } else if (telemetry.throttle && telemetry.speed) {
      // Estimate fuel consumption based on throttle usage and speed
      const estimatedFuelPerLap = estimateFuelConsumption(telemetry);
      if (estimatedFuelPerLap > 0) {
        setFuelPerLap(estimatedFuelPerLap.toFixed(2));
      }
    }

    // Auto-calculate if we have both lap time and fuel per lap
    if (lapTime && fuelPerLap && raceMinutes) {
      calculate();
    }
  }, [telemetry, autoCalculate, lapTime, fuelPerLap, raceMinutes]);

  // Helper function to estimate fuel consumption from telemetry
  const estimateFuelConsumption = (telemetry: any): number => {
    if (!telemetry.throttle || !telemetry.speed || !telemetry.lastLapTime) return 0;
    
    // Base fuel consumption (varies by car, this is an approximation)
    const baseFuelPerLap = 2.5; // L/lap for GT3 cars
    
    // Adjust based on throttle usage (more aggressive = more fuel)
    const throttleFactor = 0.8 + (telemetry.throttle * 0.4); // 0.8 to 1.2 range
    
    // Adjust based on average speed (higher speed = more fuel)
    const speedFactor = 0.9 + (telemetry.speed / 300); // Normalized to 300 km/h
    
    return baseFuelPerLap * throttleFactor * speedFactor;
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

  // Helper functions for setup analysis
  const getTyrePressureStatus = (pressure: number) => {
    if (pressure < 1.8) return { class: 'text-red-600 dark:text-red-400', status: 'low' };
    if (pressure > 2.2) return { class: 'text-red-600 dark:text-red-400', status: 'high' };
    if (pressure < 1.9 || pressure > 2.1) return { class: 'text-yellow-600 dark:text-yellow-400', status: 'suboptimal' };
    return { class: 'text-green-600 dark:text-green-400', status: 'optimal' };
  };

  const getTyreTempStatus = (temp: number) => {
    if (temp < 70) return { class: 'text-blue-600 dark:text-blue-400', status: 'cold' };
    if (temp > 95) return { class: 'text-red-600 dark:text-red-400', status: 'hot' };
    if (temp < 75 || temp > 90) return { class: 'text-yellow-600 dark:text-yellow-400', status: 'suboptimal' };
    return { class: 'text-green-600 dark:text-green-400', status: 'optimal' };
  };

  const getSetupSuggestions = (telemetry: any) => {
    const suggestions: Array<{
      title: string;
      description: string;
      recommendation?: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    // Tyre pressure analysis
    if (telemetry.tyrePressure) {
      const fl = telemetry.tyrePressure.fl;
      const fr = telemetry.tyrePressure.fr;
      const rl = telemetry.tyrePressure.rl;
      const rr = telemetry.tyrePressure.rr;

      // Check for pressure imbalances
      const frontDiff = Math.abs(fl - fr);
      const rearDiff = Math.abs(rl - rr);

      if (frontDiff > 0.1) {
        suggestions.push({
          title: 'Front Tyre Pressure Imbalance',
          description: `Front left and right tyre pressures differ by ${frontDiff.toFixed(1)} bar`,
          recommendation: 'Adjust front tyre pressures to be within 0.1 bar of each other for better handling',
          priority: 'high'
        });
      }

      if (rearDiff > 0.1) {
        suggestions.push({
          title: 'Rear Tyre Pressure Imbalance',
          description: `Rear left and right tyre pressures differ by ${rearDiff.toFixed(1)} bar`,
          recommendation: 'Adjust rear tyre pressures to be within 0.1 bar of each other for better stability',
          priority: 'high'
        });
      }

      // Check for overall pressure levels
      const avgPressure = (fl + fr + rl + rr) / 4;
      if (avgPressure < 1.8) {
        suggestions.push({
          title: 'Low Tyre Pressures',
          description: `Average tyre pressure is ${avgPressure.toFixed(1)} bar`,
          recommendation: 'Increase tyre pressures to 1.9-2.1 bar for better grip and wear',
          priority: 'medium'
        });
      } else if (avgPressure > 2.2) {
        suggestions.push({
          title: 'High Tyre Pressures',
          description: `Average tyre pressure is ${avgPressure.toFixed(1)} bar`,
          recommendation: 'Decrease tyre pressures to 1.9-2.1 bar for better contact patch',
          priority: 'medium'
        });
      }
    }

    // Tyre temperature analysis
    if (telemetry.tyreTemp) {
      const fl = telemetry.tyreTemp.fl;
      const fr = telemetry.tyreTemp.fr;
      const rl = telemetry.tyreTemp.rl;
      const rr = telemetry.tyreTemp.rr;

      const avgTemp = (fl + fr + rl + rr) / 4;
      if (avgTemp < 75) {
        suggestions.push({
          title: 'Cold Tyres',
          description: `Average tyre temperature is ${avgTemp.toFixed(0)}°C`,
          recommendation: 'Take a few warm-up laps to get tyres into optimal temperature range (75-90°C)',
          priority: 'medium'
        });
      } else if (avgTemp > 95) {
        suggestions.push({
          title: 'Overheated Tyres',
          description: `Average tyre temperature is ${avgTemp.toFixed(0)}°C`,
          recommendation: 'Reduce aggressive driving or consider tyre pressure adjustments',
          priority: 'high'
        });
      }

      // Check for temperature imbalances
      const frontTempDiff = Math.abs(fl - fr);
      if (frontTempDiff > 10) {
        suggestions.push({
          title: 'Front Tyre Temperature Imbalance',
          description: `Front tyre temperature difference: ${frontTempDiff.toFixed(0)}°C`,
          recommendation: 'Check suspension setup or driving style for front tyre temperature balance',
          priority: 'medium'
        });
      }
    }

    // Brake temperature analysis
    if (telemetry.brakeTemp) {
      const fl = telemetry.brakeTemp.fl;
      const fr = telemetry.brakeTemp.fr;
      const rl = telemetry.brakeTemp.rl;
      const rr = telemetry.brakeTemp.rr;

      const avgBrakeTemp = (fl + fr + rl + rr) / 4;
      if (avgBrakeTemp > 300) {
        suggestions.push({
          title: 'High Brake Temperatures',
          description: `Average brake temperature is ${avgBrakeTemp.toFixed(0)}°C`,
          recommendation: 'Consider brake bias adjustment or less aggressive braking',
          priority: 'medium'
        });
      }
    }

    // Performance analysis
    if (telemetry.bestLapTime && telemetry.lastLapTime) {
      const lapTimeVariation = Math.abs(telemetry.bestLapTime - telemetry.lastLapTime);
      if (lapTimeVariation > 2) {
        suggestions.push({
          title: 'Lap Time Inconsistency',
          description: `Lap time variation: ${lapTimeVariation.toFixed(1)}s`,
          recommendation: 'Focus on consistent driving lines and braking points',
          priority: 'low'
        });
      }
    }

    // If no issues found
    if (suggestions.length === 0) {
      suggestions.push({
        title: 'Setup Looks Good!',
        description: 'Your current setup appears to be well-balanced based on the telemetry data',
        recommendation: 'Continue monitoring and fine-tune based on track conditions',
        priority: 'low'
      });
    }

    return suggestions;
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
          <button
            onClick={() => setActiveTab('setups')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'setups'
                ? 'text-acc-blue border-b-2 border-acc-blue'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Setups
          </button>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {activeTab === 'calculator' && (
          <div className="space-y-6">
            {/* Fuel Calculator */}
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4 text-acc-blue">Race Fuel Calculator</h2>
              
              {/* Auto-calculate toggle */}
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCalculate}
                    onChange={(e) => setAutoCalculate(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Auto-calculate from telemetry</span>
                </label>
                {autoCalculate && telemetry && !telemetry.error && (
                  <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                    📊 Using live data: {telemetry.fuelXLap ? `${(telemetry.fuelXLap / 1000).toFixed(2)}L/lap` : 'N/A'} | 
                    Last lap: {telemetry.lastLapTime ? formatLapTime(telemetry.lastLapTime) : 'N/A'}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Fuel per Lap (L)
                    {autoCalculate && telemetry?.fuelXLap && (
                      <span className="ml-2 text-xs text-green-600 dark:text-green-400">🔄 Auto</span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={fuelPerLap}
                    onChange={(e) => setFuelPerLap(e.target.value)}
                    className={`input-field ${autoCalculate && telemetry?.fuelXLap ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
                    placeholder="e.g., 2.94"
                    disabled={autoCalculate && telemetry?.fuelXLap}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Average Lap Time (mm:ss)
                    {autoCalculate && telemetry?.lastLapTime && (
                      <span className="ml-2 text-xs text-green-600 dark:text-green-400">🔄 Auto</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={lapTime}
                    onChange={(e) => setLapTime(e.target.value)}
                    className={`input-field ${autoCalculate && telemetry?.lastLapTime ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
                    placeholder="e.g., 2:06.5"
                    disabled={autoCalculate && telemetry?.lastLapTime}
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
                className={`btn-primary mt-4 w-full ${autoCalculate ? 'bg-green-600 hover:bg-green-700' : ''}`}
                disabled={autoCalculate}
              >
                {autoCalculate ? '🔄 Auto-calculating...' : 'Calculate Fuel Requirements'}
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
          </div>
        )}

        {activeTab === 'setups' && (
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4 text-acc-blue">Setup Analysis</h2>
              {telemetry?.error ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-600 dark:text-red-400">{telemetry.error}</p>
                  <p className="text-sm text-red-500 dark:text-red-400 mt-2">
                    Connect to ACC to get setup suggestions based on your telemetry data.
                  </p>
                </div>
              ) : telemetry ? (
                <div className="space-y-6">
                  {/* Current Setup Overview */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Current Setup Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-sm text-blue-700 dark:text-blue-300 mb-2">Tyre Pressures</h4>
                        <div className="space-y-1">
                          {telemetry.tyrePressure && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span>Front Left:</span>
                                <span className={getTyrePressureStatus(telemetry.tyrePressure.fl).class}>
                                  {telemetry.tyrePressure.fl.toFixed(1)} bar
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Front Right:</span>
                                <span className={getTyrePressureStatus(telemetry.tyrePressure.fr).class}>
                                  {telemetry.tyrePressure.fr.toFixed(1)} bar
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Rear Left:</span>
                                <span className={getTyrePressureStatus(telemetry.tyrePressure.rl).class}>
                                  {telemetry.tyrePressure.rl.toFixed(1)} bar
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Rear Right:</span>
                                <span className={getTyrePressureStatus(telemetry.tyrePressure.rr).class}>
                                  {telemetry.tyrePressure.rr.toFixed(1)} bar
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-blue-700 dark:text-blue-300 mb-2">Tyre Temperatures</h4>
                        <div className="space-y-1">
                          {telemetry.tyreTemp && (
                            <>
                              <div className="flex justify-between text-sm">
                                <span>Front Left:</span>
                                <span className={getTyreTempStatus(telemetry.tyreTemp.fl).class}>
                                  {telemetry.tyreTemp.fl.toFixed(0)}°C
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Front Right:</span>
                                <span className={getTyreTempStatus(telemetry.tyreTemp.fr).class}>
                                  {telemetry.tyreTemp.fr.toFixed(0)}°C
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Rear Left:</span>
                                <span className={getTyreTempStatus(telemetry.tyreTemp.rl).class}>
                                  {telemetry.tyreTemp.rl.toFixed(0)}°C
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Rear Right:</span>
                                <span className={getTyreTempStatus(telemetry.tyreTemp.rr).class}>
                                  {telemetry.tyreTemp.rr.toFixed(0)}°C
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Setup Suggestions */}
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3">Setup Suggestions</h3>
                    <div className="space-y-3">
                      {getSetupSuggestions(telemetry).map((suggestion, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${suggestion.priority === 'high' ? 'bg-red-500' : suggestion.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{suggestion.title}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{suggestion.description}</p>
                            {suggestion.recommendation && (
                              <p className="text-sm font-medium text-green-700 dark:text-green-400 mt-1">
                                💡 {suggestion.recommendation}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-3">Performance Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {telemetry.bestLapTime ? formatLapTime(telemetry.bestLapTime) : 'N/A'}
                        </div>
                        <div className="text-sm text-purple-700 dark:text-purple-300">Best Lap Time</div>
                      </div>
                      <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {telemetry.speed ? telemetry.speed.toFixed(1) : 'N/A'} km/h
                        </div>
                        <div className="text-sm text-purple-700 dark:text-purple-300">Current Speed</div>
                      </div>
                      <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {telemetry.rpm ? (telemetry.rpm / 1000).toFixed(1) : 'N/A'}k
                        </div>
                        <div className="text-sm text-purple-700 dark:text-purple-300">RPM</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-acc-blue mx-auto mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">Connecting to ACC for setup analysis...</p>
                </div>
              )}
            </div>
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
                  <li>Enable "Auto-calculate from telemetry" to use live ACC data</li>
                  <li>Fuel per lap and lap times will be automatically populated</li>
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
              <div>
                <h3 className="font-semibold mb-2">Setup Analysis:</h3>
                <ul className="list-disc pl-5 space-y-1 text-gray-600 dark:text-gray-400">
                  <li>Analyzes tyre pressures, temperatures, and brake temps</li>
                  <li>Provides setup suggestions based on telemetry data</li>
                  <li>Identifies imbalances and performance issues</li>
                  <li>Recommends adjustments for optimal performance</li>
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
