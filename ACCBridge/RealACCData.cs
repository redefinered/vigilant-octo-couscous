using System;
using System.IO.MemoryMappedFiles;
using System.Runtime.InteropServices;

// Expanded struct for ACC physics shared memory (for speed)
[StructLayout(LayoutKind.Sequential, Pack = 4, CharSet = CharSet.Ansi)]
public struct ACCPhysics
{
    public int packetId;
    public float gas;
    public float brake;
    public float fuel;
    public int gear;
    public int rpms;
    public float steerAngle;
    public float speedKmh; // Correct type and order for speed
    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 4)]
    public float[] tyrePressure;
    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 4)]
    public float[] tyreTemp;
    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 4)]
    public float[] rideHeight;
    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 4)]
    public float[] brakeTemp;
    // Add more fields as needed
}

// Expanded struct for ACC graphics shared memory (correct offsets for lap times)
[StructLayout(LayoutKind.Sequential, Pack = 4, CharSet = CharSet.Unicode)]
public struct ACCGraphics
{
    public int packetId;
    public int status;
    public int session;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 15)]
    public string currentTime;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 15)]
    public string lastTime;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 15)]
    public string bestTime;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 15)]
    public string split;
    public int completedLaps;
    public int position;
    public int iCurrentTime;
    public int iLastTime;
    public int iBestTime;
    public float sessionTimeLeft;
    public float distanceTraveled;
    public int isInPit;
    public int currentSectorIndex;
    public int lastSectorTime;
    public int numberOfLaps;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 33)]
    public string tyreCompound;
    public float replayTimeMultiplier;
    public float normalizedCarPosition;
    public int activeCars;
    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 180)] // 60*3
    public float[] carCoordinates;
    [MarshalAs(UnmanagedType.ByValArray, SizeConst = 60)]
    public int[] carID;
    public int playerCarID;
    public float penaltyTime;
    public int flag;
    public int penalty;
    public int idealLineOn;
    public int isInPitLane;
    public float surfaceGrip;
    public int mandatoryPitDone;
    public float windSpeed;
    public float windDirection;
    public int isSetupMenuVisible;
    public int mainDisplayIndex;
    public int secondaryDisplayIndex;
    public int TC;
    public int TCCut;
    public int EngineMap;
    public int ABS;
    public int fuelXLap;
    public int rainLights;
    public int flashingLights;
    public int lightsStage;
    public float exhaustTemperature;
    public int wiperLV;
    public int DriverStintTotalTimeLeft;
    public int DriverStintTimeLeft;
    public int rainTyres;
}

// Minimal struct for ACC static shared memory
[StructLayout(LayoutKind.Sequential, Pack = 4)]
public struct ACCStatic
{
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 100)]
    public string track;
    // Add more fields as needed
}

public class GraphicsData
{
    public float currentTime { get; set; }
    public float lastTime { get; set; }
    public float bestTime { get; set; }
    public string session { get; set; } = "";
    public int completedLaps { get; set; }
}

public class PhysicsData
{
    public float fuel { get; set; }
    public int ShiftRpm { get; set; }
    public int rpms { get; set; }
    public int gear { get; set; }
    public float speedKmh { get; set; }
    public float throttle { get; set; }
    public float brake { get; set; }
    public float steerAngle { get; set; }
    public float[] tyrePressure { get; set; } = new float[4];
    public float[] tyreTemp { get; set; } = new float[4];
    public float[] rideHeight { get; set; } = new float[4];
    public float[] brakeTemp { get; set; } = new float[4];
}

public class ACCData : IACCData
{
    public PhysicsData ReadPhysics()
    {
        try
        {
            var accPhys = SharedMemoryReader.ReadStruct<ACCPhysics>("Local\\acpmf_physics");
            return new PhysicsData
            {
                fuel = accPhys.fuel,
                ShiftRpm = 0,
                rpms = accPhys.rpms,
                gear = accPhys.gear,
                speedKmh = accPhys.speedKmh,
                throttle = accPhys.gas,
                brake = accPhys.brake,
                steerAngle = accPhys.steerAngle,
                tyrePressure = accPhys.tyrePressure ?? new float[4],
                tyreTemp = accPhys.tyreTemp ?? new float[4],
                rideHeight = accPhys.rideHeight ?? new float[4],
                brakeTemp = accPhys.brakeTemp ?? new float[4]
            };
        }
        catch
        {
            return new PhysicsData();
        }
    }

    public StaticData ReadStatic()
    {
        try
        {
            var accStatic = SharedMemoryReader.ReadStruct<ACCStatic>("Local\\acpmf_static");
            return new StaticData
            {
                track = accStatic.track ?? ""
            };
        }
        catch
        {
            return new StaticData();
        }
    }

    public GraphicsData ReadGraphics()
    {
        try
        {
            var accGraphics = SharedMemoryReader.ReadStruct<ACCGraphics>("Local\\acpmf_graphics");
            return new GraphicsData
            {
                currentTime = ParseLapTime(accGraphics.currentTime),
                lastTime = ParseLapTime(accGraphics.lastTime),
                bestTime = ParseLapTime(accGraphics.bestTime),
                session = accGraphics.session.ToString(),
                completedLaps = accGraphics.completedLaps
            };
        }
        catch
        {
            return new GraphicsData();
        }
    }

    // Helper to parse "mm:ss:fff" or "ss.fff" to seconds as float
    private float ParseLapTime(string lapTimeStr)
    {
        if (string.IsNullOrWhiteSpace(lapTimeStr)) return 0f;
        lapTimeStr = lapTimeStr.Trim();
        var parts = lapTimeStr.Split(':');
        if (parts.Length == 3)
        {
            if (int.TryParse(parts[0], out int min) &&
                int.TryParse(parts[1], out int sec) &&
                int.TryParse(parts[2], out int ms))
            {
                return min * 60 + sec + ms / 1000f;
            }
        }
        // Try ss.fff
        if (float.TryParse(lapTimeStr, out float seconds))
            return seconds;
        return 0f;
    }
}

public static class SharedMemoryReader
{
    public static T ReadStruct<T>(string mapName) where T : struct
    {
        using var mmf = MemoryMappedFile.OpenExisting(mapName);
        using var accessor = mmf.CreateViewAccessor(0, Marshal.SizeOf(typeof(T)), MemoryMappedFileAccess.Read);
        var buffer = new byte[Marshal.SizeOf(typeof(T))];
        accessor.ReadArray(0, buffer, 0, buffer.Length);
        GCHandle handle = GCHandle.Alloc(buffer, GCHandleType.Pinned);
        try
        {
            return (T)Marshal.PtrToStructure(handle.AddrOfPinnedObject(), typeof(T));
        }
        finally
        {
            handle.Free();
        }
    }
} 