#include <Arduino.h>
#if defined(ESP8266)
  #include <ESP8266WiFi.h>
#endif
#include <WiFiManager.h>
#include <Firebase_ESP_Client.h>
#include <IRremoteESP8266.h>
#include <IRsend.h>
// Menambahkan semua library merek AC
#include <ir_Gree.h>
#include <ir_Daikin.h>
#include <ir_Samsung.h>
#include <ir_Fujitsu.h>
#include <ir_Hitachi.h>
// Tambahkan library Panasonic yang benar
#include <ir_Panasonic.h>

#include <ArduinoJson.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <TimeLib.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Wire.h>
#include <DHT.h>

#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

static FirebaseJson fbJson;
static FirebaseJson fbConfigJson;

#define API_KEY "AIzaSyBA6_9N-MpkZ_kI6qC9L7tEC4EAZQRIrVo"
#define DATABASE_URL "latihan1-firebase-a0dfa-default-rtdb.asia-southeast1.firebasedatabase.app"

#define USER_EMAIL "rijki@gmail.com"
#define USER_PASSWORD "123456"

// Definisi Pin
#define LED_BUILTIN 2
#define IR_LED D6
#define DHTPIN D7
#define DHTTYPE DHT11
#define RESET_BUTTON_PIN D5

// WiFiManager variables
WiFiManager wifiManager;
unsigned long wifiConnectionStartTime = 0;
const unsigned long WIFI_TIMEOUT = 120000; // 2 menit dalam milliseconds
bool portalOpened = false;

// Button variables - simplified for instant reset
bool lastButtonState = HIGH;

// Konfigurasi waktu NTP yang lebih stabil dengan offset waktu Indonesia UTC+7 (25200 detik)
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 25200, 60000); // UTC+7 untuk WIB (25200 detik)

// Variabel untuk menangani waktu yang stabil
unsigned long lastTimeSync = 0;
const unsigned long TIME_SYNC_INTERVAL = 1800000; // 30 menit
time_t lastSyncedTime = 0;
bool timeInitialized = false;

// memformat waktu WIB dengan lebih stabil
String getFormattedTimeWIB() {
  char buffer[9]; // HH:MM:SS + null terminator
  
  // Gunakan waktu dari TimeLib yang lebih stabil
  if (timeInitialized) {
    time_t currentTime = now(); // Dari TimeLib
    sprintf(buffer, "%02d:%02d:%02d", hour(currentTime), minute(currentTime), second(currentTime));
    return String(buffer) + " WIB";
  } else {
    // Fallback ke timeClient jika belum diinisialisasi
    return timeClient.getFormattedTime() + " WIB";
  }
}

FirebaseData fbdo;
FirebaseData fbdoConfig; 
FirebaseAuth auth;
FirebaseConfig config;
bool firebaseReady = false;

// Menambahkan objek merek AC
IRGreeAC acGree(IR_LED);
IRDaikinESP acDaikin(IR_LED);
IRSamsungAc acSamsung(IR_LED);
IRFujitsuAC acFujitsu(IR_LED);
IRHitachiAc acHitachi(IR_LED);
// Ganti dengan kelas yang benar untuk Panasonic
IRPanasonicAc acPanasonic(IR_LED, kPanasonicNke);

String currentBrand = "gree"; 

bool lastPower = false;
int lastTemp = 25;
String lastMode = "cool";
int lastFanSpeed = 1;
bool lastSwing = false;
bool smartAC = false;  

String startTime = "";
String endTime = "";
bool scheduleEnabled = false;
unsigned long lastTimeCheck = 0;
const unsigned long SCHEDULE_TIME_CHECK_INTERVAL = 30000; 

const uint8_t kGreeDefaultTemp = 25;

bool resetSchedulePending = false;

#define DEVICE_ID "device01"
bool deviceInitialized = false;

bool parseTimeString(String timeStr, int &hours, int &minutes) {
  if (timeStr.length() < 5) return false;
  
  int colonPos = timeStr.indexOf(':');
  if (colonPos == -1) return false;
  
  hours = timeStr.substring(0, colonPos).toInt();
  minutes = timeStr.substring(colonPos + 1).toInt();
  
  return (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60);
}

// Fungsi untuk mendapatkan current hour untuk keperluan pemeriksaan jadwal
int getCurrentHour() {
  return timeInitialized ? hour(now()) : timeClient.getHours();
}

// Fungsi untuk mendapatkan current minute untuk keperluan pemeriksaan jadwal
int getCurrentMinute() {
  return timeInitialized ? minute(now()) : timeClient.getMinutes();
}

// Fungsi untuk mendapatkan epoch time yang stabil untuk timestamp
uint64_t getStableEpochTime() {
  return timeInitialized ? now() : timeClient.getEpochTime();
}

bool isTimeInSchedule() {
  ESP.wdtFeed();
  
  if (startTime.isEmpty() || endTime.isEmpty() || !scheduleEnabled) {
    Serial.println("Pemeriksaan jadwal dilewati: " + 
                  String(startTime.isEmpty() ? "Tidak ada waktu mulai" : 
                        endTime.isEmpty() ? "Tidak ada waktu akhir" : "Jadwal dinonaktifkan"));
    return false;
  }
  
  if (!timeInitialized) {
    Serial.println("Peringatan: Waktu belum diinisialisasi, melewati pemeriksaan jadwal");
    return false;
  }
  
  int startHour, startMinute;
  int endHour, endMinute;
  
  if (!parseTimeString(startTime, startHour, startMinute) || 
      !parseTimeString(endTime, endHour, endMinute)) {
    Serial.println("Gagal memparsing waktu jadwal");
    return false;
  }
  
  // Dapatkan waktu saat ini dengan metode yang lebih stabil
  int currentHour = getCurrentHour();
  int currentMinute = getCurrentMinute();
  
  if (currentHour < 0 || currentHour > 23 || currentMinute < 0 || currentMinute > 59) {
    Serial.println("Waktu saat ini dari NTP tidak valid");
    return false;
  }
  
  // Hitung total menit untuk perbandingan
  int currentTotalMinutes = currentHour * 60 + currentMinute;
  int startTotalMinutes = startHour * 60 + startMinute;
  int endTotalMinutes = endHour * 60 + endMinute;
  
  bool isInSchedule = false;
  
  // Perbandingan waktu
  if (endTotalMinutes < startTotalMinutes) {
    // Jadwal melewati tengah malam
    isInSchedule = (currentTotalMinutes >= startTotalMinutes || 
                   currentTotalMinutes <= endTotalMinutes);
  } else {
    // Jadwal normal dalam hari yang sama
    isInSchedule = (currentTotalMinutes >= startTotalMinutes && 
                   currentTotalMinutes <= endTotalMinutes);
  }
  
  // Selalu cetak perubahan status jadwal
  static bool lastScheduleState = false;
  if (isInSchedule != lastScheduleState) {
    Serial.println("\nStatus jadwal berubah pada " + getFormattedTimeWIB() + ":");
    Serial.println("  Dari: " + String(lastScheduleState ? "DALAM jadwal" : "LUAR jadwal"));
    Serial.println("  Ke: " + String(isInSchedule ? "DALAM jadwal" : "LUAR jadwal"));
    Serial.println("  Waktu saat ini: " + String(currentHour) + ":" + 
                  (currentMinute < 10 ? "0" : "") + String(currentMinute));
    Serial.println("  Waktu mulai: " + startTime);
    Serial.println("  Waktu akhir: " + endTime);
    lastScheduleState = isInSchedule;
  }
  
  return isInSchedule;
}

