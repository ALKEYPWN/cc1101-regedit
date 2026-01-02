/**
 * CC1101 Bridge - UART Header
 */

#pragma once

#include <furi.h>

typedef struct UartContext UartContext;

/**
 * Initialize UART context for USB VCP communication
 */
void uart_init(UartContext **ctx);

/**
 * Receive a complete line from USB VCP (blocking with timeout)
 * @param ctx UART context
 * @param line Output string for received line
 * @param timeout_ms Timeout in milliseconds
 * @return true if line received, false on timeout
 */
bool uart_receive_line(UartContext *ctx, FuriString *line, uint32_t timeout_ms);

/**
 * Send a JSON response over USB VCP
 * @param ctx UART context
 * @param json Null-terminated JSON string
 */
void uart_send_response(UartContext *ctx, const char *json);

/**
 * Clean up UART context
 */
void uart_deinit(UartContext *ctx);
