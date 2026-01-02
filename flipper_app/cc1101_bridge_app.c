/**
 * CC1101 Bridge - Main Application
 * USB bridge for CC1101 register configuration from web app
 */

#include <furi.h>
#include <gui/gui.h>
#include <gui/view_dispatcher.h>
#include <gui/modules/submenu.h>
#include <gui/view.h>

#include "cc1101_bridge_uart.h"
#include "cc1101_bridge_protocol.h"
#include "cc1101_bridge_cc1101.h"

#define TAG                "CC1101Bridge"
#define RECEIVE_TIMEOUT_MS 100

typedef struct {
    Gui* gui;
    ViewDispatcher* view_dispatcher;
    View* main_view;

    UartContext* uart;
    Cc1101Context* cc1101;

    bool running;
    uint32_t commands_processed;
    char status_text[64];
} App;

// View draw callback
static void app_draw_callback(Canvas* canvas, void* context) {
    App* app = context;
    furi_check(app);

    canvas_clear(canvas);
    canvas_set_font(canvas, FontPrimary);
    canvas_draw_str(canvas, 10, 15, "CC1101 Bridge");

    canvas_set_font(canvas, FontSecondary);
    canvas_draw_str(canvas, 10, 30, "USB: Connected");

    char buffer[64];
    snprintf(buffer, sizeof(buffer), "Commands: %lu", app->commands_processed);
    canvas_draw_str(canvas, 10, 42, buffer);

    canvas_draw_str(canvas, 10, 54, app->status_text);
}

// View input callback
static bool app_input_callback(InputEvent* event, void* context) {
    App* app = context;
    furi_check(app);

    if(event->type == InputTypePress && event->key == InputKeyBack) {
        app->running = false;
        return true;
    }

    return false;
}

// Process a single command
static void app_process_command(App* app, const char* json_str) {
    furi_check(app);
    furi_check(json_str);

    Command cmd;
    FuriString* response = furi_string_alloc();

    // Parse command
    if(!protocol_parse_command(json_str, &cmd)) {
        FURI_LOG_W(TAG, "Invalid JSON: %s", json_str);
        protocol_generate_error(response, ERR_INVALID_JSON, "Invalid JSON");
        uart_send_response(app->uart, furi_string_get_cstr(response));
        furi_string_free(response);
        return;
    }

    // Execute command
    bool success = false;

    switch(cmd.type) {
    case CMD_WRITE_REGISTER:
        FURI_LOG_I(TAG, "Write reg 0x%02X = 0x%02X", cmd.addr, cmd.value);
        success = cc1101_write_register(app->cc1101, cmd.addr, cmd.value);
        if(success) {
            protocol_generate_ack(response);
            snprintf(
                app->status_text,
                sizeof(app->status_text),
                "Wrote 0x%02X->0x%02X",
                cmd.addr,
                cmd.value);
        } else {
            protocol_generate_error(response, ERR_WRITE_FAILED, "Write failed");
        }
        break;

    case CMD_WRITE_BULK:
        FURI_LOG_I(TAG, "Write bulk: %u regs", cmd.bulk_count);
        success = cc1101_write_bulk(app->cc1101, cmd.bulk_regs, cmd.bulk_count);
        if(success && cmd.pa_table_count > 0) {
            success = cc1101_write_patable(app->cc1101, cmd.pa_table, cmd.pa_table_count);
        }
        if(success) {
            protocol_generate_ack(response);
            snprintf(app->status_text, sizeof(app->status_text), "Bulk: %u regs", cmd.bulk_count);
        } else {
            protocol_generate_error(response, ERR_WRITE_FAILED, "Bulk write failed");
        }
        break;

    case CMD_READ_REGISTER:
        FURI_LOG_I(TAG, "Read reg 0x%02X", cmd.addr);
        uint8_t reg_value = cc1101_read_register(app->cc1101, cmd.addr);
        protocol_generate_data(response, reg_value);
        snprintf(
            app->status_text, sizeof(app->status_text), "Read 0x%02X=0x%02X", cmd.addr, reg_value);
        success = true;
        break;

    case CMD_PING:
        FURI_LOG_D(TAG, "Ping");
        protocol_generate_ack(response);
        snprintf(app->status_text, sizeof(app->status_text), "Ping OK");
        success = true;
        break;

    default:
        FURI_LOG_W(TAG, "Unknown command");
        protocol_generate_error(response, ERR_UNKNOWN_COMMAND, "Unknown command");
        break;
    }

    // Send response
    uart_send_response(app->uart, furi_string_get_cstr(response));

    if(success) {
        app->commands_processed++;
    }

    furi_string_free(response);
}

// Main app entry point
int32_t cc1101_bridge_app(void* p) {
    UNUSED(p);

    FURI_LOG_I(TAG, "Starting CC1101 Bridge");

    // Allocate app
    App* app = malloc(sizeof(App));
    app->commands_processed = 0;
    app->running = true;
    snprintf(app->status_text, sizeof(app->status_text), "Waiting for commands...");

    // Initialize UART
    uart_init(&app->uart);

    // Initialize CC1101
    if(!cc1101_init(&app->cc1101)) {
        FURI_LOG_E(TAG, "Failed to init CC1101");
        uart_deinit(app->uart);
        free(app);
        return -1;
    }

    // Set up GUI
    app->gui = furi_record_open(RECORD_GUI);
    app->view_dispatcher = view_dispatcher_alloc();

    app->main_view = view_alloc();
    view_set_draw_callback(app->main_view, app_draw_callback);
    view_set_input_callback(app->main_view, app_input_callback);
    view_set_context(app->main_view, app);
    view_dispatcher_add_view(app->view_dispatcher, 0, app->main_view);

    view_dispatcher_attach_to_gui(app->view_dispatcher, app->gui, ViewDispatcherTypeFullscreen);
    view_dispatcher_switch_to_view(app->view_dispatcher, 0);

    // Main event loop
    FuriString* line = furi_string_alloc();

    while(app->running) {
        // Try to receive commands
        if(uart_receive_line(app->uart, line, RECEIVE_TIMEOUT_MS)) {
            const char* json_str = furi_string_get_cstr(line);
            FURI_LOG_D(TAG, "RX: %s", json_str);

            app_process_command(app, json_str);

            // Update view
            view_dispatcher_send_custom_event(app->view_dispatcher, 0);
        }

        // Process GUI events
        view_dispatcher_run(app->view_dispatcher);
    }

    // Cleanup
    furi_string_free(line);

    view_dispatcher_remove_view(app->view_dispatcher, 0);
    view_free(app->main_view);
    view_dispatcher_free(app->view_dispatcher);
    furi_record_close(RECORD_GUI);

    cc1101_deinit(app->cc1101);
    uart_deinit(app->uart);
    free(app);

    FURI_LOG_I(TAG, "CC1101 Bridge stopped");

    return 0;
}
