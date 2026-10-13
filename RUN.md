# Ayah by Ayah – run steps

Pinned: react-native 0.81.5, react 19.1.0, async-storage 2.2.0, react-native-fs 2.20.0,
react-native-view-shot 4.0.3, camera-roll 7.10.2, netinfo 11.4.1,
@wokcito/ffmpeg-kit-react-native 6.1.2 (Android uses io.github.jamaismagic.ffmpeg:ffmpeg-kit-main-16kb:6.1.4 from Maven Central).

1. `cd app && npm install`
2. `npx react-native-asset`   (links assets/fonts/Amiri-Regular.ttf; already run once)
3. Android: start emulator/device, then `npx react-native run-android`
4. Test: tap "Generate & Download Video" for 1:1; "Saved" appears and the video is in Gallery/Movies.

iOS: the ffmpeg-kit iOS binaries (github.com/arthenica releases) return 404, so `pod install` will fail
on the ffmpeg pods. Use the server fallback for iOS.
