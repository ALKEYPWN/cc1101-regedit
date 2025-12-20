/**
 * CC1101 Register Editor - Main Application
 * Generates Flipper Zero compatible presets
 */

import { CC1101_REGISTERS, REGISTER_GROUPS, MODULATION_FORMATS, PA_TABLES, PRESETS, XOSC_FREQ } from './registers.js';

// Application State
const state = {
    registers: {},
    paTable: [0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    currentGroup: 'GPIO & FIFO',
    viewMode: 'simple'
};

// Initialize registers with defaults
function initializeRegisters() {
    for (const [addr, reg] of Object.entries(CC1101_REGISTERS)) {
        state.registers[addr] = reg.default;
    }
}

// ============================================
// Frequency Calculations
// ============================================

/**
 * Calculate FREQ registers from MHz
 * Formula: FREQ = (f_carrier × 2^16) / f_XOSC
 */
function frequencyToRegisters(freqMHz) {
    const freq = Math.round((freqMHz * 1000000 * 65536) / XOSC_FREQ);
    return {
        FREQ2: (freq >> 16) & 0x3F,  // bits 21:16 (only 6 bits)
        FREQ1: (freq >> 8) & 0xFF,    // bits 15:8
        FREQ0: freq & 0xFF            // bits 7:0
    };
}

/**
 * Calculate MHz from FREQ registers
 */
function registersToFrequency(freq2, freq1, freq0) {
    const freq = ((freq2 & 0x3F) << 16) | (freq1 << 8) | freq0;
    return (freq * XOSC_FREQ) / (65536 * 1000000);
}

// ============================================
// Data Rate Calculations
// ============================================

/**
 * Calculate data rate registers from kbps
 * Formula: R_DATA = ((256 + DRATE_M) × 2^DRATE_E / 2^28) × f_XOSC
 */
function dataRateToRegisters(dataRateKbps) {
    const dataRate = dataRateKbps * 1000;
    
    // Find best DRATE_E and DRATE_M
    let bestE = 0, bestM = 0;
    let bestError = Infinity;
    
    for (let e = 0; e < 16; e++) {
        const m = Math.round(((dataRate * Math.pow(2, 28)) / (XOSC_FREQ * Math.pow(2, e))) - 256);
        if (m >= 0 && m < 256) {
            const actualRate = ((256 + m) * Math.pow(2, e) / Math.pow(2, 28)) * XOSC_FREQ;
            const error = Math.abs(actualRate - dataRate);
            if (error < bestError) {
                bestError = error;
                bestE = e;
                bestM = m;
            }
        }
    }
    
    return { DRATE_E: bestE, DRATE_M: bestM };
}

/**
 * Calculate kbps from MDMCFG registers
 */
function registersToDataRate(mdmcfg4, mdmcfg3) {
    const drateE = mdmcfg4 & 0x0F;
    const drateM = mdmcfg3;
    const dataRate = ((256 + drateM) * Math.pow(2, drateE) / Math.pow(2, 28)) * XOSC_FREQ;
    return dataRate / 1000; // Return kbps
}

// ============================================
// Bandwidth Calculation
// ============================================

/**
 * Get bandwidth settings from kHz
 * BW = f_XOSC / (8 × (4 + CHANBW_M) × 2^CHANBW_E)
 */
function bandwidthToRegisters(bwKHz) {
    const bandwidths = [
        { bw: 812, e: 0, m: 0 }, { bw: 650, e: 0, m: 1 }, { bw: 541, e: 0, m: 2 }, { bw: 464, e: 0, m: 3 },
        { bw: 406, e: 1, m: 0 }, { bw: 325, e: 1, m: 1 }, { bw: 270, e: 1, m: 2 }, { bw: 232, e: 1, m: 3 },
        { bw: 203, e: 2, m: 0 }, { bw: 162, e: 2, m: 1 }, { bw: 135, e: 2, m: 2 }, { bw: 116, e: 2, m: 3 },
        { bw: 102, e: 3, m: 0 }, { bw: 81, e: 3, m: 1 }, { bw: 68, e: 3, m: 2 }, { bw: 58, e: 3, m: 3 }
    ];
    
    const match = bandwidths.find(b => b.bw === bwKHz) || bandwidths[6]; // Default to 270kHz
    return { CHANBW_E: match.e, CHANBW_M: match.m };
}

// ============================================
// Deviation Calculation
// ============================================

/**
 * Calculate deviation register from kHz
 * Deviation = f_XOSC / 2^17 × (8 + DEVIATION_M) × 2^DEVIATION_E
 */
function deviationToRegister(devKHz) {
    const deviation = devKHz * 1000;
    
    let bestE = 0, bestM = 0;
    let bestError = Infinity;
    
    for (let e = 0; e < 8; e++) {
        for (let m = 0; m < 8; m++) {
            const actualDev = (XOSC_FREQ / Math.pow(2, 17)) * (8 + m) * Math.pow(2, e);
            const error = Math.abs(actualDev - deviation);
            if (error < bestError) {
                bestError = error;
                bestE = e;
                bestM = m;
            }
        }
    }
    
    return (bestE << 4) | bestM;
}

/**
 * Calculate kHz from DEVIATN register
 */
function registerToDeviation(deviatn) {
    const devE = (deviatn >> 4) & 0x07;
    const devM = deviatn & 0x07;
    const deviation = (XOSC_FREQ / Math.pow(2, 17)) * (8 + devM) * Math.pow(2, devE);
    return deviation / 1000;
}

// ============================================
// PA Table Selection
// ============================================

function getPaTable(freqMHz, powerDbm) {
    let band = '433MHz';
    if (freqMHz < 350) band = '315MHz';
    else if (freqMHz < 500) band = '433MHz';
    else if (freqMHz < 900) band = '868MHz';
    else band = '915MHz';
    
    const powerStr = powerDbm >= 0 ? `+${powerDbm}dBm` : `${powerDbm}dBm`;
    const table = PA_TABLES[band];
    
    // Find closest power level
    const powers = Object.keys(table).map(p => parseInt(p));
    const closest = powers.reduce((prev, curr) => 
        Math.abs(curr - powerDbm) < Math.abs(prev - powerDbm) ? curr : prev
    );
    const closestStr = closest >= 0 ? `+${closest}dBm` : `${closest}dBm`;
    
    return table[closestStr] || table['+10dBm'];
}

// ============================================
// Export Functions
// ============================================

/**
 * Generate Flipper Zero Custom_preset_data format
 * Format: XX YY XX YY ... 00 00 ZZ ZZ ZZ ZZ ZZ ZZ ZZ ZZ
 */
function generateFlipperPresetData() {
    const parts = [];
    
    // Add register address-value pairs
    for (let addr = 0; addr <= 0x2E; addr++) {
        const value = state.registers[addr];
        if (value !== undefined) {
            parts.push(addr.toString(16).padStart(2, '0').toUpperCase());
            parts.push(value.toString(16).padStart(2, '0').toUpperCase());
        }
    }
    
    // Add terminator
    parts.push('00', '00');
    
    // Add PA table
    state.paTable.forEach(byte => {
        parts.push(byte.toString(16).padStart(2, '0').toUpperCase());
    });
    
    return parts.join(' ');
}

/**
 * Generate full Flipper .sub file preset block
 */
function generateFlipperSubPreset(presetName) {
    return `Preset: FuriHalSubGhzPresetCustom
Custom_preset_module: CC1101
Custom_preset_data: ${generateFlipperPresetData()}`;
}

/**
 * Generate setting_user format
 */
function generateFlipperSettingUser(presetName) {
    return `Custom_preset_name: ${presetName}
Custom_preset_module: CC1101
Custom_preset_data: ${generateFlipperPresetData()}`;
}

/**
 * Generate C array format
 */
function generateCArray(presetName) {
    const safeName = presetName.replace(/[^a-zA-Z0-9_]/g, '_');
    let output = `// CC1101 Register Configuration: ${presetName}\n`;
    output += `// Generated by CC1101 Register Editor\n\n`;
    output += `static const uint8_t ${safeName}_registers[] = {\n`;
    
    for (let addr = 0; addr <= 0x2E; addr++) {
        const value = state.registers[addr];
        const reg = CC1101_REGISTERS[addr];
        if (value !== undefined && reg) {
            output += `    0x${value.toString(16).padStart(2, '0').toUpperCase()},  // 0x${addr.toString(16).padStart(2, '0').toUpperCase()} ${reg.name}\n`;
        }
    }
    
    output += `};\n\n`;
    output += `static const uint8_t ${safeName}_pa_table[] = {\n    `;
    output += state.paTable.map(b => `0x${b.toString(16).padStart(2, '0').toUpperCase()}`).join(', ');
    output += `\n};\n`;
    
    return output;
}

/**
 * Generate raw hex format
 */
function generateRawHex() {
    const parts = [];
    for (let addr = 0; addr <= 0x2E; addr++) {
        const value = state.registers[addr];
        if (value !== undefined) {
            parts.push(value.toString(16).padStart(2, '0').toUpperCase());
        }
    }
    return parts.join(' ');
}

// ============================================
// Import Functions
// ============================================

/**
 * Parse Flipper Custom_preset_data format
 */
function parseFlipperPresetData(data) {
    // Clean up the input
    const cleanData = data.replace(/Custom_preset_data:\s*/i, '').trim();
    const bytes = cleanData.split(/\s+/).map(b => parseInt(b, 16));
    
    // Parse address-value pairs
    let i = 0;
    while (i < bytes.length - 2) {
        const addr = bytes[i];
        const value = bytes[i + 1];
        
        // Check for terminator
        if (addr === 0 && value === 0) {
            // Next 8 bytes are PA table
            state.paTable = bytes.slice(i + 2, i + 10);
            break;
        }
        
        if (addr <= 0x2E) {
            state.registers[addr] = value;
        }
        i += 2;
    }
    
    return true;
}

/**
 * Parse raw hex (just register values in order)
 */
function parseRawHex(data) {
    const bytes = data.trim().split(/\s+/).map(b => parseInt(b, 16));
    
    for (let i = 0; i < Math.min(bytes.length, 0x2F); i++) {
        if (!isNaN(bytes[i])) {
            state.registers[i] = bytes[i];
        }
    }
    
    return true;
}

// ============================================
// UI Rendering
// ============================================

/**
 * Get a set of valid (non-reserved) bit indices for a register
 */
function getValidBits(reg) {
    const validBits = new Set();
    if (reg && reg.fields) {
        for (const field of reg.fields) {
            for (const bit of field.bits) {
                validBits.add(bit);
            }
        }
    }
    return validBits;
}

/**
 * Get the field name for a specific bit
 */
function getFieldNameForBit(reg, bitIndex) {
    if (reg && reg.fields) {
        for (const field of reg.fields) {
            if (field.bits.includes(bitIndex)) {
                return field.name;
            }
        }
    }
    return null;
}

function renderRegisterNav() {
    const nav = document.getElementById('registerNav');
    nav.innerHTML = '';
    
    for (const [groupName, addresses] of Object.entries(REGISTER_GROUPS)) {
        const item = document.createElement('div');
        item.className = `nav-item ${groupName === state.currentGroup ? 'active' : ''}`;
        item.innerHTML = `
            <span>${groupName}</span>
            <span class="count">${addresses.length}</span>
        `;
        item.addEventListener('click', () => {
            state.currentGroup = groupName;
            renderRegisterNav();
            renderRegisterList();
        });
        nav.appendChild(item);
    }
}

function renderRegisterList() {
    const list = document.getElementById('registerList');
    const title = document.getElementById('currentGroupTitle');
    
    title.textContent = state.currentGroup;
    list.innerHTML = '';
    
    const addresses = REGISTER_GROUPS[state.currentGroup];
    
    for (const addr of addresses) {
        const reg = CC1101_REGISTERS[addr];
        if (!reg) continue;
        
        const value = state.registers[addr] || 0;
        const addrHex = addr.toString(16).padStart(2, '0').toUpperCase();
        const valueHex = value.toString(16).padStart(2, '0').toUpperCase();
        const binary = value.toString(2).padStart(8, '0');
        const validBits = getValidBits(reg);
        
        const card = document.createElement('div');
        card.className = 'register-card';
        card.innerHTML = `
            <div class="register-header" data-addr="${addr}">
                <div class="register-info">
                    <span class="register-addr">0x${addrHex}</span>
                    <span class="register-name">${reg.name}</span>
                    <span class="register-desc">${reg.description}</span>
                </div>
                <div class="register-value">
                    <div class="bit-display" data-addr="${addr}">
                        ${binary.split('').map((b, i) => {
                            const bitIndex = 7 - i; // Bit 7 is leftmost
                            const isValid = validBits.has(bitIndex);
                            const fieldName = getFieldNameForBit(reg, bitIndex);
                            const tooltip = isValid ? `Bit ${bitIndex} (${fieldName})` : `Bit ${bitIndex} (Reserved)`;
                            const classes = `bit ${b === '1' ? 'active' : ''} ${isValid ? '' : 'reserved'}`;
                            return `<span class="${classes}" data-bit="${bitIndex}" data-valid="${isValid}" title="${tooltip}">${b}</span>`;
                        }).join('')}
                    </div>
                    <input type="text" 
                           value="0x${valueHex}" 
                           data-addr="${addr}"
                           class="register-input"
                           maxlength="4">
                </div>
            </div>
            <div class="register-body">
                <div class="field-list">
                    ${reg.fields.map(field => {
                        const fieldValue = extractFieldValue(value, field.bits);
                        return `
                            <div class="field-item">
                                <span class="field-name">${field.name}</span>
                                <span class="field-desc">${field.description}</span>
                                <span class="field-bits">[${field.bits.join(':')}] = ${fieldValue}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        
        // Add click handler for bit toggling (only valid bits)
        card.querySelectorAll('.bit:not(.reserved)').forEach(bitEl => {
            bitEl.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card expand/collapse
                const bitIndex = parseInt(e.target.dataset.bit);
                const regAddr = parseInt(e.target.closest('.bit-display').dataset.addr);
                const fieldName = getFieldNameForBit(CC1101_REGISTERS[regAddr], bitIndex);
                
                // Toggle the bit
                const currentValue = state.registers[regAddr] || 0;
                const newValue = currentValue ^ (1 << bitIndex);
                state.registers[regAddr] = newValue;
                
                // Update UI
                updateExportPreview();
                renderRegisterList();
                updateQuickConfigFromRegisters();
                showToast(`${fieldName}[${bitIndex}] → 0x${newValue.toString(16).toUpperCase().padStart(2, '0')}`);
            });
        });
        
        // Add click handler to expand/collapse
        card.querySelector('.register-header').addEventListener('click', (e) => {
            if (!e.target.matches('input') && !e.target.matches('.bit')) {
                card.classList.toggle('expanded');
            }
        });
        
        // Add input handler
        card.querySelector('.register-input').addEventListener('change', (e) => {
            const addr = parseInt(e.target.dataset.addr);
            let value = e.target.value.trim();
            
            // Parse hex or decimal
            if (value.startsWith('0x') || value.startsWith('0X')) {
                value = parseInt(value, 16);
            } else {
                value = parseInt(value);
            }
            
            if (!isNaN(value) && value >= 0 && value <= 255) {
                state.registers[addr] = value;
                updateExportPreview();
                renderRegisterList();
                updateQuickConfigFromRegisters();
            }
        });
        
        list.appendChild(card);
    }
}

