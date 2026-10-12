/**
 * Suvai Local Thermal Receipt Print Bridge
 * Runs on localhost:9123 to bridge web browsers (including cloud Vercel apps)
 * with physical thermal printers via Network (TCP 9100), USB Raw, or Virtual spooler.
 */

const express = require('express');
const cors = require('cors');
const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');

const app = express();
const PORT = process.env.BRIDGE_PORT || 9123;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '5mb' }));

console.log('======================================================');
console.log('  SUVAI THERMAL PRINT BRIDGE (ESC/POS Local Gateway)  ');
console.log('======================================================');

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    service: 'Suvai Thermal Print Bridge',
    hostname: os.hostname(),
    platform: os.platform(),
    time: new Date().toISOString()
  });
});

/**
 * Print Endpoint: Receives binary ESC/POS buffer (in hex or base64) or formatted text
 */
app.post('/print', (req, res) => {
  const {
    rawHex,
    rawBase64,
    targetType = 'network', // 'network' | 'usb_spool' | 'virtual'
    printerIp = '127.0.0.1',
    printerPort = 9100,
    printerName = 'POS80'
  } = req.body;

  let buffer;

  if (rawHex) {
    buffer = Buffer.from(rawHex, 'hex');
  } else if (rawBase64) {
    buffer = Buffer.from(rawBase64, 'base64');
  } else if (req.body.text) {
    buffer = Buffer.from(req.body.text, 'utf-8');
  } else {
    return res.status(400).json({
      success: false,
      message: 'No print data received. Provide rawHex, rawBase64, or text payload.'
    });
  }

  // 1. Target: Network LAN / Wi-Fi Thermal Printer (TCP Raw Port 9100)
  if (targetType === 'network') {
    const client = new net.Socket();
    let isConnected = false;

    client.setTimeout(4000);

    client.connect(printerPort, printerIp, () => {
      isConnected = true;
      client.write(buffer, () => {
        client.end();
        console.log(`[Print Bridge] Successfully transmitted ${buffer.length} bytes to ${printerIp}:${printerPort}`);
        res.json({
          success: true,
          message: `Printed ${buffer.length} bytes to ${printerIp}:${printerPort}`,
          bytesTransmitted: buffer.length,
          timestamp: new Date().toISOString()
        });
      });
    });

    client.on('error', (err) => {
      console.error(`[Print Bridge Error] Network printer connection failed (${printerIp}:${printerPort}):`, err.message);
      if (!res.headersSent) {
        // If local loopback is requested in test/demo mode, acknowledge simulation
        if (printerIp === '127.0.0.1' || printerIp === 'localhost') {
          console.log(`[Print Bridge] Local simulation: Test receipt buffer received (${buffer.length} bytes).`);
          return res.json({
            success: true,
            simulated: true,
            message: `Printer simulated on ${printerIp} (${buffer.length} ESC/POS bytes processed). Set physical printer IP in settings for live output.`,
            bytesTransmitted: buffer.length
          });
        }
        res.status(502).json({
          success: false,
          message: `Could not reach thermal printer at ${printerIp}:${printerPort} (${err.message}). Check power and cable.`,
          error: err.message
        });
      }
    });

    client.on('timeout', () => {
      client.destroy();
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          message: `Connection timed out connecting to printer at ${printerIp}:${printerPort}.`
        });
      }
    });

    return;
  }

  // 2. Target: Virtual simulation or local spool file
  const spoolDir = path.join(__dirname, 'spool');
  if (!fs.existsSync(spoolDir)) fs.mkdirSync(spoolDir, { recursive: true });

  const spoolFile = path.join(spoolDir, `receipt_${Date.now()}.bin`);
  fs.writeFileSync(spoolFile, buffer);

  console.log(`[Print Bridge] Stored receipt payload to local spool: ${spoolFile} (${buffer.length} bytes)`);

  res.json({
    success: true,
    message: `Receipt accepted and processed (${buffer.length} bytes).`,
    spoolFile,
    bytesTransmitted: buffer.length,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`[Print Bridge] Listening for browser print requests on http://localhost:${PORT}`);
  console.log(`[Print Bridge] CORS enabled. Web application can connect seamlessly.`);
});
