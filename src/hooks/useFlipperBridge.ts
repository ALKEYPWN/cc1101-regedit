/**
 * Flipper Bridge Hook
 * Manages USB serial communication with Flipper Zero hardware
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Web Serial API types
interface SerialPort {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

interface Navigator {
  serial: {
    requestPort(): Promise<SerialPort>;
  };
}

// Protocol types
interface FlipperCommand {
  cmd: string;
  [key: string]: unknown;
}

interface FlipperResponse {
  type: 'ack' | 'error' | 'data';
  [key: string]: unknown;
}

// Hook interface
export interface FlipperBridge {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendRegisters: (registers: Record<number, number>, paTable: number[]) => Promise<void>;
  writeRegister: (addr: number, value: number) => Promise<void>;
  ping: () => Promise<boolean>;
}

/**
 * Custom hook for Flipper Zero bridge communication
 */
export function useFlipperBridge(): FlipperBridge {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);

  /**
   * Check if Web Serial API is supported
   */
  const isWebSerialSupported = useCallback((): boolean => {
    return 'serial' in navigator;
  }, []);

  /**
   * Send a JSON command to Flipper
   */
  const sendCommand = useCallback(async (command: FlipperCommand): Promise<void> => {
    if (!writerRef.current) {
      throw new Error('Not connected to Flipper');
    }

    const json = JSON.stringify(command);
    const data = new TextEncoder().encode(json + '\n');
    
    try {
      await writerRef.current.write(data);
    } catch (error) {
      console.error('Failed to send command:', error);
      throw new Error('Failed to send command to Flipper');
    }
  }, []);

  /**
   * Read responses from Flipper (background task)
   */
  const startReading = useCallback(async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Append to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (line) {
            try {
              const response: FlipperResponse = JSON.parse(line);
              console.log('Flipper response:', response);

              // Handle errors from Flipper
              if (response.type === 'error') {
                console.error('Flipper error:', response);
              }
            } catch (e) {
              console.warn('Invalid JSON from Flipper:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Read error:', error);
      setConnectionError('Connection lost');
      setIsConnected(false);
    }
  }, []);

  /**
   * Connect to Flipper Zero via USB serial
   */
  const connect = useCallback(async () => {
    if (!isWebSerialSupported()) {
      setConnectionError('Web Serial API not supported. Please use Chrome or Edge browser.');
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Request port from user
      const port = await (navigator as unknown as Navigator).serial.requestPort({ filters: [{ usbVendorId: 0x0483, usbProductId: 0x5740 }] });
      await port.open({ baudRate: 115200 });

      portRef.current = port;
      
      // Set up reader and writer
      readerRef.current = port.readable.getReader();
      writerRef.current = port.writable.getWriter();

      // Start reading responses in background
      startReading(readerRef.current);

      setIsConnected(true);
      setIsConnecting(false);

      console.log('Connected to Flipper Zero');
    } catch (error) {
      console.error('Connection failed:', error);
      setConnectionError(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsConnecting(false);
      setIsConnected(false);
    }
  }, [isWebSerialSupported, startReading]);

  /**
   * Disconnect from Flipper Zero
   */
  const disconnect = useCallback(async () => {
    try {
      // Release reader and writer
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current = null;
      }

      if (writerRef.current) {
        await writerRef.current.close();
        writerRef.current = null;
      }

      // Close port
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }

      setIsConnected(false);
      setConnectionError(null);
      console.log('Disconnected from Flipper Zero');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, []);

  /**
   * Send bulk register update to Flipper
   */
  const sendRegisters = useCallback(async (
    registers: Record<number, number>,
    paTable: number[]
  ): Promise<void> => {
    if (!isConnected) {
      throw new Error('Not connected to Flipper');
    }

    // Convert registers to string keys for JSON
    const regsForJson: Record<string, number> = {};
    for (let addr = 0; addr <= 0x2E; addr++) {
      if (registers[addr] !== undefined) {
        regsForJson[addr.toString()] = registers[addr];
      }
    }

    const command: FlipperCommand = {
      cmd: 'write_bulk',
      registers: regsForJson,
      pa_table: paTable
    };

    await sendCommand(command);
  }, [isConnected, sendCommand]);

  /**
   * Write a single register
   */
  const writeRegister = useCallback(async (addr: number, value: number): Promise<void> => {
    if (!isConnected) {
      throw new Error('Not connected to Flipper');
    }

    const command: FlipperCommand = {
      cmd: 'write_register',
      addr,
      value
    };

    await sendCommand(command);
  }, [isConnected, sendCommand]);

  /**
   * Ping Flipper to check connection
   */
  const ping = useCallback(async (): Promise<boolean> => {
    if (!isConnected) {
      return false;
    }

    try {
      const command: FlipperCommand = { cmd: 'ping' };
      await sendCommand(command);
      // In a full implementation, we'd wait for ack response
      // For now, assume success if no exception
      return true;
    } catch {
      return false;
    }
  }, [isConnected, sendCommand]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [isConnected, disconnect]);

  return {
    isConnected,
    isConnecting,
    connectionError,
    connect,
    disconnect,
    sendRegisters,
    writeRegister,
    ping
  };
}
