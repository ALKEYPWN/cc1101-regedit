/**
 * CC1101 Bridge - Protocol Header
 */

#pragma once

#include <furi.h>

#define MAX_BULK_REGISTERS 47 // 0x00 to 0x2E

typedef enum {
  CMD_UNKNOWN = 0,
  CMD_WRITE_REGISTER,
  CMD_WRITE_BULK,
  CMD_READ_REGISTER,
  CMD_PING,
} CommandType;

typedef enum {
  ERR_INVALID_JSON = 1,
  ERR_UNKNOWN_COMMAND = 2,
  ERR_INVALID_ADDRESS = 3,
  ERR_DEVICE_NOT_AVAILABLE = 4,
  ERR_WRITE_FAILED = 5,
} ErrorCode;

typedef struct {
  uint8_t addr;
  uint8_t value;
} RegisterPair;

typedef struct {
  CommandType type;
  uint8_t addr;
  uint8_t value;
  RegisterPair bulk_regs[MAX_BULK_REGISTERS];
  uint8_t bulk_count;
  uint8_t pa_table[8];
  uint8_t pa_table_count;
} Command;

/**
 * Parse JSON command from web app
 * @param json JSON string
 * @param cmd Output command structure
 * @return true if parsed successfully
 */
bool protocol_parse_command(const char *json, Command *cmd);

/**
 * Generate ACK response
 */
void protocol_generate_ack(FuriString *response);

/**
 * Generate error response
 */
void protocol_generate_error(FuriString *response, ErrorCode code,
                             const char *msg);

/**
 * Generate data response (for read operations)
 */
void protocol_generate_data(FuriString *response, uint8_t value);
