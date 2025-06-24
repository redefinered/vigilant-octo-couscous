using System;
using System.IO.MemoryMappedFiles;
using System.Runtime.InteropServices;

// Expanded struct for ACC physics shared memory (for speed)
[StructLayout(LayoutKind.Sequential, Pack = 4)]
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
    // Add more fields as needed
}

// Expanded struct for ACC graphics shared memory (up to completedLaps)
[StructLayout(LayoutKind.Sequential, Pack = 4, CharSet = CharSet.Ansi)]
public struct ACCGraphics
{
    public int packetId;
    public int status;
    public int session;
    public float currentTime;   // Current lap time
    public float lastTime;      // Last lap time
    public float bestTime;      // Best lap time
    // ... you can add more fields as needed, but do not add completedLaps or others for now
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
                ShiftRpm = 0, // Not in minimal struct, add if needed
                rpms = accPhys.rpms,
                gear = accPhys.gear,
                speedKmh = accPhys.speedKmh, // Now mapped correctly
                throttle = accPhys.gas,
                brake = accPhys.brake,
                steerAngle = accPhys.steerAngle,
                tyrePressure = accPhys.tyrePressure ?? new float[4],
                tyreTemp = new float[4],
                rideHeight = new float[4],
                brakeTemp = new float[4]
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
                currentTime = accGraphics.currentTime,
                lastTime = accGraphics.lastTime,
                bestTime = accGraphics.bestTime,
                session = accGraphics.session.ToString()
            };
        }
        catch
        {
            return new GraphicsData();
        }
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