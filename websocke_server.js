const SerialPort = require("serialport");
const WebSocket = require("ws");

// Replace with the correct COM port or device path (e.g., /dev/ttyUSB0)
const SERIAL_PORT = "COM2";
const BAUD_RATE = 57600; // Adjust based on the RFID reader's settings

// Create SerialPort instance
const serialPort = new SerialPort(SERIAL_PORT, { baudRate: BAUD_RATE });

// Handle serial port events
serialPort.on("open", () => {
  console.log(`Serial port ${SERIAL_PORT} opened`);
});

serialPort.on("data", (data) => {
  console.log(`Received from serial: ${data}`);
  // Send data to WebSocket clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data.toString());
    }
  });
});

serialPort.on("error", (err) => {
  console.error(`Serial port error: ${err.message}`);
});

// Set up WebSocket server
const wss = new WebSocket.Server({ port: 3000 });

wss.on("connection", (ws) => {
  console.log("WebSocket client connected");

  // Send acknowledgment to the client
  ws.send("Connected to WebSocket server");

  // Forward client messages to serial port (optional)
  ws.on("message", (message) => {
    console.log(`Received from client: ${message}`);
    serialPort.write(message);
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});