function extractFieldValue(regValue, bits) {
    if (bits.length === 1) {
        return (regValue >> bits[0]) & 1;
    }
    
    const highBit = Math.max(...bits);
    const lowBit = Math.min(...bits);
    const mask = (1 << (highBit - lowBit + 1)) - 1;
    return (regValue >> lowBit) & mask;
}

function renderPresetOptions() {
    const select = document.getElementById('presetSelect');
    select.innerHTML = '<option value="">-- Select Preset --</option>';
    
    for (const name of Object.keys(PRESETS)) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    }
}

function updateExportPreview() {
    const format = document.getElementById('exportFormat').value;
    const presetName = document.getElementById('presetName').value || 'Custom';
    const preview = document.getElementById('exportPreview').querySelector('code');
    
    let output = '';
    switch (format) {
        case 'flipper':
            output = generateFlipperSubPreset(presetName);
            break;
        case 'flipper_setting':
            output = generateFlipperSettingUser(presetName);
            break;
        case 'c_array':
            output = generateCArray(presetName);
            break;
        case 'raw_hex':
            output = generateRawHex();
            break;
    }
    
    preview.textContent = output;
}

function updateQuickConfigFromRegisters() {
    // Update frequency display
    const freq = registersToFrequency(
        state.registers[0x0D],
        state.registers[0x0E],
        state.registers[0x0F]
    );
    document.getElementById('frequencyInput').value = freq.toFixed(3);
    updateFrequencyHint(freq);
    
    // Update modulation
    const mdmcfg2 = state.registers[0x12] || 0;
    const modFormat = (mdmcfg2 >> 4) & 0x07;
    document.getElementById('modulationSelect').value = modFormat;
    
    // Update data rate
    const dataRate = registersToDataRate(state.registers[0x10], state.registers[0x11]);
    document.getElementById('dataRateInput').value = dataRate.toFixed(2);
    updateDataRateHint(state.registers[0x10], state.registers[0x11]);
    
    // Update deviation
    const deviation = registerToDeviation(state.registers[0x15] || 0);
    document.getElementById('deviationInput').value = deviation.toFixed(1);
    
    // Show/hide deviation based on modulation
    const deviationGroup = document.getElementById('deviationGroup');
    deviationGroup.style.display = modFormat === 3 ? 'none' : 'flex';
}

