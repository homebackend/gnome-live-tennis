package com.homebackend.livetennis;

import android.app.Activity;
import android.app.PictureInPictureParams;
import android.content.res.Configuration;
import android.os.Build;
import android.util.Log;
import android.util.Rational;
import androidx.annotation.NonNull;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class PipModule extends ReactContextBaseJavaModule {

    public PipModule(ReactApplicationContext reactContext) {
        super(reactContext);
        Log.e("PiPDebug", "PipPackage received Context HashCode: " + reactContext.hashCode());
        Log.e("PiPDebug", "Inside PipModule constuctor");
    }

    @NonNull @Override
    public String getName() {
        return "PipModule";
    }

    // React Native calls this method to request PiP mode
    @ReactMethod
    public void enterPipMode() {
        final Activity activity = getCurrentActivity();
        if (activity == null) {
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Define aspect ratio for the PiP window (e.g., 16:9)
            Rational aspectRatio = new Rational(16, 9);

            PictureInPictureParams.Builder pipParamsBuilder = new PictureInPictureParams.Builder();
            pipParamsBuilder.setAspectRatio(aspectRatio);

            // Try to enter PiP mode
            activity.enterPictureInPictureMode(pipParamsBuilder.build());
        }
    }

    // Helper method to send events back to React Native JS side
    public void sendPiPModeChangeEvent(boolean isInPipMode) {
        getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("onPipModeChanged", isInPipMode);
    }

    @ReactMethod
    public void addListener(String eventName) {
        // Required by NativeEventEmitter.
        // The base ReactContextBaseJavaModule usually handles the actual logic.
    }

    @ReactMethod
    public void removeListeners(int count) {
        // Required by NativeEventEmitter.
        // The base ReactContextBaseJavaModule usually handles the actual logic.
    }
}
