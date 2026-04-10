# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# WebView JS 인터페이스 보호 (Capacitor)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Capacitor 플러그인 보호
-keep class com.getcapacitor.** { *; }
-keep class com.google.android.gms.ads.** { *; }

# WebView with JS
-keepclassmembers class fqcn.of.javascript.interface.for.webview {
    public *;
}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile
