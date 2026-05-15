#!/usr/bin/env bash
# SmartBag OS — Android APK build helper
# Run this script from the project root to produce a debug APK.
#
# Prerequisites (on your local machine, NOT on Replit):
#   • Node.js 18+
#   • Java 17+ (JDK)
#   • Android SDK with Build-Tools and Platform SDK 35
#   • ANDROID_HOME environment variable set
#
# Usage:
#   chmod +x build-android.sh
#   ./build-android.sh

set -e

echo "==> Building web assets..."
npm run build

echo "==> Syncing web assets into Android project..."
npx cap sync android

echo "==> Building debug APK via Gradle..."
cd android
./gradlew assembleDebug

APK_PATH="app/build/outputs/apk/debug/app-debug.apk"

if [ -f "$APK_PATH" ]; then
  echo ""
  echo "==> SUCCESS! APK ready at:"
  echo "    android/$APK_PATH"
  echo ""
  echo "Install on a connected Android device with:"
  echo "    adb install android/$APK_PATH"
else
  echo "Build completed but APK not found at expected path."
fi
