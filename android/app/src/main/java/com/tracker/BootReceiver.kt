package com.tracker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.PeriodicWorkRequest
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d("BootReceiver", "📱 Device booted – starting tracker")

            val workRequest = PeriodicWorkRequest.Builder(
                TrackerWorker::class.java,
                60, TimeUnit.MINUTES
            ).build()

            WorkManager.getInstance(context).enqueue(workRequest)
        }
    }
}