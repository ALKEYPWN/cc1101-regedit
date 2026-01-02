# Building the Flipper App

## Prerequisites

Install UFBT (Micro Flipper Build Tool):
```bash
pip install ufbt
```

## Build Steps

1. **Navigate to the app directory:**
   ```bash
   cd flipper_app
   ```

2. **Update SDK** (first time only):
   ```bash
   ufbt update
   ```

3. **Build the app:**
   ```bash
   ufbt
   ```

4. **Launch on connected Flipper:**
   ```bash
   ufbt launch
   ```

   Or manually copy `dist/cc1101_bridge.fap` to `SD Card/apps/Sub-GHz/`

## Testing

1. Launch app on Flipper (should show "CC1101 Bridge" screen)
2. Connect USB to computer
3. Open web app and click "Connect to Flipper"
4. Enable auto-sync
5. Change a register value - should see command counter increment on Flipper screen
