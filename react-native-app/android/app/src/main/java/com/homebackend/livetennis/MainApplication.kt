package com.homebackend.livetennis

import android.app.Application
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.ReactPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    
    Log.e("PiPDebug", "Main Application Context HashCode: ${applicationContext.hashCode()}")

    // Get the standard list of autolinked packages as a MutableList
    val packages: MutableList<ReactPackage> = PackageList(this).packages
    
    // Manually add your PipPackage to the list
    Log.e("PiPDebug", "Adding PipPackage: ${packages.size}")
    packages.add(PipPackage()) // <-- Add this line
    Log.e("PiPDebug", "Added PipPackage: ${packages.size}")

    getDefaultReactHost(
      context = applicationContext,
      packageList = packages, // Pass the modified list of packages
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
