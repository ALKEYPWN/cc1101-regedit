/**
 * CC1101 Bridge - USB VCP Communication Handler
 * Handles line-buffered JSON messages over USB serial
 */

#include "cc1101_bridge_uart.h"
#include <furi_hal.h>
#include <furi_hal_usb_cdc.h>

#define UART_BAUD_RATE   115200
#define RX_BUFFER_SIZE   512
#define LINE_BUFFER_SIZE 1024

struct UartContext {
    uint8_t rx_buffer[RX_BUFFER_SIZE];
    char line_buffer[LINE_BUFFER_SIZE];
    size_t line_pos;
    FuriStreamBuffer* rx_stream;
};

void uart_init(UartContext** ctx) {
    *ctx = malloc(sizeof(UartContext));
    UartContext* context = *ctx;

    context->line_pos = 0;
    context->rx_stream = furi_stream_buffer_alloc(RX_BUFFER_SIZE, 1);

    // USB VCP is already initialized by system, just enable it
    furi_hal_cdc_set_callbacks(0, NULL, NULL);
}

bool uart_receive_line(UartContext* ctx, FuriString* line, uint32_t timeout_ms) {
    furi_check(ctx);
    furi_check(line);

    uint32_t start_time = furi_get_tick();

    while(true) {
        // Check timeout
        if(furi_get_tick() - start_time > timeout_ms) {
            return false;
        }

        // Try to read from USB CDC
        size_t available = furi_hal_cdc_receive(0, ctx->rx_buffer, RX_BUFFER_SIZE);

        if(available > 0) {
            // Process received bytes
            for(size_t i = 0; i < available; i++) {
                char c = ctx->rx_buffer[i];

                // Line ending detection
                if(c == '\n' || c == '\r') {
                    if(ctx->line_pos > 0) {
                        // Complete line received
                        ctx->line_buffer[ctx->line_pos] = '\0';
                        furi_string_set_str(line, ctx->line_buffer);
                        ctx->line_pos = 0;
                        return true;
                    }
                } else if(ctx->line_pos < LINE_BUFFER_SIZE - 1) {
                    ctx->line_buffer[ctx->line_pos++] = c;
                } else {
                    // Buffer overflow, reset
                    ctx->line_pos = 0;
                }
            }
        }

        furi_delay_ms(10);
    }
}

void uart_send_response(UartContext* ctx, const char* json) {
    furi_check(ctx);
    furi_check(json);

    size_t len = strlen(json);

    // Create non-const buffers for CDC send (API doesn't accept const)
    uint8_t* json_buf = (uint8_t*)json;
    uint8_t newline = '\n';

    // Send JSON
    furi_hal_cdc_send(0, json_buf, len);

    // Send newline
    furi_hal_cdc_send(0, &newline, 1);
}

void uart_deinit(UartContext* ctx) {
    if(ctx) {
        if(ctx->rx_stream) {
            furi_stream_buffer_free(ctx->rx_stream);
        }
        free(ctx);
    }
}
