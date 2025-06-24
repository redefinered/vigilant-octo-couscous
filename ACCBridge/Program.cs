using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseWebSockets();

// Switch between real and mock ACCData based on environment variable
IACCData acc;
if (Environment.GetEnvironmentVariable("USE_MOCK_ACC") == "1")
{
    acc = new MockACCData();
    Console.WriteLine("[INFO] Using MockACCData");
}
else
{
    acc = new ACCData(); // This should be the real implementation
    Console.WriteLine("[INFO] Using real ACCData");
}

app.Map("/telemetry", async context =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = 400;
        return;
    }

    using var socket = await context.WebSockets.AcceptWebSocketAsync();
    Console.WriteLine("🚦 Telemetry client connected");

    var timer = new PeriodicTimer(TimeSpan.FromMilliseconds(250));

    while (await timer.WaitForNextTickAsync())
    {
        try
        {
            var phys = acc.ReadPhysics();
            var stats = acc.ReadStatic();
            var graphi = acc.ReadGraphics();

            var payload = new
            {
                fuel = phys.fuel,
                shiftRpm = phys.ShiftRpm,
                rpm = phys.rpms,
                gear = phys.gear,
                speed = phys.speedKmh,
                throttle = phys.throttle,
                brake = phys.brake,
                steer = phys.steerAngle,
                tyrePressure = new
                {
                    fl = phys.tyrePressure[0],
                    fr = phys.tyrePressure[1],
                    rl = phys.tyrePressure[2],
                    rr = phys.tyrePressure[3]
                },
                tyreTemp = new
                {
                    fl = phys.tyreTemp[0],
                    fr = phys.tyreTemp[1],
                    rl = phys.tyreTemp[2],
                    rr = phys.tyreTemp[3]
                },
                rideHeight = new
                {
                    fl = phys.rideHeight[0],
                    fr = phys.rideHeight[1],
                    rl = phys.rideHeight[2],
                    rr = phys.rideHeight[3]
                },
                brakeTemp = new
                {
                    fl = phys.brakeTemp[0],
                    fr = phys.brakeTemp[1],
                    rl = phys.brakeTemp[2],
                    rr = phys.brakeTemp[3]
                },
                currentLapTime = graphi.currentTime,
                lastLapTime = graphi.lastTime,
                bestLapTime = graphi.bestTime,
                sessionType = graphi.session,
                track = stats.track,
                completedLaps = acc.ReadGraphics().completedLaps
            };
            Console.WriteLine($"Current: {graphi.currentTime}, Last: {graphi.lastTime}, Best: {graphi.bestTime}, Laps: {graphi.completedLaps}");

            var json = JsonSerializer.Serialize(payload);
            var buffer = Encoding.UTF8.GetBytes(json);

            await socket.SendAsync(buffer, WebSocketMessageType.Text, true, CancellationToken.None);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ Telemetry error: {ex.Message}");
        }
    }
});

app.Run("http://localhost:1337");
