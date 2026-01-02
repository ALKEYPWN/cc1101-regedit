/**
 * CC1101 Bridge - CC1101 Control Header
 */

#pragma once

#include <furi.h>
#include "cc1101_bridge_protocol.h"

typedef struct Cc1101Context Cc1101Context;

/**
 * Initialize CC1101 device
 */
bool cc1101_init(Cc1101Context** ctx);

/**
 * Write a single register
 * @param addr Register address (0x00-0x2E)
 * @param value Register value
 * @return true on success
 */
bool cc1101_write_register(Cc1101Context* ctx, uint8_t addr, uint8_t value);

/**
 * Write multiple registers
 * @param regs Array of register/value pairs
 * @param count Number of pairs
 * @return true on success
 */
bool cc1101_write_bulk(Cc1101Context* ctx, const RegisterPair* regs, uint8_t count);

/**
 * Write PA table
 * @param pa_table Array of 8 PA values
 * @param count Number of values (max 8)
 * @return true on success
 */
bool cc1101_write_patable(Cc1101Context* ctx, const uint8_t* pa_table, uint8_t count);

/**
 * Read a single register
 * @param addr Register address (0x00-0x2E)
 * @return Register value
 */
uint8_t cc1101_read_register(Cc1101Context* ctx, uint8_t addr);

/**
 * Clean up CC1101 device
 */
void cc1101_deinit(Cc1101Context* ctx);
