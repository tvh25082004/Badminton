# Retrofit / kotlinx.serialization
-keepattributes Signature, InnerClasses, EnclosingMethod, *Annotation*
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-dontwarn retrofit2.KotlinExtensions
-dontwarn retrofit2.KotlinExtensions*

-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation
-keep,allowobfuscation,allowshrinking class retrofit2.Response

# kotlinx.serialization — giữ serializer sinh ra
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** { kotlinx.serialization.KSerializer serializer(...); }
-keep,includedescriptorclasses class vn.caulongpro.app.**$$serializer { *; }
-keepclassmembers class vn.caulongpro.app.** { *** Companion; }
-keepclasseswithmembers class vn.caulongpro.app.** { kotlinx.serialization.KSerializer serializer(...); }