bool hasScheduleEnded() {
  if (!scheduleEnabled || !timeInitialized) {
    return false;
  }
  
  int startHour, startMinute, endHour, endMinute;
  if (!parseTimeString(endTime, endHour, endMinute) || 
      !parseTimeString(startTime, startHour, startMinute)) {
    Serial.println("ERROR: Format waktu tidak valid dalam jadwal");
    return false;
  }
  
  // Menggunakan fungsi pengganti untuk waktu yang stabil
  int currentHour = getCurrentHour();
  int currentMinute = getCurrentMinute();
  
  // Hitung total menit untuk perbandingan yang tepat
  int currentTotalMinutes = currentHour * 60 + currentMinute;
  int startTotalMinutes = startHour * 60 + startMinute;
  int endTotalMinutes = endHour * 60 + endMinute;
  
  // Deteksi akhir jadwal yang ditingkatkan dengan presisi 1 menit
  bool hasEnded = false;
  
  if (endTotalMinutes < startTotalMinutes) {
    // Jadwal semalam (melewati tengah malam)
    hasEnded = (currentTotalMinutes >= endTotalMinutes && 
                currentTotalMinutes < startTotalMinutes);
  } else {
    // Jadwal hari yang sama
    hasEnded = (currentTotalMinutes >= endTotalMinutes);
  }
  
  if (hasEnded) {
    Serial.println("AKHIR JADWAL TERDETEKSI pada " + getFormattedTimeWIB());
    Serial.println("Waktu saat ini: " + String(currentHour) + ":" + 
                  (currentMinute < 10 ? "0" : "") + String(currentMinute));
    Serial.println("Waktu akhir: " + endTime);
  }
  
  return hasEnded;
}

void applySchedule() {
  if (!scheduleEnabled || !timeInitialized) {
    return;
  }
  
  bool shouldBeOn = isTimeInSchedule();
  bool scheduleEnded = hasScheduleEnded() && lastPower;
  static bool lastScheduleCheck = false;
  
  if (scheduleEnded) {
    Serial.println("PENTING: Jadwal telah berakhir - mematikan AC sekarang");
    
    // Matikan AC dan SmartAC
    lastPower = false;
    
    if (smartAC) {
      Serial.println("Jadwal berakhir - juga mematikan SmartAC");
      smartAC = false;
    }
    
    // Terapkan pengaturan
    applyACSettings();
    
    // Perbarui Firebase dengan timestamp yang stabil
    FirebaseJson json;
    json.set("power", false);
    json.set("smartAC", false);
    json.set("timestamp", (uint64_t)getStableEpochTime());
    
    String controlPath = "devices/" + String(DEVICE_ID) + "/ac_control";
    if (Firebase.RTDB.updateNode(&fbdoConfig, controlPath, &json)) {
      Serial.println("Firebase diperbarui - AC dan SmartAC dimatikan karena akhir jadwal");
      resetSchedulePending = true;
    } else {
      Serial.println("Gagal memperbarui Firebase: " + fbdoConfig.errorReason());
    }
    
    return;
  }
  
  // Hanya proses jika status jadwal telah berubah
  if (shouldBeOn != lastScheduleCheck) {
    Serial.println("Perubahan status jadwal terdeteksi:");
    Serial.println("  Sebelumnya: " + String(lastScheduleCheck ? "ON" : "OFF"));
    Serial.println("  Saat ini: " + String(shouldBeOn ? "ON" : "OFF"));
    
    if (shouldBeOn && !lastPower) {
      // Nyalakan
      lastPower = true;
      
      // Ketika jadwal menyalakan AC, pastikan SmartAC tetap OFF
      smartAC = false;
      
      applyACSettings();
      
      // Perbarui Firebase
      FirebaseJson json;
      json.set("power", lastPower);
      json.set("smartAC", false); 
      json.set("timestamp", (uint64_t)timeClient.getEpochTime());
      String controlPath = "devices/" + String(DEVICE_ID) + "/ac_control";
      Firebase.RTDB.updateNode(&fbdoConfig, controlPath, &json);
      
      Serial.println("Jadwal menyalakan AC - SmartAC secara eksplisit tetap OFF");
    }
    else if (!shouldBeOn && lastPower) {
      // Matikan
      lastPower = false;
      
      // matikan SmartAC
      if (smartAC) {
        Serial.println("Jadwal berakhir - juga mematikan SmartAC");
        smartAC = false;
      }
      
      applyACSettings();
      // Perbarui Firebase
      FirebaseJson json;
      json.set("power", lastPower);
      json.set("smartAC", smartAC);
      json.set("timestamp", (uint64_t)timeClient.getEpochTime());
      String controlPath = "devices/" + String(DEVICE_ID) + "/ac_control";
      Firebase.RTDB.updateNode(&fbdoConfig, controlPath, &json);
    }
    
    lastScheduleCheck = shouldBeOn;
  }
}

void checkScheduleSettings() {
  if (Firebase.ready()) {
    bool settingsChanged = false;
    bool timeChanged = false;
    String basePath = "devices/" + String(DEVICE_ID) + "/ac_control/";
    
    // Periksa startTime
    if (Firebase.RTDB.getString(&fbdoConfig, basePath + "startTime")) {
      String newStartTime = fbdoConfig.stringData();
      if (newStartTime != startTime) {
        startTime = newStartTime;
        settingsChanged = true;
        timeChanged = true;
      }
    }
    
    // Periksa endTime
    if (Firebase.RTDB.getString(&fbdoConfig, basePath + "endTime")) {
      String newEndTime = fbdoConfig.stringData();
      if (newEndTime != endTime) {
        endTime = newEndTime;
        settingsChanged = true;
        timeChanged = true;
      }
    }
    
    // Periksa apakah jadwal diaktifkan
    if (Firebase.RTDB.getBool(&fbdoConfig, basePath + "scheduleEnabled")) {
      bool newScheduleEnabled = fbdoConfig.boolData();
      if (newScheduleEnabled != scheduleEnabled) {
        scheduleEnabled = newScheduleEnabled;
        updateDisplayState("schedule", "");  // Nilai kosong akan memicu formatScheduleDisplay
        settingsChanged = true;
      }
    }

    if (timeChanged) {
      updateDisplayState("schedule", "");
    }
    
    // Hanya cetak jika pengaturan berubah
    if (settingsChanged) {
      Serial.println("Pengaturan jadwal diperbarui:");
      Serial.println("  Diaktifkan: " + String(scheduleEnabled ? "YA" : "TIDAK"));
      Serial.println("  Waktu mulai: " + startTime);
      Serial.println("  Waktu akhir: " + endTime);
    }
  }
}


