#include <Arduino.h>
#if defined(ESP8266)
  #include <ESP8266WiFi.h>
#endif
#include <Firebase_ESP_Client.h>
#include <IRremoteESP8266.h>
#include <IRsend.h>
#include <ir_Gree.h>
#include <ArduinoJson.h>
#include <EEPROM.h>

//Provide the token generation process info.
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// Konfigurasi
#define WIFI_SSID "Rumah Iky"
#define WIFI_PASSWORD "Ikky0407"
#define API_KEY "AIzaSyBA6_9N-MpkZ_kI6qC9L7tEC4EAZQRIrVo"
#define DATABASE_URL "latihan1-firebase-a0dfa-default-rtdb.asia-southeast1.firebasedatabase.app"

// Pin definitions
#define LED_BUILTIN 2
#define IR_LED 4

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
bool signupOK = false;

// AC object
IRGreeAC ac(IR_LED);

// Variabel untuk menyimpan state terakhir
bool lastPower = false;
int lastTemp = 25;
String lastMode = "cool";
int lastFanSpeed = 1;
bool lastSwing = false;

const uint8_t kGreeDefaultTemp = 25; // Default temperature

// Tambahkan variabel global untuk menyimpan UID
String previousUID = "";

void handleACControl(FirebaseJson &json) {
  FirebaseJsonData result;
  bool stateChanged = false;

  // Temperature harus diset pertama
  json.get(result, "temperature");
  if (result.success) {
    int newTemp = result.to<int>();
    if (newTemp != lastTemp && newTemp >= 16 && newTemp <= 30) {
      lastTemp = newTemp;
      ac.on();  // Pastikan AC on
      ac.setTemp(newTemp);
      stateChanged = true;
      Serial.println("Temperature set to: " + String(newTemp));
    }
  }

  // Power
  json.get(result, "power");
  if (result.success && result.to<bool>() != lastPower) {
    lastPower = result.to<bool>();
    if (lastPower) {
      ac.on();
      ac.setTemp(lastTemp);  // Set ulang temperature saat power on
    } else {
      ac.off();
    }
    stateChanged = true;
    Serial.println("Power: " + String(lastPower ? "ON" : "OFF"));
  }

  // Mode
  json.get(result, "mode");
  if (result.success && result.to<String>() != lastMode) {
    lastMode = result.to<String>();
    ac.on();  // Pastikan AC on
    
    if (lastMode == "cool") {
      ac.setMode(kGreeCool);
    }
    else if (lastMode == "heat") {
      ac.setMode(kGreeHeat);
    }
    else if (lastMode == "fan") {
      ac.setMode(kGreeFan);
    }
    else if (lastMode == "dry") {
      ac.setMode(kGreeDry);
    }
    else if (lastMode == "auto") {
      ac.setMode(kGreeAuto);
    }
    
    ac.setTemp(lastTemp);
    stateChanged = true;
    Serial.println("Mode: " + lastMode);
  }

  
  json.get(result, "fanSpeed");
  if (result.success && result.to<int>() != lastFanSpeed) {
    lastFanSpeed = result.to<int>();
    ac.on();  // Pastikan AC on
    
    // Map fan speed dari app (1-3) ke nilai yang sesuai
    switch(lastFanSpeed) {
      case 1:
        ac.setFan(kGreeFanMin);
        break;
      case 2:
        ac.setFan(kGreeFanMed);
        break;
      case 3:
        ac.setFan(kGreeFanMax);
        break;
      default:
        ac.setFan(kGreeFanAuto);
    }
    Serial.println("Fan Speed: " + String(lastFanSpeed));
    stateChanged = true;
  }

  // Swing
  json.get(result, "swing");
  if (result.success && result.to<bool>() != lastSwing) {
    lastSwing = result.to<bool>();
    ac.on();  // Pastikan AC on
    ac.setSwingVertical(lastSwing, kGreeSwingAuto);
    ac.setTemp(lastTemp);  // Set ulang temperature
    stateChanged = true;
    Serial.println("Swing: " + String(lastSwing ? "ON" : "OFF"));
  }

  // Kirim sinyal IR jika ada perubahan
  if (stateChanged) {
    delay(100);
    
    // Pastikan semua setting teraplikasi
    if (lastPower) {
      ac.on();
      ac.setTemp(lastTemp);
      
      // Set ulang fan speed
      switch(lastFanSpeed) {
        case 1:
          ac.setFan(kGreeFanMin);
          break;
        case 2:
          ac.setFan(kGreeFanMed);
          break;
        case 3:
          ac.setFan(kGreeFanMax);
          break;
      }
    } else {
      ac.off();
    }
    
    ac.send();
    blinkLED();
    Serial.println("IR signal sent!");
    printState();
  }
}

