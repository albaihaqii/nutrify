#pragma once

#include <Arduino.h>

constexpr const char *FIRMWARE_VERSION = "0.1.0";

// Pins (ESP32 DevKit). GPIO 34 and 35 are ADC1, so they keep working while Wi-Fi is on.
constexpr uint8_t PIN_TEMPERATURE = 32;  // DS18B20
constexpr uint8_t PIN_PH = 34;           // PH-4502C
constexpr uint8_t PIN_TDS = 35;          // TDS Meter V1.0
constexpr uint8_t PIN_I2C_SDA = 21;      // LCD 16x2 with I2C module
constexpr uint8_t PIN_I2C_SCL = 22;

// Timing
constexpr uint32_t POST_INTERVAL_MS = 5000;
constexpr uint32_t WIFI_CONNECT_TIMEOUT_MS = 15000;
constexpr uint16_t HTTP_TIMEOUT_MS = 5000;
constexpr uint16_t LOOP_DELAY_MS = 200;

// ADC (12 bit, 0-3.3 V). The calibration below was measured with this conversion.
constexpr float ADC_VREF = 3.30f;
constexpr float ADC_MAX = 4095.0f;
constexpr uint8_t ADC_SAMPLES = 30;
constexpr uint8_t ADC_TRIM = 10;  // samples dropped at each end before averaging

// pH: two-segment calibration (buffers 4.01, 6.86, 9.18) and weight of the newest value.
constexpr float PH_BUFFER_ACID = 4.01f;
constexpr float PH_BUFFER_NEUTRAL = 6.86f;
constexpr float PH_BUFFER_BASE = 9.18f;
constexpr float PH_VOLTS_ACID = 3.1832f;
constexpr float PH_VOLTS_NEUTRAL = 2.4780f;
constexpr float PH_VOLTS_BASE = 2.0837f;
constexpr float PH_SMOOTHING = 0.40f;

// TDS: kValue fitted to a TDS pen reading 880 ppm (0.5 scale). EC (mS/cm) = ppm / 500.
constexpr float TDS_K_VALUE = 0.928f;
constexpr float TDS_AIR_VOLTS = 0.05f;  // below this the probe is treated as out of the water
constexpr float TDS_PPM_PER_MS_CM = 500.0f;
constexpr float TEMPERATURE_COEFFICIENT = 0.02f;
constexpr float REFERENCE_TEMPERATURE = 25.0f;