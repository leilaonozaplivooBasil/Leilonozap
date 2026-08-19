# Capacitor — manter bridge JavaScript/WebView intacta
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.PluginMethod public *;
}

# WebView JS interface (Capacitor usa reflexão para expor métodos ao JS)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Evitar remoção de construtores usados via reflexão (Gson, Retrofit, etc.)
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod

# Manter stack traces legíveis nos crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
