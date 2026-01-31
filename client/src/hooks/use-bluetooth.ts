import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCreateAlert } from "./use-alerts";

// HM-10 Standard UUIDs
const SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
const CHARACTERISTIC_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";

type BluetoothStatus = "disconnected" | "connecting" | "connected" | "error";

declare global {
  interface Navigator {
    bluetooth: {
      requestDevice(options: { filters: { services: string[] }[] }): Promise<BluetoothDevice>;
    };
  }

  interface BluetoothDevice extends EventTarget {
    gatt?: BluetoothRemoteGATTServer;
    removeEventListener(type: string, callback: EventListenerOrEventListenerObject): void;
  }

  interface BluetoothRemoteGATTServer {
    connect(): Promise<BluetoothRemoteGATTServer>;
    connected: boolean;
    disconnect(): void;
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
  }

  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
  }

  interface BluetoothRemoteGATTCharacteristic extends EventTarget {
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    writeValue(value: BufferSource): Promise<void>;
    value?: DataView;
  }
}

export function useBluetooth() {
  const [status, setStatus] = useState<BluetoothStatus>("disconnected");
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [characteristic, setCharacteristic] = useState<BluetoothRemoteGATTCharacteristic | null>(null);
  const [isAlerting, setIsAlerting] = useState(false);
  const { toast } = useToast();
  const createAlert = useCreateAlert();

  // Audio context for alarm
  const audioContext = useRef<AudioContext | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);

  const stopAlarm = useCallback(() => {
    setIsAlerting(false);
    if (oscillator.current) {
      try {
        oscillator.current.stop();
        oscillator.current.disconnect();
      } catch (e) {
        // ignore errors if already stopped
      }
      oscillator.current = null;
    }
  }, []);

  const triggerAlarm = useCallback(() => {
    setIsAlerting(true);
    
    // 1. Vibration
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 1000]);
    }

    // 2. Sound
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Create oscillator for siren sound
    const ctx = audioContext.current;
    if (ctx) {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.5); // Drop to A4
      
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      oscillator.current = osc;
      
      // Loop siren effect by recreating oscillator manually if needed, 
      // but for simple alert, a single sweep is often enough or we assume user acknowledges quickly.
      // For a persistent alarm, we'd need an interval.
    }

    // 3. Log to DB
    createAlert.mutate({ message: "Intrusion Detected via Bluetooth" });
  }, [createAlert]);

  const handleCharacteristicValueChanged = useCallback((event: Event) => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;

    const decoder = new TextDecoder("utf-8");
    const message = decoder.decode(value).trim();
    console.log("[BLE] Received:", message);

    // Check for specific alert keyword from Arduino
    if (message.includes("ALERT") || message.includes("INTRUSION")) {
      triggerAlarm();
    }
  }, [triggerAlarm]);

  const connect = useCallback(async () => {
    try {
      setStatus("connecting");
      
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }]
      });

      setDevice(device);
      device.addEventListener('gattserverdisconnected', onDisconnected);

      const server = await device.gatt?.connect();
      if (!server) throw new Error("Could not connect to GATT server");

      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);

      setCharacteristic(characteristic);
      setStatus("connected");
      toast({ title: "Connected", description: "Smart Bag linked successfully." });

    } catch (error) {
      console.error(error);
      setStatus("error");
      toast({ 
        title: "Connection Failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  }, [handleCharacteristicValueChanged, toast]);

  const disconnect = useCallback(() => {
    if (device?.gatt?.connected) {
      device.gatt.disconnect();
    }
  }, [device]);

  const onDisconnected = useCallback(() => {
    setStatus("disconnected");
    setCharacteristic(null);
    toast({ title: "Disconnected", description: "Lost connection to Smart Bag", variant: "destructive" });
    // Simple auto-reconnect attempt could go here if we had the device object, 
    // but browser security usually requires user gesture for reconnection unless previously paired in specific ways.
  }, [toast]);

  const sendData = useCallback(async (data: string) => {
    if (!characteristic) {
      toast({ title: "Not Connected", description: "Connect to bag first.", variant: "destructive" });
      return;
    }

    try {
      const encoder = new TextEncoder();
      const value = encoder.encode(data);
      // HM-10 usually expects writeWithoutResponse or writeValue
      await characteristic.writeValue(value);
      console.log("[BLE] Sent:", data);
      toast({ title: "Sent", description: `Data sent to bag: ${data}` });
    } catch (error) {
      console.error(error);
      toast({ title: "Send Failed", description: "Could not write to device.", variant: "destructive" });
    }
  }, [characteristic, toast]);

  // Clean up
  useEffect(() => {
    return () => {
      if (device) {
        device.removeEventListener('gattserverdisconnected', onDisconnected);
      }
    };
  }, [device, onDisconnected]);

  return {
    status,
    connect,
    disconnect,
    sendData,
    isAlerting,
    stopAlarm
  };
}