void resetScheduleSettings() {
  if (!resetSchedulePending) return;
  
  Serial.println("Mengatur ulang pengaturan jadwal...");
  
  startTime = "00:00";
  endTime = "00:00";
  scheduleEnabled = false;
  resetSchedulePending = false;
  smartAC = false; // Selalu pastikan SmartAC mati selama reset
  
  FirebaseJson json;
  json.set("startTime", "00:00");  
  json.set("endTime", "00:00");  
  json.set("scheduleEnabled", false);
  json.set("smartAC", false);
  
  Serial.println("SmartAC dimatikan sebagai bagian dari reset jadwal");
  
  for (int retry = 0; retry < 3; retry++) {
    String controlPath = "devices/" + String(DEVICE_ID) + "/ac_control";
    if (Firebase.RTDB.updateNode(&fbdoConfig, controlPath, &json)) {
      Serial.println("Reset jadwal di Firebase berhasil");
      return;
    }
    
    Serial.println("Gagal mengatur ulang jadwal: " + fbdoConfig.errorReason());
    Serial.println("Retry " + String(retry + 1) + "/3");
    delay(500);
  }

  Serial.println("Gagal mengatur ulang jadwal setelah beberapa kali percobaan. Akan mencoba lagi nanti.");
  resetSchedulePending = true;
}

// Optimalkan fungsi handleACControl untuk menghindari kode yang berlebihan
void handleACControl(FirebaseJson &json) {
  FirebaseJsonData result;
  bool stateChanged = false;

  // Periksa perubahan merek terlebih dahulu
  json.get(result, "selectedBrand");
  if (result.success && result.to<String>() != currentBrand) {
    currentBrand = result.to<String>();
    Serial.println("Merek berubah menjadi: " + currentBrand);
    stateChanged = true;
  }

  json.get(result, "power");
  if (result.success && result.to<bool>() != lastPower) {
    lastPower = result.to<bool>();
    updateDisplayState("power", lastPower ? "ON" : "OFF");
  
    // Jika daya dimatikan, juga matikan SmartAC
    if (!lastPower && smartAC) {
      Serial.println("Daya dimatikan - secara otomatis menonaktifkan SmartAC");
      smartAC = false;

      FirebaseJson updateJson;
      updateJson.set("smartAC", false);
      String controlPath = "devices/" + String(DEVICE_ID) + "/ac_control";
      Firebase.RTDB.updateNode(&fbdoConfig, controlPath, &updateJson);
    }
    
    stateChanged = true;
    Serial.println("Daya: " + String(lastPower ? "ON" : "OFF"));
  }

  // Validasi dan pengaturan suhu
  json.get(result, "temperature");
  if (result.success) {
    int newTemp = result.to<int>();
    if (newTemp != lastTemp && newTemp >= 16 && newTemp <= 30) {
      lastTemp = newTemp;
      updateDisplayState("temp", String(newTemp) + "C");
      stateChanged = true;
      Serial.println("Suhu diatur ke: " + String(newTemp));
    } else if (newTemp < 16 || newTemp > 30) {
      Serial.println("Nilai suhu tidak valid: " + String(newTemp) + " (harus 16-30)");
    }
  }

  // Validasi dan pengaturan mode
  json.get(result, "mode");
  if (result.success) {
    String newMode = result.to<String>();
    if (newMode != lastMode && 
        (newMode == "cool" || newMode == "heat" || newMode == "fan" || 
         newMode == "dry" || newMode == "auto")) {
      lastMode = newMode;
      updateDisplayState("mode", lastMode.substring(0,4));
      stateChanged = true;
      Serial.println("Mode: " + lastMode);
    } else if (newMode != lastMode) {
      Serial.println("Nilai mode tidak valid: " + newMode);
    }
  }

  // Validasi dan pengaturan kecepatan kipas
  json.get(result, "fanSpeed");
  if (result.success) {
    int newFanSpeed = result.to<int>();
    if (newFanSpeed != lastFanSpeed && newFanSpeed >= 1 && newFanSpeed <= 3) {
      lastFanSpeed = newFanSpeed;
      updateDisplayState("fan", "F" + String(lastFanSpeed));
      stateChanged = true;
      Serial.println("Kecepatan Kipas: " + String(newFanSpeed));
    } else if (newFanSpeed < 1 || newFanSpeed > 3) {
      Serial.println("Nilai kecepatan kipas tidak valid: " + String(newFanSpeed) + " (harus 1-3)");
    }
  }

  // Pengaturan Swing
  json.get(result, "swing");
  if (result.success && result.to<bool>() != lastSwing) {
    lastSwing = result.to<bool>();
    stateChanged = true;
    Serial.println("Swing: " + String(lastSwing ? "ON" : "OFF"));
  }


  json.get(result, "smartAC");
  if (result.success) {
    bool newSmartAC = result.to<bool>();
    

    bool isScheduleOn = scheduleEnabled && isTimeInSchedule();
    
    if (isScheduleOn && newSmartAC) {

      smartAC = false;

      FirebaseJson updateJson;
      updateJson.set("smartAC", false);
      String controlPath = "devices/" + String(DEVICE_ID) + "/ac_control";
      Firebase.RTDB.updateNode(&fbdoConfig, controlPath, &updateJson);
    }
    // Hanya izinkan SmartAC untuk ON jika daya juga ON dan tidak dalam jadwal
    else if (!lastPower && newSmartAC) {

      smartAC = false;

      FirebaseJson updateJson;
      updateJson.set("smartAC", false);
      String controlPath = "devices/" + String(DEVICE_ID) + "/ac_control";
      Firebase.RTDB.updateNode(&fbdoConfig, controlPath, &updateJson);
    } else if (newSmartAC != smartAC) {
      smartAC = newSmartAC;
      Serial.println("SmartAC: " + String(smartAC ? "ON" : "OFF"));
    }
  }

  if (stateChanged) {
    applyACSettings();
  }
}

