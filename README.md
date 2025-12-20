# CC1101 Register Editor

A visual configuration tool for the Texas Instruments CC1101 RF transceiver, designed for creating Flipper Zero compatible presets.

**Live Demo:** [https://alkeypwn.github.io/cc1101-regedit/](https://alkeypwn.github.io/cc1101-regedit/)

![CC1101 Register Editor](https://img.shields.io/badge/Flipper_Zero-Compatible-orange)
![License](https://img.shields.io/badge/license-CC%20BY--NC%204.0-green)

## Features

### Visual Spectrum Display
- RF spectrum visualization
- Interactive bandwidth and deviation markers (drag to adjust)
- Modulation type indicator with color coding
- Displays carrier frequency, bandwidth, deviation, and data rate

### Register Editor
- Complete CC1101 register configuration (0x00 - 0x2E)
- Interactive bit toggling with visual feedback
- Field-level descriptions from the CC1101 datasheet
- Registers organized by functional groups

### Quick Configuration
- Frequency input (300-928 MHz)
- Modulation selection (2-FSK, GFSK, ASK/OOK, 4-FSK, MSK)
- Data rate configuration
- Bandwidth selection
- Deviation control
- TX power settings

### Export Formats
- **Flipper setting_user format** - For custom Flipper Zero presets
- **C array format** - For general firmware development
- **Raw hex** - Basic register dump

### Import Support
- Import existing Flipper Zero presets
- Parse raw hex register dumps

### Built-in Presets
- AM 270kHz (315MHz)
- AM 650kHz (433.92MHz)
- FM 2-FSK (433.92MHz)
- AM 270kHz (868MHz)
- AM 650kHz (915MHz)

## Getting Started

### Online
Simply visit [https://alkeypwn.github.io/cc1101-regedit/](https://alkeypwn.github.io/cc1101-regedit/)

### Local Development

```bash
# Clone the repository
git clone https://github.com/alkeypwn/cc1101-regedit.git
cd cc1101-regedit

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

1. **Select a preset** or start with default values
2. **Adjust parameters** using the Quick Config sidebar
3. **Fine-tune registers** by clicking on individual bits or editing hex values
4. **Drag markers** on the spectrum display to adjust bandwidth/deviation visually
5. **Export** your configuration in your preferred format
6. **Copy** the output and use it in your Flipper Zero

## CC1101 Reference

This tool is based on the [Texas Instruments CC1101 Datasheet (SWRS061I)](https://www.ti.com/lit/ds/symlink/cc1101.pdf).

### Register Groups
- GPIO & FIFO Configuration
- Sync Word Settings
- Packet Control
- Frequency Settings
- Modem Configuration
- State Machine Control
- AGC Settings
- Wake On Radio
- Front End Configuration
- Calibration Registers

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0)**.

### You are free to:
- **Share** — copy and redistribute the material
- **Adapt** — remix, transform, and build upon the material

### Under the following terms:
- **Attribution** — You must give appropriate credit to **ALKEYPWN**
- **NonCommercial** — You may not use this for commercial purposes

See [LICENSE](LICENSE) for full details.

[![CC BY-NC 4.0](https://licensebuttons.net/l/by-nc/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc/4.0/)

## Acknowledgments

- Texas Instruments for the CC1101 datasheet
- Flipper Zero community for preset format documentation
- [jamisonderek/flipper-zero-tutorials](https://github.com/jamisonderek/flipper-zero-tutorials) for SubGHz documentation
