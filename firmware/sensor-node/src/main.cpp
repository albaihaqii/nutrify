#include <Arduino.h>
#include <DallasTemperature.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <WiFi.h>
#include <Wire.h>

#include <algorithm>

#include "config.h"
#include "secrets.h"

struct Reading {
  float temperature;
  bool temperatureOk;
  float ph;
  float phVolts;
  float tdsPpm;
  float tdsVolts;
  float ec;
};

OneWire oneWire(PIN_TEMPERATURE);
DallasTemperature temperatureSensor(&oneWire);

// ---------------------------------------------------------------------------
// LCD 16x2 through a PCF8574 I2C module (direct driver, no extra library)
// ---------------------------------------------------------------------------
constexpr uint8_t LCD_BACKLIGHT = 0x08;
constexpr uint8_t LCD_ENABLE = 0x04;
constexpr uint8_t LCD_MODE_COMMAND = 0x00;
constexpr uint8_t LCD_MODE_DATA = 0x01;

uint8_t lcdAddress = 0;
bool lcdReady = false;

void lcdWriteByte(uint8_t data) {
  Wire.beginTransmission(lcdAddress);
  Wire.write(data | LCD_BACKLIGHT);
  Wire.endTransmission();
}

void lcdPulse(uint8_t data) {
  lcdWriteByte(data | LCD_ENABLE);
  delayMicroseconds(1);
  lcdWriteByte(data & ~LCD_ENABLE);
  delayMicroseconds(50);
}

void lcdSend(uint8_t value, uint8_t mode) {
  lcdPulse((value & 0xF0) | mode);
  lcdPulse(((value << 4) & 0xF0) | mode);
}

void lcdCommand(uint8_t command) { lcdSend(command, LCD_MODE_COMMAND); }

void lcdPrint(const char *text) {
  while (*text) lcdSend(*text++, LCD_MODE_DATA);
}

void lcdSetCursor(uint8_t column, uint8_t row) {
  const uint8_t rowOffsets[] = {0x00, 0x40};
  lcdCommand(0x80 | (column + rowOffsets[row]));
}

void lcdInit() {
  delay(50);
  lcdWriteByte(0x00);
  delay(100);
  lcdPulse(0x30);
  delay(5);
  lcdPulse(0x30);
  delay(5);
  lcdPulse(0x30);
  delay(1);
  lcdPulse(0x20);
  delay(1);
  lcdCommand(0x28);  // 4-bit, 2 lines, 5x8 font
  lcdCommand(0x0C);  // display on, cursor off
  lcdCommand(0x06);  // auto-increment
  lcdCommand(0x01);  // clear
  delay(5);
}

bool lcdBegin() {
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL, 100000);
  delay(20);
  for (uint8_t address = 0x20; address <= 0x3F; address++) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0) {
      lcdAddress = address;
      lcdInit();
      Serial.printf("LCD found at 0x%02X (SDA=%d, SCL=%d)\n", lcdAddress, PIN_I2C_SDA,
                    PIN_I2C_SCL);
      return true;
    }
  }
  Serial.println("LCD not found, continuing without it");
  return false;
}

void lcdShow(const Reading &reading) {
  if (!lcdReady) return;

  char line1[17];
  char line2[17];
  if (reading.temperatureOk) {
    snprintf(line1, sizeof(line1), "pH:%4.2f T:%4.1fC ", reading.ph, reading.temperature);
  } else {
    snprintf(line1, sizeof(line1), "pH:%4.2f T:ERR   ", reading.ph);
  }
  snprintf(line2, sizeof(line2), "TDS:%-4.0f EC:%4.2f", reading.tdsPpm, reading.ec);

  lcdSetCursor(0, 0);
  lcdPrint(line1);
  lcdSetCursor(0, 1);
  lcdPrint(line2);
}

// ---------------------------------------------------------------------------
// Sensors
// ---------------------------------------------------------------------------
// Trimmed mean of ADC_SAMPLES readings: sort, drop ADC_TRIM at each end, average the rest.
float readAdcTrimmedMean(uint8_t pin) {
  int samples[ADC_SAMPLES];
  for (uint8_t i = 0; i < ADC_SAMPLES; i++) {
    samples[i] = analogRead(pin);
    delay(4);
  }
  std::sort(samples, samples + ADC_SAMPLES);

  long sum = 0;
  for (uint8_t i = ADC_TRIM; i < ADC_SAMPLES - ADC_TRIM; i++) sum += samples[i];
  return static_cast<float>(sum) / (ADC_SAMPLES - 2 * ADC_TRIM);
}

float adcToVolts(float adc) { return adc * (ADC_VREF / ADC_MAX); }