void applyACSettings() {
  delay(250); 

  if (currentBrand == "gree") {
    acGree.begin();
    acGree.setFan(convertFanSpeed("gree", lastFanSpeed));
    acGree.setMode(convertMode("gree", lastMode));
    acGree.setTemp(lastTemp);
  }
  else if (currentBrand == "daikin") {
    acDaikin.begin(); 
    acDaikin.setFan(convertFanSpeed("daikin", lastFanSpeed));
    acDaikin.setMode(convertMode("daikin", lastMode));
    acDaikin.setTemp(lastTemp);
  }
  else if (currentBrand == "samsung") {
    acSamsung.begin();
    acSamsung.setFan(convertFanSpeed("samsung", lastFanSpeed));
    acSamsung.setMode(convertMode("samsung", lastMode));
    acSamsung.setTemp(lastTemp);
  }
  else if (currentBrand == "fujitsu"){
    acFujitsu.begin();
    // Fix Fujitsu fan control by using stepFan() method
    acFujitsu.setFanSpeed(lastFanSpeed);
    acFujitsu.setMode(convertMode("fujitsu", lastMode));
    acFujitsu.setTemp(lastTemp);
  }
  else if (currentBrand == "hitachi"){
    acHitachi.begin();
    acHitachi.setFan(convertFanSpeed("hitachi",lastFanSpeed));
    acHitachi.setMode(convertMode("hitachi", lastMode));
    acHitachi.setTemp(lastTemp);
  }
  else if (currentBrand == "panasonic"){
    acPanasonic.begin();
    acPanasonic.setFan(convertFanSpeed("panasonic",lastFanSpeed));
    acPanasonic.setMode(convertMode("panasonic", lastMode));
    acPanasonic.setTemp(lastTemp);
  }
  
  if (lastPower) {
    if (currentBrand == "gree") {
      acGree.on();
      acGree.setSwingVertical(lastSwing, kGreeSwingAuto);
      acGree.send();
    }
    else if (currentBrand == "daikin") {
      acDaikin.on();
      acDaikin.setSwingVertical(lastSwing);
      acDaikin.send();
    }
    else if (currentBrand == "samsung") {
      acSamsung.on();
      acSamsung.setSwing(lastSwing);
      acSamsung.send();
      Serial.println("Mengirim perintah Samsung");
    }
    else if (currentBrand == "fujitsu"){
      acFujitsu.on();
      // Fix Fujitsu swing control
      acFujitsu.setSwing(lastSwing ? kFujitsuAcSwingVert : kFujitsuAcSwingOff);
      acFujitsu.send();
      Serial.println("Mengirim perintah Fujitsu");
    }
    else if (currentBrand == "hitachi"){
      acHitachi.on();
      // Fix Hitachi swing implementation - it uses setSwingVertical instead of setSwing
      acHitachi.setSwingVertical(lastSwing);
      acHitachi.send();
      Serial.println("Mengirim perintah Hitachi");
    }
    else if (currentBrand == "panasonic"){
      acPanasonic.on();
      // Fix Panasonic swing constants
      acPanasonic.setSwingVertical(lastSwing ? kPanasonicAcSwingVAuto : kPanasonicAcSwingVLow);
      acPanasonic.send();
      Serial.println("Mengirim perintah Panasonic");
    }
    // Tambahkan
  } else {
    if (currentBrand == "gree") {
      acGree.off();
      acGree.send();
    }
    else if (currentBrand == "daikin") {
      acDaikin.off();
      acDaikin.send();
    }
    else if (currentBrand == "samsung") {
      acSamsung.off();
      acSamsung.send();
    }
    else if (currentBrand == "fujitsu"){
      acFujitsu.off();
      acFujitsu.send();
    }
    else if (currentBrand == "hitachi"){
      acHitachi.off();
      acHitachi.send();
    }
    else if (currentBrand == "panasonic"){
      acPanasonic.off();
      acPanasonic.send();
    }
    // Tambahkan
  }
  
  blinkLED();
  Serial.println("Sinyal IR dikirim untuk merek: " + currentBrand);
  printState();
}

// Fungsi untuk menginisialisasi semua objek AC
void initializeACs() {
  // Gree
  acGree.begin();
  acGree.setFan(kGreeFanAuto);
  acGree.setMode(kGreeCool);
  acGree.setTemp(25);
  
  // Daikin
  acDaikin.begin();
  acDaikin.setFan(kDaikinFanAuto);
  acDaikin.setMode(kDaikinCool);
  acDaikin.setTemp(25);

  acSamsung.begin();
  acSamsung.setFan(kSamsungAcFanAuto);
  acSamsung.setMode(kSamsungAcCool);
  acSamsung.setTemp(25);

  acFujitsu.begin();
  // Remove setCmd and use proper fan speed setting
  acFujitsu.setFanSpeed(kFujitsuAcFanHigh);
  acFujitsu.setMode(kFujitsuAcModeCool);
  acFujitsu.setTemp(25);

  acHitachi.begin();
  acHitachi.setFan(kHitachiAcFanAuto);
  acHitachi.setMode(kHitachiAcCool);
  acHitachi.setTemp(25);

  acPanasonic.begin();
  acPanasonic.setFan(kPanasonicAcFanAuto);
  acPanasonic.setMode(kPanasonicAcCool);
  acPanasonic.setTemp(25);
  // ...
}

// Konversi mode umum ke mode khusus merek
int convertMode(String brand, String genericMode) {
  if (brand == "gree") {
    if (genericMode == "cool") return kGreeCool;
    if (genericMode == "heat") return kGreeHeat;
    if (genericMode == "fan") return kGreeFan;
    if (genericMode == "dry") return kGreeDry;
    if (genericMode == "auto") return kGreeAuto;
  }
  else if (brand == "daikin") {
    if (genericMode == "cool") return kDaikinCool;     
    if (genericMode == "heat") return kDaikinHeat;    
    if (genericMode == "fan") return kDaikinFan;      
    if (genericMode == "dry") return kDaikinDry;      
    if (genericMode == "auto") return kDaikinAuto;      
  }
  else if (brand == "samsung") {
    if (genericMode == "cool") return kSamsungAcCool;
    if (genericMode == "heat") return kSamsungAcHeat;
    if (genericMode == "fan") return kSamsungAcFan;
    if (genericMode == "dry") return kSamsungAcDry;
    if (genericMode == "auto") return kSamsungAcAuto;
  }
  else if (brand == "fujitsu") {
    if (genericMode == "cool") return kFujitsuAcModeCool;
    if (genericMode == "heat") return kFujitsuAcModeHeat;
    if (genericMode == "fan") return kFujitsuAcModeFan;
    if (genericMode == "dry") return kFujitsuAcModeDry;
    if (genericMode == "auto") return kFujitsuAcModeAuto;
  }
  else if (brand == "hitachi") {
    if (genericMode == "cool") return kHitachiAcCool;
    if (genericMode == "heat") return kHitachiAcHeat;
    if (genericMode == "fan") return kHitachiAcFan;
    if (genericMode == "dry") return kHitachiAcDry;
    if (genericMode == "auto") return kHitachiAcAuto;
  }
  else if (brand == "panasonic") {
    if (genericMode == "cool") return kPanasonicAcCool;
    if (genericMode == "heat") return kPanasonicAcHeat;
    if (genericMode == "fan") return kPanasonicAcFan;
    if (genericMode == "dry") return kPanasonicAcDry;
    if (genericMode == "auto") return kPanasonicAcAuto;
  }
  // Tambahkan
  return -1; 
}

