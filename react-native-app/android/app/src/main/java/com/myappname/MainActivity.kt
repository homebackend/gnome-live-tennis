package com.myappname

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.facebook.react.bridge.ReactContext
import android.content.res.Configuration

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

    // Get the React Native context
    val reactContext: ReactContext? = reactInstanceManager.currentReactContext
    if (reactContext != null) {
      // Find the module we created
      val pipModule = reactContext.getNativeModule(PipModule::class.java)
      if (pipModule != null) {
        // Send an event to JavaScript side
        pipModule.sendPiPModeChangeEvent(isInPictureInPictureMode)
      }
    }
  }
}
