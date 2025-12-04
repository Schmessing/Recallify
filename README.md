# 📱 Recallify Mobile App

Welcome to the **Recallify Mobile App**, built with [Expo](https://expo.dev/) and React Native.

---

## 🚀 How to install a prebuilt version of the app (Android)

Getting Recallify onto on your phone is simple. 

### Step 1: Download latest .apk from [Releases](https://github.com/Schmessing/Recallify/releases) page

### Step 2: Tap on the .apk to begin installation
You may need to change permissions on your phone to allow installing .apk files from outside the Play Store; follow [this article](https://www.lifewire.com/install-apk-on-android-4177185) if you get stuck.

### Step 3: Enjoy!

---

## 🔨 How to build the app yourself (Android or iOS)

### Step 1: Download the source code

If you have Git installed, open **Command Prompt** or **Terminal** and run:
```bash
git clone https://github.com/Schmessing/Recallify.git
cd Recallify
```

### Step 2: Install necessary dependencies

In the project directory, open **Command Prompt** or **Terminal** and run:
```bash
npm install
```

### Step 3: Build the app

Use EAS to build the app yourself. For example, to build the app for an Android target, you would run the following command in your terminal while in the Recallify project directory:
```bash
eas build --platform android
```

### Step 4: Install the built executeable directly on your device or an emulator and enjoy!

---

### Team Workflow (for editing and testing)
**1. Make changes and push**
```bash
git add .
git commit -m "Describe what you changed"
git push
```
**2. Always pull before working**
```bash
git pull
```
This keeps everyone in sync.

---
### Tech Stack
* React Native (via Expo)
* JavaScript
* Expo Router (navigation)
