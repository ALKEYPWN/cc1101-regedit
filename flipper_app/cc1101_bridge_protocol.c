/**
 * CC1101 Bridge - JSON Protocol Parser
 * Parses commands from web app and generates responses
 */

#include "cc1101_bridge_protocol.h"

// Simple JSON parsing (minimal, protocol-specific)
// For production, consider using a proper JSON library

typedef enum {
    JSON_STATE_IDLE,
    JSON_STATE_KEY,
    JSON_STATE_VALUE,
} JsonState;

bool protocol_parse_command(const char* json, Command* cmd) {
    furi_check(json);
    furi_check(cmd);

    // Initialize command
    memset(cmd, 0, sizeof(Command));
    cmd->type = CMD_UNKNOWN;

    // Very simple JSON parsing - looks for "cmd":"xxx"
    const char* cmd_pos = strstr(json, "\"cmd\"");
    if(!cmd_pos) return false;

    // Find the value after "cmd":
    const char* value_start = strchr(cmd_pos, ':');
    if(!value_start) return false;
    value_start++;

    // Skip whitespace and quotes
    while(*value_start == ' ' || *value_start == '"')
        value_start++;

    // Determine command type
    if(strncmp(value_start, "write_register", 14) == 0) {
        cmd->type = CMD_WRITE_REGISTER;

        // Parse addr
        const char* addr_pos = strstr(json, "\"addr\"");
        if(addr_pos) {
            const char* addr_val = strchr(addr_pos, ':');
            if(addr_val) {
                cmd->addr = atoi(addr_val + 1);
            }
        }

        // Parse value
        const char* value_pos = strstr(json, "\"value\"");
        if(value_pos) {
            const char* val_val = strchr(value_pos, ':');
            if(val_val) {
                cmd->value = atoi(val_val + 1);
            }
        }

    } else if(strncmp(value_start, "write_bulk", 10) == 0) {
        cmd->type = CMD_WRITE_BULK;

        // Parse registers object
        const char* regs_pos = strstr(json, "\"registers\"");
        if(regs_pos) {
            const char* regs_obj = strchr(regs_pos, '{');
            if(regs_obj) {
                // Simple parsing: look for "addr":value pairs
                const char* p = regs_obj + 1;
                while(*p && *p != '}' && cmd->bulk_count < MAX_BULK_REGISTERS) {
                    if(*p == '"') {
                        p++;
                        uint8_t addr = atoi(p);
                        // Skip to value
                        while(*p && *p != ':')
                            p++;
                        if(*p == ':') {
                            p++;
                            uint8_t value = atoi(p);
                            cmd->bulk_regs[cmd->bulk_count].addr = addr;
                            cmd->bulk_regs[cmd->bulk_count].value = value;
                            cmd->bulk_count++;
                        }
                    }
                    p++;
                }
            }
        }

        // Parse PA table array
        const char* pa_pos = strstr(json, "\"pa_table\"");
        if(pa_pos) {
            const char* pa_arr = strchr(pa_pos, '[');
            if(pa_arr) {
                const char* p = pa_arr + 1;
                cmd->pa_table_count = 0;
                while(*p && *p != ']' && cmd->pa_table_count < 8) {
                    if(isdigit((unsigned char)*p)) {
                        cmd->pa_table[cmd->pa_table_count++] = atoi(p);
                        while(*p && isdigit((unsigned char)*p))
                            p++;
                    }
                    p++;
                }
            }
        }

    } else if(strncmp(value_start, "read_register", 13) == 0) {
        cmd->type = CMD_READ_REGISTER;

        const char* addr_pos = strstr(json, "\"addr\"");
        if(addr_pos) {
            const char* addr_val = strchr(addr_pos, ':');
            if(addr_val) {
                cmd->addr = atoi(addr_val + 1);
            }
        }

    } else if(strncmp(value_start, "ping", 4) == 0) {
        cmd->type = CMD_PING;
    }

    return cmd->type != CMD_UNKNOWN;
}

void protocol_generate_ack(FuriString* response) {
    furi_check(response);
    furi_string_set(response, "{\"type\":\"ack\",\"success\":true}");
}

void protocol_generate_error(FuriString* response, ErrorCode code, const char* msg) {
    furi_check(response);
    furi_check(msg);

    char buffer[256];
    snprintf(buffer, sizeof(buffer), "{\"type\":\"error\",\"code\":%d,\"msg\":\"%s\"}", code, msg);
    furi_string_set(response, buffer);
}

void protocol_generate_data(FuriString* response, uint8_t value) {
    furi_check(response);

    char buffer[64];
    snprintf(buffer, sizeof(buffer), "{\"type\":\"data\",\"value\":%u}", value);
    furi_string_set(response, buffer);
}
