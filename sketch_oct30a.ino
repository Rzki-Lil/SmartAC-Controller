#include <ESP8266HTTPClient.h>

// Tambahkan konstanta untuk Google Script
const char* googleScriptUrl = "https://script.google.com/macros/s/AKfycbxRa4CaG7yfLuN5m7CW3OH_KRW70Bis9VSHFF8theVUZjokNGFF4MokTonsls4L05g8Aw/exec";

// Tambahkan fungsi untuk mengirim data ke Google Spreadsheet
void sendToGoogleSheets(float temperature, float humidity) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Error: WiFi tidak terhubung");
    return;
  }

  // Buat HTTP client
  WiFiClient client;
  HTTPClient http;

  // Buat URL dengan parameter
  String url = String(googleScriptUrl);
  url += "?temperature=" + String(temperature, 1);
  url += "&humidity=" + String(humidity, 1);

  Serial.println("Mengirim data ke Google Sheets...");
  Serial.println(url);

  http.begin(client, url);
  
  // Kirim GET request
  int httpCode = http.GET();

  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("HTTP Response code: " + String(httpCode));
    Serial.println("Response: " + response);
  } else {
    Serial.println("Error pada HTTP request: " + http.errorToString(httpCode));
  }

  http.end();
}

// Modifikasi fungsi sendTempHumidityToFirebase untuk mengirim ke Google Sheets juga
void sendTempHumidityToFirebase() {
  if (!Firebase.ready() || !firebaseReady) {
    Serial.println("Firebase tidak siap, melewati update");
    return;
  }
  
  // Cek apakah pembacaan valid
  if (isnan(currentTemp) || isnan(currentHumidity)) {
    Serial.println("Pembacaan suhu atau kelembaban tidak valid, melewati upload");
    return;
  }
  
  // Buat JSON object dengan pembacaan saat ini dan timestamp
  FirebaseJson json;
  json.set("temperature", roundf(currentTemp * 10) / 10);
  json.set("humidity", roundf(currentHumidity * 10) / 10);
  json.set("timestamp", (uint64_t)timeClient.getEpochTime());
  
  // Update node Firebase di /sensor_data
  if (Firebase.RTDB.updateNode(&fbdoConfig, "/sensor_data", &json)) {
    Serial.println("Data suhu dan kelembaban diperbarui di Firebase:");
    Serial.println("  Suhu: " + String(currentTemp, 1) + "°C");
    Serial.println("  Kelembaban: " + String(currentHumidity, 1) + "%");
    Serial.println("  Waktu: " + getFormattedTimeWIB());
    
    // Kirim data ke Google Sheets
    sendToGoogleSheets(currentTemp, currentHumidity);
  } else {
    Serial.println("Gagal memperbarui data sensor di Firebase: " + fbdoConfig.errorReason());
    
    // Coba sekali lagi setelah jeda singkat
    delay(500);
    if (Firebase.RTDB.updateNode(&fbdoConfig, "/sensor_data", &json)) {
      Serial.println("Data suhu dan kelembaban diperbarui pada percobaan ulang");
      // Kirim data ke Google Sheets setelah berhasil update Firebase
      sendToGoogleSheets(currentTemp, currentHumidity);
    }
  }
} 