function updateFrequencyHint(freqMHz) {
    const regs = frequencyToRegisters(freqMHz);
    const hint = document.getElementById('freqHint');
    hint.textContent = `FREQ: 0x${regs.FREQ2.toString(16).toUpperCase().padStart(2, '0')}${regs.FREQ1.toString(16).toUpperCase().padStart(2, '0')}${regs.FREQ0.toString(16).toUpperCase().padStart(2, '0')}`;
}

function updateDataRateHint(mdmcfg4, mdmcfg3) {
    const hint = document.getElementById('drateHint');
    hint.textContent = `MDMCFG4/3: 0x${(mdmcfg4 || 0).toString(16).toUpperCase().padStart(2, '0')}/0x${(mdmcfg3 || 0).toString(16).toUpperCase().padStart(2, '0')}`;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ============================================
// Event Handlers
// ============================================

function setupEventListeners() {
    // Preset selection
    document.getElementById('presetSelect').addEventListener('change', (e) => {
        const presetName = e.target.value;
        if (presetName && PRESETS[presetName]) {
            const preset = PRESETS[presetName];
            
            // Load register values
            for (const [addr, value] of Object.entries(preset.registers)) {
                state.registers[parseInt(addr)] = value;
            }
            
            // Load PA table
            if (preset.paTable) {
                state.paTable = [...preset.paTable];
            }
            
            updateQuickConfigFromRegisters();
            renderRegisterList();
            updateExportPreview();
            showToast(`Loaded preset: ${presetName}`);
        }
    });
    
    // Frequency input
    document.getElementById('frequencyInput').addEventListener('change', (e) => {
        const freqMHz = parseFloat(e.target.value);
        if (freqMHz >= 300 && freqMHz <= 928) {
            const regs = frequencyToRegisters(freqMHz);
            state.registers[0x0D] = regs.FREQ2;
            state.registers[0x0E] = regs.FREQ1;
            state.registers[0x0F] = regs.FREQ0;
            
            // Update PA table for new frequency
            const power = parseInt(document.getElementById('txPowerSelect').value);
            state.paTable = getPaTable(freqMHz, power);
            
            updateFrequencyHint(freqMHz);
            renderRegisterList();
            updateExportPreview();
        }
    });
    
    // Modulation selection
    document.getElementById('modulationSelect').addEventListener('change', (e) => {
        const modFormat = parseInt(e.target.value);
        
        // Update MDMCFG2
        let mdmcfg2 = state.registers[0x12] || 0;
        mdmcfg2 = (mdmcfg2 & 0x8F) | (modFormat << 4);
        state.registers[0x12] = mdmcfg2;
        
        // Show/hide deviation
        const deviationGroup = document.getElementById('deviationGroup');
        deviationGroup.style.display = modFormat === 3 ? 'none' : 'flex';
        
        renderRegisterList();
        updateExportPreview();
    });
    
    // Data rate input
    document.getElementById('dataRateInput').addEventListener('change', (e) => {
        const dataRateKbps = parseFloat(e.target.value);
        if (dataRateKbps >= 0.6 && dataRateKbps <= 500) {
            const regs = dataRateToRegisters(dataRateKbps);
            
            // Update MDMCFG4 (preserve bandwidth bits)
            let mdmcfg4 = state.registers[0x10] || 0;
            mdmcfg4 = (mdmcfg4 & 0xF0) | (regs.DRATE_E & 0x0F);
            state.registers[0x10] = mdmcfg4;
            state.registers[0x11] = regs.DRATE_M;
            
            updateDataRateHint(state.registers[0x10], state.registers[0x11]);
            renderRegisterList();
            updateExportPreview();
        }
    });
    
    // Bandwidth selection
    document.getElementById('bandwidthSelect').addEventListener('change', (e) => {
        const bwKHz = parseInt(e.target.value);
        const regs = bandwidthToRegisters(bwKHz);
        
        // Update MDMCFG4 (preserve data rate bits)
        let mdmcfg4 = state.registers[0x10] || 0;
        mdmcfg4 = (mdmcfg4 & 0x0F) | (regs.CHANBW_E << 6) | (regs.CHANBW_M << 4);
        state.registers[0x10] = mdmcfg4;
        
        updateDataRateHint(state.registers[0x10], state.registers[0x11]);
        renderRegisterList();
        updateExportPreview();
    });
    
    // Deviation input
    document.getElementById('deviationInput').addEventListener('change', (e) => {
        const devKHz = parseFloat(e.target.value);
        if (devKHz >= 1.5 && devKHz <= 380) {
            state.registers[0x15] = deviationToRegister(devKHz);
            
            const hint = document.getElementById('devHint');
            hint.textContent = `DEVIATN: 0x${state.registers[0x15].toString(16).toUpperCase().padStart(2, '0')}`;
            
            renderRegisterList();
            updateExportPreview();
        }
    });
    
    // TX Power selection
    document.getElementById('txPowerSelect').addEventListener('change', (e) => {
        const power = parseInt(e.target.value);
        const freq = parseFloat(document.getElementById('frequencyInput').value);
        state.paTable = getPaTable(freq, power);
        updateExportPreview();
    });
    
    // Export format change
    document.getElementById('exportFormat').addEventListener('change', updateExportPreview);
    document.getElementById('presetName').addEventListener('input', updateExportPreview);
    
    // Copy button
    document.getElementById('copyBtn').addEventListener('click', async () => {
        const preview = document.getElementById('exportPreview').querySelector('code');
        try {
            await navigator.clipboard.writeText(preview.textContent);
            showToast('Copied to clipboard!');
        } catch (err) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = preview.textContent;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('Copied to clipboard!');
        }
    });
    
    // Import button
    document.getElementById('importBtn').addEventListener('click', () => {
        const data = document.getElementById('importData').value.trim();
        if (!data) {
            showToast('No data to import', 'error');
            return;
        }
        
        try {
            // Try to detect format
            if (data.includes('Custom_preset_data') || data.match(/[0-9A-Fa-f]{2}\s+[0-9A-Fa-f]{2}/)) {
                if (data.includes('00 00')) {
                    parseFlipperPresetData(data);
                } else {
                    parseRawHex(data);
                }
            } else {
                parseRawHex(data);
            }
            
            updateQuickConfigFromRegisters();
            renderRegisterList();
            updateExportPreview();
            document.getElementById('importData').value = '';
            showToast('Import successful!');
        } catch (err) {
            showToast('Import failed: ' + err.message, 'error');
        }
    });
    
    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
        initializeRegisters();
        state.paTable = [0xC0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
        
        document.getElementById('presetSelect').value = '';
        document.getElementById('frequencyInput').value = '433.92';
        document.getElementById('modulationSelect').value = '3';
        document.getElementById('dataRateInput').value = '3.79';
        document.getElementById('bandwidthSelect').value = '270';
        document.getElementById('deviationInput').value = '47.6';
        document.getElementById('txPowerSelect').value = '10';
        
        updateQuickConfigFromRegisters();
        renderRegisterList();
        updateExportPreview();
        showToast('Reset to defaults');
    });
    
    // View toggle
    document.getElementById('viewSimple').addEventListener('click', () => {
        state.viewMode = 'simple';
        document.getElementById('viewSimple').classList.add('active');
        document.getElementById('viewAdvanced').classList.remove('active');
        // Collapse all cards
        document.querySelectorAll('.register-card').forEach(card => {
            card.classList.remove('expanded');
        });
    });
    
    document.getElementById('viewAdvanced').addEventListener('click', () => {
        state.viewMode = 'advanced';
        document.getElementById('viewAdvanced').classList.add('active');
        document.getElementById('viewSimple').classList.remove('active');
        // Expand all cards
        document.querySelectorAll('.register-card').forEach(card => {
            card.classList.add('expanded');
        });
    });
}

// ============================================
// Initialization
// ============================================

function init() {
    initializeRegisters();
    renderPresetOptions();
    renderRegisterNav();
    renderRegisterList();
    updateExportPreview();
    setupEventListeners();
    
    // Set initial frequency hint
    updateFrequencyHint(433.92);
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
