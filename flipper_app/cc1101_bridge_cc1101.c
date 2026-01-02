/**
 * CC1101 Bridge - CC1101 Hardware Control  
 * Uses furi_hal_subghz for register configuration
 */

#include "cc1101_bridge_cc1101.h"
#include <furi_hal_subghz.h>

#define CC1101_MAX_REGISTER 0x2E
#define PA_TABLE_SIZE       8

struct Cc1101Context {
    bool initialized;
};

bool cc1101_init(Cc1101Context** ctx) {
    *ctx = malloc(sizeof(Cc1101Context));
    Cc1101Context* context = *ctx;

    // SubGHz is already initialized by system, just reset to known state
    furi_hal_subghz_reset();

    context->initialized = true;
    return true;
}

bool cc1101_write_register(Cc1101Context* ctx, uint8_t addr, uint8_t value) {
    furi_check(ctx);

    if(!ctx->initialized) return false;
    if(addr > CC1101_MAX_REGISTER) return false;

    // Create register data in format expected by furi_hal_subghz_load_registers
    // Format: address, value, 0x00, 0x00 (terminator)
    uint8_t reg_data[4] = {addr, value, 0x00, 0x00};
    furi_hal_subghz_load_registers(reg_data);

    return true;
}

bool cc1101_write_bulk(Cc1101Context* ctx, const RegisterPair* regs, uint8_t count) {
    furi_check(ctx);
    furi_check(regs);

    if(!ctx->initialized) return false;

    // Build register data array in Flipper format
    // Format: addr1, val1, addr2, val2, ..., 0x00, 0x00
    uint8_t reg_data[MAX_BULK_REGISTERS * 2 + 2];
    uint8_t idx = 0;

    for(uint8_t i = 0; i < count; i++) {
        if(regs[i].addr > CC1101_MAX_REGISTER) {
            return false;
        }
        reg_data[idx++] = regs[i].addr;
        reg_data[idx++] = regs[i].value;
    }

    // Add terminator
    reg_data[idx++] = 0x00;
    reg_data[idx++] = 0x00;

    furi_hal_subghz_load_registers(reg_data);

    return true;
}

bool cc1101_write_patable(Cc1101Context* ctx, const uint8_t* pa_table, uint8_t count) {
    furi_check(ctx);
    furi_check(pa_table);

    if(!ctx->initialized) return false;
    if(count > PA_TABLE_SIZE) count = PA_TABLE_SIZE;

    // Use built-in patable loader
    uint8_t full_pa[8] = {0};
    for(uint8_t i = 0; i < count; i++) {
        full_pa[i] = pa_table[i];
    }
    furi_hal_subghz_load_patable(full_pa);

    return true;
}

uint8_t cc1101_read_register(Cc1101Context* ctx, uint8_t addr) {
    furi_check(ctx);

    if(!ctx->initialized) return 0;
    if(addr > CC1101_MAX_REGISTER) return 0;

    // Note: There's no direct read function in the HAL API
    // This would require lower-level SPI access
    // For now, return 0 (read functionality can be added later if needed)
    return 0;
}

void cc1101_deinit(Cc1101Context* ctx) {
    if(ctx) {
        if(ctx->initialized) {
            furi_hal_subghz_sleep();
        }
        free(ctx);
    }
}
