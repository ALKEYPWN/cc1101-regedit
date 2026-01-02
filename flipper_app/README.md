# CC1101 Bridge - Flipper Zero App

USB bridge for configuring CC1101 registers from web application.

## Building

Using UFBT (Micro Flipper Build Tool):

```bash
cd flipper_app
ufbt
```

## Installing

```bash
ufbt launch
```

Or copy the generated `.fap` file to `SD Card/apps/Sub-GHz/`

## Usage

1. Install and launch the app on Flipper Zero
2. Connect Flipper to computer via USB
3. Open the web app at https://alkeypwn.github.io/cc1101-regedit/
4. Click "Connect to Flipper" in Export panel
5. Select Flipper device from browser dialog
6. Enable "Auto-sync" to push register changes in real-time

## Protocol

TBD.

### Supported Commands

- `write_register` - Write single CC1101 register
- `write_bulk` - Write multiple registers + PA table
- `read_register` - Read single register (verification)
- `ping` - Connection health check

## Architecture

```
cc1101_bridge_app.c    - Main app loop, GUI, command dispatcher
cc1101_bridge_uart.c   - USB VCP communication
cc1101_bridge_protocol.c - JSON parser
cc1101_bridge_cc1101.c - CC1101 hardware control
```

## Requirements

- Flipper Zero (OFW, Unleashed, or RogueMaster)
- USB connection
- Chrome/Edge browser (Web Serial API)