float phFromVolts(float volts) {
  float ph;
  if (volts >= PH_VOLTS_NEUTRAL) {
    const float slope = (PH_BUFFER_ACID - PH_BUFFER_NEUTRAL) / (PH_VOLTS_ACID - PH_VOLTS_NEUTRAL);
    ph = PH_BUFFER_NEUTRAL + slope * (volts - PH_VOLTS_NEUTRAL);
  } else {
    const float slope = (PH_BUFFER_BASE - PH_BUFFER_NEUTRAL) / (PH_VOLTS_BASE - PH_VOLTS_NEUTRAL);
    ph = PH_BUFFER_NEUTRAL + slope * (volts - PH_VOLTS_NEUTRAL);
  }
  return constrain(ph, 0.0f, 14.0f);
}

float readPh(float &volts) {
  static bool first = true;
  static float smoothed = 0.0f;

  volts = adcToVolts(readAdcTrimmedMean(PIN_PH));
  const float instant = phFromVolts(volts);
  smoothed = first ? instant : smoothed * (1.0f - PH_SMOOTHING) + instant * PH_SMOOTHING;
  first = false;
  return smoothed;
}

// DFRobot polynomial for the TDS Meter V1.0, with temperature compensation.
float tdsFromVolts(float volts, float temperature) {
  if (volts < TDS_AIR_VOLTS) return 0.0f;

  const float coefficient = 1.0f + TEMPERATURE_COEFFICIENT * (temperature - REFERENCE_TEMPERATURE);
  const float v = volts / coefficient;
  const float ppm = (133.42f * v * v * v - 255.86f * v * v + 857.39f * v) * 0.5f * TDS_K_VALUE;
  return max(ppm, 0.0f);
}

bool readTemperature(float &temperature) {
  temperatureSensor.requestTemperatures();
  temperature = temperatureSensor.getTempCByIndex(0);
  return temperature != DEVICE_DISCONNECTED_C && temperature > -50.0f && temperature < 85.0f;
}

Reading readSensors() {
  Reading reading{};
  reading.temperatureOk = readTemperature(reading.temperature);
  reading.ph = readPh(reading.phVolts);

  reading.tdsVolts = adcToVolts(readAdcTrimmedMean(PIN_TDS));
  // Without a valid temperature the compensation falls back to the 25 C reference.
  const float compensationTemperature =
      reading.temperatureOk ? reading.temperature : REFERENCE_TEMPERATURE;
  const float ppm = tdsFromVolts(reading.tdsVolts, compensationTemperature);

  // Round exactly as the server stores it (ec: 3 decimals, tds_ppm = round(ec x 500)),
  // so the LCD shows the same numbers as the dashboard.
  reading.ec = roundf(ppm / TDS_PPM_PER_MS_CM * 1000.0f) / 1000.0f;
  reading.tdsPpm = roundf(reading.ec * TDS_PPM_PER_MS_CM);
  return reading;
}

void printSerial(const Reading &reading) {
  Serial.print("Temp: ");
  if (reading.temperatureOk) {
    Serial.printf("%.1f C", reading.temperature);
  } else {
    Serial.print("ERR");
  }
  Serial.printf(" | pH: %.2f (%.3f V) | TDS: %.0f ppm (%.3f V) | EC: %.2f mS/cm\n", reading.ph,
                reading.phVolts, reading.tdsPpm, reading.tdsVolts, reading.ec);
}

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------
void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.persistent(false);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi");
  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_CONNECT_TIMEOUT_MS) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nWi-Fi connected, IP %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.printf("\nWi-Fi not connected yet (status %d), retrying in the background\n",
                  WiFi.status());
  }
}

// A failed post is not buffered: the next cycle sends fresh data.
void postReading(const Reading &reading) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("POST skipped: Wi-Fi is not connected");
    return;
  }

  char body[160];
  snprintf(body, sizeof(body),
           "{\"ph\":%.2f,\"ec\":%.3f,\"temperature\":%.1f,\"firmware_version\":\"%s\"}",
           reading.ph, reading.ec, reading.temperature, FIRMWARE_VERSION);

  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", DEVICE_API_KEY);

  const int status = http.POST(body);
  if (status > 0) {
    Serial.printf("POST -> HTTP %d\n", status);
  } else {
    Serial.printf("POST failed: %s\n", HTTPClient::errorToString(status).c_str());
  }
  http.end();
}

// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);

  analogReadResolution(12);
  analogSetPinAttenuation(PIN_PH, ADC_11db);
  analogSetPinAttenuation(PIN_TDS, ADC_11db);

  temperatureSensor.begin();
  lcdReady = lcdBegin();
  connectWifi();
}

void loop() {
  static uint32_t lastPostMs = 0;

  const Reading reading = readSensors();
  lcdShow(reading);
  printSerial(reading);

  if (millis() - lastPostMs >= POST_INTERVAL_MS) {
    if (reading.temperatureOk) {
      postReading(reading);
    } else {
      Serial.println("POST skipped: temperature sensor error");
    }
    lastPostMs = millis();
  }

  delay(LOOP_DELAY_MS);
}