void printState() {
  Serial.println("GREE A/C remote is in the following state:");
  Serial.printf("  Power: %s\n", ac.getPower() ? "On" : "Off");
  Serial.printf("  Mode: %d\n", ac.getMode());
  Serial.printf("  Temp: %dC\n", ac.getTemp());
  
  Serial.printf("  Fan Speed: %d (", ac.getFan());
  switch(ac.getFan()) {
    case kGreeFanMin:
      Serial.print("Low");
      break;
    case kGreeFanMed:
      Serial.print("Medium");
      break;
    case kGreeFanMax:
      Serial.print("High");
      break;
    case kGreeFanAuto:
      Serial.print("Auto");
      break;
  }
  Serial.println(")");
  
  Serial.printf("  Swing: %s\n", ac.getSwingVerticalAuto() ? "Auto" : "Off");
  
  // Display the encoded IR sequence
  unsigned char* ir_code = ac.getRaw();
  Serial.print("IR Code: 0x");
  for (uint8_t i = 0; i < kGreeStateLength; i++)
    Serial.printf("%02X", ir_code[i]);
  Serial.println();
}

void blinkLED() {
  digitalWrite(LED_BUILTIN, LOW);
  delay(100);
  digitalWrite(LED_BUILTIN, HIGH);
}

void setup() {
  Serial.begin(115200);
  
  // Setup LED
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);
  
  // Setup WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    delay(300);
  }
  Serial.println("\nConnected with IP: " + WiFi.localIP().toString());

  // Initialize Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  // Baca UID sebelumnya dari EEPROM jika ada
  EEPROM.begin(512);
  char storedUID[37];  // UUID length + null terminator
  for (int i = 0; i < 36; i++) {
    storedUID[i] = char(EEPROM.read(i));
  }
  storedUID[36] = '\0';
  previousUID = String(storedUID);

  // Hapus akun anonim sebelumnya jika ada
  if (previousUID.length() > 0 && previousUID != "empty") {
    Serial.println("Menghapus akun anonim sebelumnya: " + previousUID);
    if (Firebase.deleteUser(&config, &auth, "")) {
      Serial.println("Akun anonim sebelumnya berhasil dihapus");
    } else {
      Serial.println("Gagal menghapus akun anonim sebelumnya");
    }
  }

  // Sign up anonymous
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("Firebase connection ok");
    signupOK = true;
    
    // Simpan UID baru ke EEPROM
    String newUID = auth.token.uid.c_str();
    for (unsigned int i = 0; i < newUID.length(); i++) {
      EEPROM.write(i, newUID[i]);
    }
    EEPROM.commit();
    Serial.println("UID baru disimpan: " + newUID);
  } else {
    Serial.printf("%s\n", config.signer.signupError.message.c_str());
  }

  config.token_status_callback = tokenStatusCallback;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  // Setup AC dengan konfigurasi default yang benar
  ac.begin();
  ac.on();
  ac.setMode(kGreeCool);
  ac.setTemp(25);  // Set temperature awal
  ac.setFan(1);
  ac.setSwingVertical(false, kGreeSwingAuto);
  ac.setXFan(false);
  ac.setLight(true);
  ac.setSleep(false);
  ac.setTurbo(false);
  
  // Kirim konfigurasi awal
  ac.send();
  Serial.println("Initial setup completed");
  printState();

  // Set up stream pada path ac_control
  if (!Firebase.RTDB.beginStream(&fbdo, "/ac_control")) {
    Serial.println("Couldn't begin stream");
    Serial.println("REASON: " + fbdo.errorReason());
  }
}

void loop() {
  if (Firebase.ready() && signupOK) {
    if (!Firebase.RTDB.readStream(&fbdo)) {
      Serial.println("Can't read stream data");
      Serial.println("REASON: " + fbdo.errorReason());
    }

    if (fbdo.streamTimeout()) {
      Serial.println("Stream timeout, resuming...");
    }

    if (fbdo.streamAvailable()) {
      FirebaseJson json;
      if (fbdo.dataType() == "json") {
        json.setJsonData(fbdo.stringData());
        handleACControl(json);
      }
    }
  }
  
  delay(100);
}