// Konversi kecepatan kipas umum ke kecepatan kipas khusus merek
int convertFanSpeed(String brand, int genericSpeed) {
  if (brand == "gree") {
    switch(genericSpeed) {
      case 1: return kGreeFanMin;
      case 2: return kGreeFanMed;
      case 3: return kGreeFanMax;
      default: return kGreeFanAuto;
    }
  }
  else if (brand == "daikin") {
    switch(genericSpeed) {
      case 1: return kDaikinFanMin;  
      case 2: return kDaikinFanMed;    
      case 3: return kDaikinFanMax;    
      default: return kDaikinFanAuto;  
    }
  }
  else if (brand == "samsung") {
    switch(genericSpeed) {
      case 1: return kSamsungAcFanLow;
      case 2: return kSamsungAcFanMed;
      case 3: return kSamsungAcFanHigh;
      default: return kSamsungAcFanAuto;
    }
  }
  else if (brand == "fujitsu") {
    switch(genericSpeed) {
      case 1: return kFujitsuAcFanHigh; // Sesuaikan dengan level yang benar
      case 2: return kFujitsuAcFanMed;
      case 3: return kFujitsuAcFanHigh;
      default: return kFujitsuAcFanAuto;
    }
  }
  else if (brand == "hitachi") {
    switch(genericSpeed) {
      case 1: return kHitachiAcFanLow;
      case 2: return kHitachiAcFanMed;
      case 3: return kHitachiAcFanHigh;
      default: return kHitachiAcFanAuto;
    }
  }
  else if (brand == "panasonic") {
    switch(genericSpeed) {
      case 1: return kPanasonicAcFanMin;
      case 2: return kPanasonicAcFanMed;
      case 3: return kPanasonicAcFanMax;
      default: return kPanasonicAcFanAuto;
    }
  }
  // Tambahkan 
  return -1; 
}

void printState() {
  Serial.println("Status remote AC untuk merek: " + currentBrand);
  Serial.printf("  Daya: %s\n", lastPower ? "On" : "Off");
  Serial.printf("  Mode: %s\n", lastMode.c_str());
  Serial.printf("  Suhu: %dC\n", lastTemp);
  Serial.printf("  Kecepatan Kipas: %d\n", lastFanSpeed);
  Serial.printf("  Swing: %s\n", lastSwing ? "On" : "Off");
}

void blinkLED() {
  digitalWrite(LED_BUILTIN, LOW);
  delay(100);
  digitalWrite(LED_BUILTIN, HIGH);
}

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

unsigned long lastDisplayUpdate = 0;

unsigned long lastStateChange = 0;
const long STATE_CHANGE_DURATION = 3000;
String currentDisplayState = "temp"; // Status default
String lastChangedValue = "";

bool showTemperature = true; // Mulai dengan tampilan suhu
unsigned long lastDisplayToggle = 0;
const long DISPLAY_TOGGLE_INTERVAL = 10000; // Bergantian antara suhu/kelembaban setiap 10 detik

DHT dht(DHTPIN, DHTTYPE);
float currentTemp = 0;
float currentHumidity = 0; 
unsigned long lastTempHumidityUpload = 0;
const long TEMP_READ_INTERVAL = 5000; 
const long TEMP_HUMIDITY_UPLOAD_INTERVAL = 180000; // Perbarui Firebase setiap 3 menit

void formatScheduleDisplay() {
  display.clearDisplay();
  display.setRotation(2);
  display.setTextColor(SSD1306_WHITE);
  
  display.setTextSize(1);
  display.setCursor(0,0);
  display.println(getFormattedTimeWIB());
  
  display.setTextSize(1);
  display.setCursor(40, 12);
  display.print("JADWAL");
  
  display.setTextSize(3);
  String status = scheduleEnabled ? "ON" : "OFF";
  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds(status, 0, 0, &x1, &y1, &w, &h);
  display.setCursor((SCREEN_WIDTH - w) / 2, 24);
  display.print(status);
  
  if (scheduleEnabled && !startTime.isEmpty() && !endTime.isEmpty()) {
    display.setTextSize(1);
    String timeStr = startTime + "-" + endTime;
    display.getTextBounds(timeStr, 0, 0, &x1, &y1, &w, &h);
    display.setCursor((SCREEN_WIDTH - w) / 2, 52);
    display.print(timeStr);
  }
  
  display.display();
}

void formatPowerDisplay() {
  display.clearDisplay();
  display.setRotation(2);  
  display.setTextColor(SSD1306_WHITE);
  
  display.setTextSize(1);
  display.setCursor(0,0);
  display.println(getFormattedTimeWIB());
  
  display.setTextSize(1);
  display.setCursor(45, 16);
  display.print("DAYA");
  
  display.setTextSize(4);
  String status = lastPower ? "ON" : "OFF";
  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds(status, 0, 0, &x1, &y1, &w, &h);
  display.setCursor((SCREEN_WIDTH - w) / 2, 32);
  display.print(status);
  
  display.display();
}


void formatHumidityDisplay(float humidity) {
  display.clearDisplay();
  display.setRotation(2); 
  display.setTextColor(SSD1306_WHITE);
  
  display.setTextSize(1);
  display.setCursor(0,0);
  display.println(getFormattedTimeWIB());
  
 
  display.setTextSize(4);
  String humStr = String(humidity, 1) + "%";
  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds(humStr, 0, 0, &x1, &y1, &w, &h);
  display.setCursor((SCREEN_WIDTH - w) / 2, (SCREEN_HEIGHT - h) / 2);
  display.print(humStr);
  display.display();
}

void updateOLEDDisplay() {
  unsigned long currentMillis = millis();
  
  static String lastDisplayedTemp;
  static String lastDisplayedHumidity;
  static String lastDisplayedTime;
  static String lastStateChangeVal;
  static String lastDisplayState;
  
  String currentTimeStr = getFormattedTimeWIB();
  String currentTempStr = String(currentTemp, 1);
  String currentHumStr = String(currentHumidity, 1);
  
  if (currentMillis - lastDisplayToggle >= DISPLAY_TOGGLE_INTERVAL) {
    showTemperature = !showTemperature;
    lastDisplayToggle = currentMillis;
  }
  
  if (currentMillis - lastStateChange < STATE_CHANGE_DURATION) {
    if (currentDisplayState != lastDisplayState || lastChangedValue != lastStateChangeVal || lastDisplayedTime != currentTimeStr) {
      lastDisplayState = currentDisplayState;
      lastStateChangeVal = lastChangedValue;
      lastDisplayedTime = currentTimeStr;
      
      if (currentDisplayState == "schedule") {
        formatScheduleDisplay();
      }
      else if (currentDisplayState == "power") {
        formatPowerDisplay();
      }
      else {
        display.clearDisplay();
        display.setRotation(2);  
        display.setTextColor(SSD1306_WHITE);
        

        display.setTextSize(1);
        display.setCursor(0,0);
        display.println(currentTimeStr);
        
        display.setTextSize(4);
        int16_t x1, y1;
        uint16_t w, h;
        display.getTextBounds(lastChangedValue, 0, 0, &x1, &y1, &w, &h);
        display.setCursor((SCREEN_WIDTH - w) / 2, (SCREEN_HEIGHT - h) / 2);
        display.print(lastChangedValue);
        display.display();
      }
    }
  } else {
    bool shouldUpdate = false;
    
    if (showTemperature && (currentTempStr != lastDisplayedTemp || currentTimeStr != lastDisplayedTime)) {
      shouldUpdate = true;
      lastDisplayedTemp = currentTempStr;
      lastDisplayedTime = currentTimeStr;
    } else if (!showTemperature && (currentHumStr != lastDisplayedHumidity || currentTimeStr != lastDisplayedTime)) {
      shouldUpdate = true;
      lastDisplayedHumidity = currentHumStr;
      lastDisplayedTime = currentTimeStr;
    }
    
    if (shouldUpdate) {
      if (showTemperature) {
        display.clearDisplay();
        display.setRotation(2);
        display.setTextColor(SSD1306_WHITE);
        
        display.setTextSize(1);
        display.setCursor(0,0);
        display.println(currentTimeStr);

        display.setTextSize(4);
        String tempStr = currentTempStr + "C";
        int16_t x1, y1;
        uint16_t w, h;
        display.getTextBounds(tempStr, 0, 0, &x1, &y1, &w, &h);
        display.setCursor((SCREEN_WIDTH - w) / 2, (SCREEN_HEIGHT - h) / 2);
        display.print(tempStr);
        display.display();
      } else {
        formatHumidityDisplay(currentHumidity);
      }
    }
  }
}

