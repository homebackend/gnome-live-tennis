package com.myappname

import android.content.res.Configuration
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.bridge.ReactContext
import com.facebook.react.ReactApplication
import com.myappname.PipModule

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "MyAppName"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
          DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onPictureInPictureModeChanged(
          isInPictureInPictureMode: Boolean,
          newConfig: Configuration
  ) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)

    val reactApplication = application as? ReactApplication ?: run {
        Log.e("PiPDebug", "Application is not a ReactApplication instance.")
        return
    }

    val reactContext: ReactContext? = reactApplication.reactHost?.currentReactContext
    if (reactContext != null) {
      val pipModule = reactContext.getNativeModule(PipModule::class.java)
      if (pipModule != null) {
        pipModule.sendPiPModeChangeEvent(isInPictureInPictureMode)
      } else {
        Log.e("PiPDebug", "PipModule not found in React Context!")
      }
    } else {
      Log.e("PiPDebug", "React Context is null!")
    }
  }
}
