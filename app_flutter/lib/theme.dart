import 'package:flutter/material.dart';

class AppTheme {
  static const _orange = Color(0xFFFF7A00);
  static const _bg = Color(0xFF0B0B0D);
  static const _surface = Color(0xFF141418);
  static const _text = Color(0xFFF3F3F3);
  static const _muted = Color(0xFFB9B9B9);

  static ThemeData dark() {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      colorScheme: base.colorScheme.copyWith(
        primary: _orange,
        secondary: _orange,
        surface: _surface,
        background: _bg,
      ),
      scaffoldBackgroundColor: _bg,
      appBarTheme: const AppBarTheme(
        backgroundColor: _bg,
        foregroundColor: _text,
        elevation: 0,
      ),
      cardTheme: CardTheme(
        color: _surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      textTheme: base.textTheme.apply(
        bodyColor: _text,
        displayColor: _text,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: _surface,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: _orange, width: 1.5),
        ),
        labelStyle: const TextStyle(color: _muted),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: _orange,
          foregroundColor: Colors.black,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
        ),
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: _surface,
        selectedColor: _orange.withOpacity(0.20),
        labelStyle: const TextStyle(color: _text),
        side: BorderSide(color: Colors.white.withOpacity(0.08)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      ),
    );
  }
}
