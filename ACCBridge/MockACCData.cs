// Mock implementation for ACCData and related classes
public class MockACCData : IACCData
{
    public PhysicsData ReadPhysics()
    {
        return new PhysicsData
        {
            fuel = 50.0f,
            ShiftRpm = 8000,
            rpms = 6000,
            gear = 3,
            speedKmh = 120.0f,
            throttle = 0.8f,
            brake = 0.0f,
            steerAngle = 0.1f,
            tyrePressure = new float[] { 2.0f, 2.0f, 2.0f, 2.0f },
            tyreTemp = new float[] { 85.0f, 85.0f, 80.0f, 80.0f },
            rideHeight = new float[] { 0.05f, 0.05f, 0.05f, 0.05f },
            brakeTemp = new float[] { 200.0f, 200.0f, 180.0f, 180.0f }
        };
    }

    public StaticData ReadStatic()
    {
        return new StaticData
        {
            track = "Monza"
        };
    }

    public GraphicsData ReadGraphics()
    {
        return new GraphicsData
        {
            currentTime = 85000,
            lastTime = 90000,
            bestTime = 88000,
            session = "Race",
            fuelXLap = 2940 // 2.94L per lap in ml
        };
    }
}

public interface IACCData
{
    PhysicsData ReadPhysics();
    StaticData ReadStatic();
    GraphicsData ReadGraphics();
}

// Removed PhysicsData class to avoid duplicate definition
public class StaticData
{
    public string track { get; set; } = "";
}

// Removed GraphicsData class to avoid duplicate definition 