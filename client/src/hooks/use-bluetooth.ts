import { useState, useRef, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useCreateAlert } from "./use-alerts";
import { Capacitor } from "@capacitor/core";
import { BleClient, textToDataView, dataViewToText } from "@capacitor-community/bluetooth-le";

// Arduino UNO R4 WiFi built-in BLE UUIDs
const SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214";
const CHARACTERISTIC_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214";
const DEVICE_NAME = "SmartBag-Security";

type BluetoothStatus = "disconnected" | "connecting" | "connected" | "error";

// Web Bluetooth global declarations (browser only)
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

const isNative = Capacitor.isNativePlatform();

export function useBluetooth() {
  const [status, setStatus] = useState<BluetoothStatus>("disconnected");
  const [isAlerting, setIsAlerting] = useState(false);
  const [alertType, setAlertType] = useState<"intrusion" | "water" | "override" | "surveillance" | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const { toast } = useToast();
  const createAlert = useCreateAlert();

  // Native-mode state
  const nativeDeviceId = useRef<string | null>(null);

  // Web-mode state
  const webDevice = useRef<BluetoothDevice | null>(null);
  const webCharacteristic = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  // Audio context for alarm sound
  const audioContext = useRef<AudioContext | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);

  // ─── Alarm ────────────────────────────────────────────────────────────────

  const stopAlarm = useCallback(() => {
    setIsAlerting(false);
    if (oscillator.current) {
      try {
        oscillator.current.stop();
        oscillator.current.disconnect();
      } catch {
        // already stopped
      }
      oscillator.current = null;
    }
  }, []);

  const triggerAlarm = useCallback((type: "intrusion" | "water" | "override" | "surveillance" = "intrusion") => {
    setIsAlerting(true);
    setAlertType(type);

    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 1000]);
    }

    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContext.current;
    if (ctx) {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      oscillator.current = osc;
    }

    const message =
      type === "intrusion"
        ? "Intrusion Detected via Bluetooth"
        : type === "water"
        ? "Water Damage Detected"
        : type === "surveillance"
        ? "Motion Detected by Surveillance Sensor"
        : "System Override Misuse Detected";
    createAlert.mutate({ message });
  }, [createAlert]);

  // ─── Message parser (shared between native & web) ─────────────────────────

  const handleMessage = useCallback((raw: string) => {
    const message = raw.trim().toUpperCase();
    console.log("[BLE] Received:", message);

    const batteryMatch = message.match(/BATTERY:(\d+)/);
    if (batteryMatch) {
      const level = Math.min(100, Math.max(0, parseInt(batteryMatch[1], 10)));
      setBatteryLevel(level);
      return;
    }

    if (message.includes("INTRUSION") || message.includes("ALERT")) {
      triggerAlarm("intrusion");
    } else if (message.includes("WATER")) {
      triggerAlarm("water");
    } else if (message.includes("OVERRIDE")) {
      triggerAlarm("override");
    } else if (message.includes("SURVEILLANCE") || message.includes("MOTION") || message.includes("PROXIMITY")) {
      triggerAlarm("surveillance");
    }
  }, [triggerAlarm]);

  // ─── Native (Capacitor) handlers ──────────────────────────────────────────

  const connectNative = useCallback(async () => {
    try {
      setStatus("connecting");
      await BleClient.initialize();

      const device = await BleClient.requestDevice({
        name: DEVICE_NAME,
        services: [SERVICE_UUID],
      });

      await BleClient.connect(device.deviceId, () => {
        // on disconnect
        setStatus("disconnected");
        nativeDeviceId.current = null;
        toast({ title: "Disconnected", description: "Lost connection to Smart Bag", variant: "destructive" });
      });

      nativeDeviceId.current = device.deviceId;

      await BleClient.startNotifications(
        device.deviceId,
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        (value: DataView) => {
          handleMessage(dataViewToText(value));
        }
      );

      setStatus("connected");
      toast({ title: "Connected", description: "Smart Bag linked successfully." });
    } catch (error) {
      console.error(error);
      setStatus("error");
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [handleMessage, toast]);

  const disconnectNative = useCallback(async () => {
    if (nativeDeviceId.current) {
      await BleClient.stopNotifications(nativeDeviceId.current, SERVICE_UUID, CHARACTERISTIC_UUID);
      await BleClient.disconnect(nativeDeviceId.current);
      nativeDeviceId.current = null;
      setStatus("disconnected");
      setBatteryLevel(null);
    }
  }, []);

  const sendDataNative = useCallback(async (data: string) => {
    if (!nativeDeviceId.current) {
      toast({ title: "Not Connected", description: "Connect to bag first.", variant: "destructive" });
      return;
    }
    try {
      await BleClient.writeWithoutResponse(
        nativeDeviceId.current,
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        textToDataView(data)
      );
      console.log("[BLE] Sent:", data);
      toast({ title: "Sent", description: `Data sent to bag: ${data}` });
    } catch (error) {
      console.error(error);
      toast({ title: "Send Failed", description: "Could not write to device.", variant: "destructive" });
    }
  }, [toast]);

  // ─── Web Bluetooth handlers ────────────────────────────────────────────────

  const handleWebCharacteristicChanged = useCallback((event: Event) => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;
    handleMessage(new TextDecoder("utf-8").decode(value));
  }, [handleMessage]);

  const onWebDisconnected = useCallback(() => {
    setStatus("disconnected");
    setBatteryLevel(null);
    webCharacteristic.current = null;
    toast({ title: "Disconnected", description: "Lost connection to Smart Bag", variant: "destructive" });
  }, [toast]);

  const connectWeb = useCallback(async () => {
    if (!navigator.bluetooth) {
      toast({
        title: "Bluetooth Not Supported",
        description: "Your browser doesn't support Web Bluetooth or you're not on a secure (HTTPS) connection.",
        variant: "destructive",
      });
      return;
    }
    try {
      setStatus("connecting");
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: DEVICE_NAME }, { services: [SERVICE_UUID] }],
      });
      webDevice.current = device;
      device.addEventListener("gattserverdisconnected", onWebDisconnected);

      const server = await device.gatt?.connect();
      if (!server) throw new Error("Could not connect to GATT server");

      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      await characteristic.startNotifications();
      characteristic.addEventListener("characteristicvaluechanged", handleWebCharacteristicChanged);
      webCharacteristic.current = characteristic;

      setStatus("connected");
      toast({ title: "Connected", description: "Smart Bag linked successfully." });
    } catch (error) {
      console.error(error);
      setStatus("error");
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [handleWebCharacteristicChanged, onWebDisconnected, toast]);

  const disconnectWeb = useCallback(() => {
    if (webDevice.current?.gatt?.connected) {
      webDevice.current.gatt.disconnect();
    }
  }, []);

  const sendDataWeb = useCallback(async (data: string) => {
    if (!webCharacteristic.current) {
      toast({ title: "Not Connected", description: "Connect to bag first.", variant: "destructive" });
      return;
    }
    try {
      await webCharacteristic.current.writeValue(new TextEncoder().encode(data));
      console.log("[BLE] Sent:", data);
      toast({ title: "Sent", description: `Data sent to bag: ${data}` });
    } catch (error) {
      console.error(error);
      toast({ title: "Send Failed", description: "Could not write to device.", variant: "destructive" });
    }
  }, [toast]);

  // ─── Unified API ──────────────────────────────────────────────────────────

  const connect = isNative ? connectNative : connectWeb;
  const disconnect = isNative ? disconnectNative : disconnectWeb;
  const sendData = isNative ? sendDataNative : sendDataWeb;

  // Clean up web listeners on unmount
  useEffect(() => {
    return () => {
      if (!isNative && webDevice.current) {
        webDevice.current.removeEventListener("gattserverdisconnected", onWebDisconnected);
      }
    };
  }, [onWebDisconnected]);

  return {
    status,
    connect,
    disconnect,
    sendData,
    triggerAlarm,
    isAlerting,
    alertType,
    stopAlarm,
    batteryLevel,
  };
}
