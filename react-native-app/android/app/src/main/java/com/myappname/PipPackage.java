package com.myappname; // Make sure this matches your project's package name

import android.util.Log;
import androidx.annotation.NonNull;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.Collections;
import java.util.List;
import java.util.ArrayList;

public class PipPackage implements ReactPackage {

    @NonNull
    @Override
    public List<NativeModule> createNativeModules(@NonNull ReactApplicationContext reactContext) {
        Log.e("PiPDebug", "PipPackage received Context HashCode: " + reactContext.hashCode());

        List<NativeModule> modules = new ArrayList<>();
        Log.e("PiPDebug", "Adding PipModule: ${modules.size}");
        modules.add(new PipModule(reactContext));
        Log.e("PiPDebug", "Added PipModule: ${modules.size}");
        return modules;
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactContext) {
        Log.e("PiPDebug", "Inside create view managers");
        return Collections.emptyList();
    }
}