void updateDisplayState(String state, String value) {
  lastStateChange = millis();
  currentDisplayState = state;
  lastChangedValue = value;
}

void sendTempHumidityToFirebase() {
  if (!Firebase.ready() || !firebaseReady) {
    Serial.println("Firebase tidak siap, melewati pembaruan suhu/kelembaban");
    return;
  }
  
  if (isnan(currentTemp) || isnan(currentHumidity)) {
    Serial.println("Pembacaan suhu atau kelembaban tidak valid, melewati unggahan");
    return;
  }
  
  fbConfigJson.clear();
  fbConfigJson.set("temperature", roundf(currentTemp * 10) / 10);
  fbConfigJson.set("humidity", roundf(currentHumidity * 10) / 10);
  
  uint64_t utcTimestamp = getStableEpochTime();
  fbConfigJson.set("timestamp", utcTimestamp);
  
  // Cetak debug
  Serial.println("Mengirim data dengan timestamp:");
  Serial.println("  Lokal (WIB): " + getFormattedTimeWIB());
  Serial.println("  UTC timestamp: " + String(utcTimestamp));
  
  String sensorPath = "devices/" + String(DEVICE_ID) + "/sensor_data";
  if (Firebase.RTDB.updateNode(&fbdoConfig, sensorPath, &fbConfigJson)) {
    Serial.println("Data diperbarui dengan sukses");
  } else {
    Serial.println("Gagal memperbarui data: " + fbdoConfig.errorReason());
    delay(500);
    if (Firebase.RTDB.updateNode(&fbdoConfig, sensorPath, &fbConfigJson)) {
      Serial.println("Data diperbarui pada percobaan ulang");
    }
  }
}

void initializeDeviceStructure() {
  if (!Firebase.ready()) return;

  FirebaseJson deviceJson;
  deviceJson.set("ac_control/endTime", "00:00");
  deviceJson.set("ac_control/fanSpeed", 2);
  deviceJson.set("ac_control/mode", "cool");
  deviceJson.set("ac_control/power", true);
  deviceJson.set("ac_control/scheduleEnabled", false);
  deviceJson.set("ac_control/selectedBrand", "gree");
  deviceJson.set("ac_control/smartAC", false);
  deviceJson.set("ac_control/startTime", "00:00");
  deviceJson.set("ac_control/swing", false);
  deviceJson.set("ac_control/temperature", 25);
  deviceJson.set("ac_control/timestamp", 0);
  deviceJson.set("sensor_data/humidity", 0);
  deviceJson.set("sensor_data/temperature", 0);
  deviceJson.set("sensor_data/timestamp", 0);

  String devicePath = "devices/" + String(DEVICE_ID);
  
  if (!Firebase.RTDB.getJSON(&fbdoConfig, devicePath)) {
    // Device structure doesn't exist, create it
    if (Firebase.RTDB.setJSON(&fbdoConfig, devicePath, &deviceJson)) {
      Serial.println("Device structure initialized successfully");
    } else {
      Serial.println("Failed to initialize device structure: " + fbdoConfig.errorReason());
    }
  }
}

// Fungsi untuk sinkronisasi waktu dengan NTP dan simpan ke TimeLib
bool syncTimeFromNTP() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Tidak dapat sinkronisasi waktu: WiFi tidak terhubung");
    return false;
  }
  
  Serial.print("Sinkronisasi waktu NTP...");
  
  // Paksa update NTP
  bool updateSuccess = timeClient.forceUpdate();
  if (!updateSuccess) {
    Serial.println("gagal!");
    return false;
  }
  
  // Dapatkan waktu epoch dari NTP dan atur ke TimeLib
  time_t ntpTime = timeClient.getEpochTime();
  setTime(ntpTime);
  lastSyncedTime = ntpTime;
  timeInitialized = true;
  
  Serial.println("berhasil!");
  Serial.print("Waktu saat ini (WIB): ");
  Serial.println(getFormattedTimeWIB());
  
  return true;
}

void setupWiFiManager() {
  // Set button pin as input with pullup
  pinMode(RESET_BUTTON_PIN, INPUT_PULLUP);
  
  // WiFiManager setup
  wifiManager.setDebugOutput(true);
  wifiManager.setAPStaticIPConfig(IPAddress(192,168,1,1), IPAddress(192,168,1,1), IPAddress(255,255,255,0));
  wifiManager.setConfigPortalTimeout(300); // 5 menit portal timeout
  
  Serial.println("WiFiManager initialized");
}

void checkResetButton() {
  bool currentButtonState = digitalRead(RESET_BUTTON_PIN);
  
  if (currentButtonState == LOW && lastButtonState == HIGH) {
    Serial.println("Reset button pressed - Restarting ESP...");
    
    display.setRotation(2);
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(2);
    display.setCursor(0,0);
    display.println("RESTART");
    display.setTextSize(1);
    display.println("");
    display.println("Tombol reset ditekan");
    display.println("Sistem akan restart");
    display.println("dalam 3 detik...");
    display.display();
    
    delay(3000);
    ESP.restart();
  }
  
  lastButtonState = currentButtonState;
}

