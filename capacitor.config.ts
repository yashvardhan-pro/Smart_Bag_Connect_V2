import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.smartbag.os",
  appName: "SmartBag OS",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
    },
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: "Scanning for SmartBag…",
        cancel: "Cancel",
        availableDevices: "Available devices",
        noDeviceFound: "No SmartBag device found.",
      },
    },
  },
};

export default config;
