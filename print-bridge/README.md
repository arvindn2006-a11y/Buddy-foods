# Suvai Thermal Print Bridge (ESC/POS Local Gateway)

The **Suvai Thermal Print Bridge** is a lightweight, zero-dependency Node.js background microservice designed for physical thermal receipt printing in canteen counters.

Because modern browsers and cloud-deployed web applications (e.g., hosted on Vercel) are sandboxed and cannot directly talk to local USB cables or counter receipt printers, this local bridge runs on `http://localhost:9123` to act as a secure gateway.

---

## 1. Quick Start

```bash
cd print-bridge
npm install
npm run start
```

The bridge will begin listening on `http://localhost:9123`.

---

## 2. Printer Support & Interfaces

### A. Network LAN / Wi-Fi Thermal Printers (Recommended)
- **Port:** `9100` (Raw TCP Socket)
- **Supported models:** Epson TM-T82, TVS RP-3200, Rongta RP-326, Xprinter XP-N160II, Everycom, Posiflex.
- **Setup:**
  1. Assign a static IP address to your printer via your router (e.g., `192.168.1.150`).
  2. Open **Printer Settings** in the Suvai web application and set the target printer IP.

### B. USB Cable Thermal Printers
- **Driverless Option:** In Google Chrome, Microsoft Edge, or Opera, you can also select **Web Serial USB** directly in Suvai's **Printer Settings** to communicate with the USB printer without installing this bridge.
- **Spool Option:** The bridge receives raw ESC/POS byte buffers and can stream directly to local Windows raw printer spoolers (`//localhost/POS80`).

---

## 3. Endpoints

- `GET /health`: Health status and system metadata.
- `POST /print`:
  ```json
  {
    "rawHex": "1b401b6101...",
    "targetType": "network",
    "printerIp": "192.168.1.150",
    "printerPort": 9100
  }
  ```
  Returns `200 OK` with byte transmission confirmation upon successful receipt printing.