void setup() {
  Serial.begin(115200);

  ESP.wdtDisable();
  ESP.wdtEnable(WDTO_8S); 

  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);

  // Inisialisasi OLED Display
  Serial.println("Inisialisasi OLED...");
  if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("Alokasi SSD1306 gagal"));
  } else {
    Serial.println("OLED berhasil diinisialisasi");
  }

  setupWiFiManager();
  
  if (!connectWiFiWithManager()) {
    Serial.println("Membuka portal konfigurasi WiFi...");
    
    display.setRotation(2); 
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(0,0);
    display.println("WiFi Setup Mode");
    display.println("");
    display.println("1. Connect to:");
    display.println("   SmartAC-Setup");
    display.println("   Password: 12345678");
    display.println("");
    display.println("2. Open browser:");
    display.println("   192.168.1.1");
    display.display();
    
    // Start config portal with password
    if (!wifiManager.startConfigPortal("SmartAC-Setup", "12345678")) {
      Serial.println("Gagal memulai config portal");
      
      // Show failure message
      display.setRotation(2);
      display.clearDisplay();
      display.setTextColor(SSD1306_WHITE);
      display.setTextSize(2);
      display.setCursor(0,0);
      display.println("SETUP");
      display.println("GAGAL");
      display.setTextSize(1);
      display.println("");
      display.println("Restart dalam 3 detik");
      display.display();
      
      delay(3000);
      ESP.restart();
    }
    
    Serial.println("WiFi berhasil dikonfigurasi!");
    
    // Show success message
    display.setRotation(2);
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(0,0);
    display.println("WiFi Dikonfigurasi!");
    display.println("");
    display.println("SSID: " + WiFi.SSID());
    display.println("IP: " + WiFi.localIP().toString());
    display.println("");
    display.println("Melanjutkan setup...");
    display.display();
    delay(3000);
  }

  timeClient.begin();
  Serial.println("Memulai sinkronisasi waktu NTP...");

  // Percobaan sinkronisasi waktu dengan retry yang lebih baik
  bool ntpSuccess = false;
  for (int i = 0; i < 5; i++) {  
    Serial.print("Percobaan sinkronisasi NTP ");
    Serial.print(i+1);
    Serial.print("...");
    
    if (syncTimeFromNTP()) {
      ntpSuccess = true;
      break;
    } else {
      delay(1000);
    }
  }
  
  if (ntpSuccess) {
    Serial.println("Sinkronisasi waktu berhasil!");
    Serial.print("Waktu saat ini (WIB): ");
    Serial.println(getFormattedTimeWIB());
  } else {
    Serial.println("Gagal mendapatkan waktu dari server NTP. Akan mencoba lagi nanti.");
  }

  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  
  config.token_status_callback = tokenStatusCallback;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  Serial.println("Mengautentikasi dengan email/password...");
  
  unsigned long authStart = millis();
  while (millis() - authStart < 10000) { 
    if (Firebase.ready()) {
      firebaseReady = true;
      Serial.println("Autentikasi Firebase berhasil!");
      break;
    }
    delay(500);
  }
  
  if (!firebaseReady) {
    Serial.println("Autentikasi Firebase gagal atau waktu habis!");
  } else {
    initializeDeviceStructure();
    deviceInitialized = true;
    checkScheduleSettings();
  }
  
  initializeACs(); 
  
  if (Firebase.RTDB.getString(&fbdoConfig, "/ac_control/selectedBrand")) {
    currentBrand = fbdoConfig.stringData();
    Serial.println("Merek AC awal: " + currentBrand);
  }

  if (currentBrand == "gree") {
    acGree.begin();
    acGree.on();
    acGree.setMode(kGreeCool);
    acGree.setTemp(25);
    acGree.setFan(1);
    acGree.setSwingVertical(false, kGreeSwingAuto);
    acGree.send();
  }
  else if (currentBrand == "daikin") {
    acDaikin.begin();  
    delay(100);
    
    acDaikin.setTemp(25);
    acDaikin.setMode(kDaikinCool);
    acDaikin.setFan(kDaikinFanAuto); 
    acDaikin.setSwingVertical(false);
    acDaikin.send();
    delay(50);
    acDaikin.send(); 
  }
  else if (currentBrand == "samsung") {
    acSamsung.begin();
    acSamsung.setMode(kSamsungAcCool);
    acSamsung.setTemp(25);
    acSamsung.setFan(kSamsungAcFanAuto);
    acSamsung.send();
  }
  else if (currentBrand == "fujitsu") {
    acFujitsu.begin();
    acFujitsu.setMode(kFujitsuAcModeCool);
    acFujitsu.setTemp(25);
    // Ganti setFan dengan metode yang tepat
    //acFujitsu.setFan(kFujitsuAcFanAuto);
    acFujitsu.setFanSpeed(kFujitsuAcFanHigh);
    acFujitsu.send();
  }
  else if (currentBrand == "hitachi") {
    acHitachi.begin();
    acHitachi.setMode(kHitachiAcCool);
    acHitachi.setTemp(25);
    acHitachi.setFan(kHitachiAcFanAuto);
    acHitachi.send();
  }
  else if (currentBrand == "panasonic") {
    acPanasonic.begin();
    acPanasonic.setMode(kPanasonicAcCool);
    acPanasonic.setTemp(25);
    acPanasonic.setFan(kPanasonicAcFanAuto);
    acPanasonic.send();
  }

  Serial.println("Inisialisasi awal selesai");
  printState();

  if (firebaseReady) {
    String streamPath = "devices/" + String(DEVICE_ID) + "/ac_control";
    if (!Firebase.RTDB.beginStream(&fbdo, streamPath)) {
      Serial.println("Tidak dapat memulai stream");
      Serial.println("ALASAN: " + fbdo.errorReason());
    } else {
      Serial.println("Stream ke " + streamPath + " dimulai dengan sukses");
    }
  }

  // Display sudah diinisialisasi di awal, tidak perlu lagi
  Serial.println("Display sudah siap, melanjutkan setup sensor...");

  dht.begin();

  if (Firebase.RTDB.getBool(&fbdoConfig, "/ac_control/smartAC")) {
    smartAC = fbdoConfig.boolData();
  }

  
  if (Firebase.RTDB.getString(&fbdoConfig, "/ac_control/selectedBrand")) {
    currentBrand = fbdoConfig.stringData();
    Serial.println("Merek AC awal: " + currentBrand);
  }
}

void handleFirebaseStream() {
    static unsigned long lastStreamRead = 0;
    unsigned long currentMillis = millis();
    
    if (currentMillis - lastStreamRead < 1000) return;
    
    if (Firebase.ready() && firebaseReady) {
        if (!Firebase.RTDB.readStream(&fbdo)) {
            Serial.println("Pembacaan stream gagal: " + fbdo.errorReason());
            delay(50); // Penundaan singkat pada kesalahan
            lastStreamRead = currentMillis;
            return;
        }
        
        if (fbdo.streamAvailable()) {
            if (fbdo.dataType() == "json") {
                fbJson.setJsonData(fbdo.stringData());
                handleACControl(fbJson);
            }
        }
        
        lastStreamRead = currentMillis;
    }
}

