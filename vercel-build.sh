#!/usr/bin/env bash
set -euo pipefail

FLUTTER_VERSION="3.24.5"

if [ ! -d ".flutter" ]; then
  echo "Downloading Flutter SDK $FLUTTER_VERSION..."
  curl -L -o flutter.tar.xz "https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_${FLUTTER_VERSION}-stable.tar.xz"
  mkdir -p .flutter
  tar -xf flutter.tar.xz -C .flutter
fi

export PATH="$PWD/.flutter/flutter/bin:$PATH"

flutter --version

cd app_flutter
flutter pub get
flutter build web --release --pwa-strategy=offline-first