void handleWiFiConnection() {
  static unsigned long lastWiFiCheck = 0;
  static bool lastWiFiState = true; // Track previous WiFi state
  unsigned long currentMillis = millis();
  
  // Check WiFi status every 10 seconds
  if (currentMillis - lastWiFiCheck >= 10000) {
    bool currentWiFiState = (WiFi.status() == WL_CONNECTED);
    
    // Show WiFi disconnection on OLED if state changed
    if (lastWiFiState && !currentWiFiState) {
      Serial.println("WiFi terputus...");
      
      // Display WiFi disconnected message
      display.setRotation(2);
      display.clearDisplay();
      display.setTextColor(SSD1306_WHITE);
      display.setTextSize(2);
      display.setCursor(0,0);
      display.println("WiFi");
      display.println("TERPUTUS");
      display.setTextSize(1);
      display.println("");
      display.println("Mencoba reconnect...");
      display.display();
    }
    
    if (!currentWiFiState) {
      // Jika belum 2 menit, coba reconnect
      if (currentMillis - wifiConnectionStartTime < WIFI_TIMEOUT && !portalOpened) {
        Serial.println("Mencoba reconnect WiFi...");
        WiFi.reconnect();
      }
      // Jika sudah 2 menit dan portal belum dibuka
      else if (currentMillis - wifiConnectionStartTime >= WIFI_TIMEOUT && !portalOpened) {
        Serial.println("2 menit tidak ada koneksi - Membuka portal konfigurasi...");
        portalOpened = true;
        
        // Show portal opening message on OLED
        display.setRotation(2);
        display.clearDisplay();
        display.setTextColor(SSD1306_WHITE);
        display.setTextSize(1);
        display.setCursor(0,0);
        display.println("Portal WiFi Dibuka");
        display.println("");
        display.println("1. Connect to:");
        display.println("   SmartAC-Setup");
        display.println("   Password: 12345678");
        display.println("");
        display.println("2. Open browser:");
        display.println("   192.168.1.1");
        display.display();
        
        // Reset WiFi settings dan buka portal
        wifiManager.resetSettings();
        if (!wifiManager.startConfigPortal("SmartAC-Setup", "12345678")) {
          Serial.println("Gagal memulai config portal");
          
          // Show portal failed message
          display.setRotation(2);
          display.clearDisplay();
          display.setTextColor(SSD1306_WHITE);
          display.setTextSize(2);
          display.setCursor(0,0);
          display.println("PORTAL");
          display.println("GAGAL");
          display.setTextSize(1);
          display.println("");
          display.println("Restart dalam 3 detik");
          display.display();
          
          delay(3000);
          ESP.restart();
        }
      }
    } else {
      // WiFi connected, reset timer
      wifiConnectionStartTime = currentMillis;
      portalOpened = false;
      
      // Show WiFi reconnected message if state changed
      if (!lastWiFiState && currentWiFiState) {
        Serial.println("WiFi terhubung kembali!");
        
        display.setRotation(2);
        display.clearDisplay();
        display.setTextColor(SSD1306_WHITE);
        display.setTextSize(2);
        display.setCursor(0,0);
        display.println("WiFi");
        display.println("TERHUBUNG");
        display.setTextSize(1);
        display.println("");
        display.println("IP: " + WiFi.localIP().toString());
        display.display();
        delay(2000); // Show for 2 seconds
      }
    }
    
    lastWiFiState = currentWiFiState;
    lastWiFiCheck = currentMillis;
  }
}

bool connectWiFiWithManager() {
  Serial.println("Mencoba koneksi WiFi...");
  wifiConnectionStartTime = millis();
  
  // Coba koneksi otomatis dulu
  if (wifiManager.autoConnect("SmartAC-Setup", "12345678")) {
    Serial.println("WiFi terhubung!");
    Serial.println("IP Address: " + WiFi.localIP().toString());
    portalOpened = false;
    
    // Show successful connection on OLED
    display.setRotation(2);
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(2);
    display.setCursor(0,0);
    display.println("WiFi");
    display.println("TERHUBUNG");
    display.setTextSize(1);
    display.println("");
    display.println("IP: " + WiFi.localIP().toString());
    display.display();
    delay(2000); // Show for 2 seconds
    
    return true;
  }
  
  // Jika autoConnect gagal, tampilkan pesan di OLED
  Serial.println("Tidak ada WiFi tersimpan atau koneksi gagal");
  
  display.setRotation(2);
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0,0);
  display.println("No WiFi Saved");
  display.println("");
  display.println("Starting Portal...");
  display.println("");
  display.println("Connect to:");
  display.println("SmartAC-Setup");
  display.println("Password: 12345678");
  display.display();
  delay(2000);
  
  return false;
}

void handleWiFi() {
  handleWiFiConnection();
  checkResetButton();
}

void checkMemory() {
    static unsigned long lastMemCheck = 0;
    unsigned long currentMillis = millis();
    
    if (currentMillis - lastMemCheck >= 30000) {
        Serial.printf("Heap bebas: %d byte\n", ESP.getFreeHeap());
        lastMemCheck = currentMillis;
    }
}

void handleSensors() {
  static unsigned long lastTempRead = 0;
  unsigned long currentMillis = millis();
  
  if (currentMillis - lastTempRead >= TEMP_READ_INTERVAL) {
    float newTemp = dht.readTemperature();
    float newHumidity = dht.readHumidity();
    
    if (!isnan(newTemp)) currentTemp = newTemp;
    if (!isnan(newHumidity)) currentHumidity = newHumidity;
    
    lastTempRead = currentMillis;
  }
  
  if (currentMillis - lastTempHumidityUpload >= TEMP_HUMIDITY_UPLOAD_INTERVAL) {
    sendTempHumidityToFirebase();
    lastTempHumidityUpload = currentMillis;
  }
}

void handleStateChecks() {
  static unsigned long lastCheckTime = 0;
  unsigned long currentMillis = millis();
  
  if (currentMillis - lastCheckTime >= SCHEDULE_TIME_CHECK_INTERVAL) {
    checkScheduleSettings();
    applySchedule();
    
    if (resetSchedulePending) {
      resetScheduleSettings();
    }
    
    if (smartAC && !lastPower) {
      Serial.println("Status tidak konsisten terdeteksi: SmartAC ON tetapi daya OFF");
      smartAC = false;
      
      fbConfigJson.clear();
      fbConfigJson.set("smartAC", false);
      String controlPath = "devices/" + String(DEVICE_ID) + "/ac_control";
      Firebase.RTDB.updateNode(&fbdoConfig, controlPath, &fbConfigJson);
    }
    
    lastCheckTime = currentMillis;
  }
}

void handleTimeSync() {
  unsigned long currentMillis = millis();
  
  // Sinkronisasi ulang waktu setiap interval tertentu
  if (currentMillis - lastTimeSync >= TIME_SYNC_INTERVAL || !timeInitialized) {
    if (syncTimeFromNTP()) {
      lastTimeSync = currentMillis;
    }
  }

}

void loop() {
  static unsigned long lastWdtFeed = 0;
  static unsigned long lastYield = 0;
  unsigned long currentMillis = millis();

  if (currentMillis - lastWdtFeed >= 1000) {
    ESP.wdtFeed();
    lastWdtFeed = currentMillis;
  }

  if (currentMillis - lastYield >= 100) {
    yield();
    lastYield = currentMillis;
  }

  if (currentMillis - lastDisplayUpdate >= 1000) {
    lastDisplayUpdate = currentMillis;
    updateOLEDDisplay();
    yield(); 
  }

  handleWiFi();
  handleFirebaseStream();  
  handleSensors();
  handleTimeSync();
  handleStateChecks();

  checkMemory();

  yield();
}
