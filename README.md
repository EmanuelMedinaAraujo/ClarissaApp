# Clarissa App Outline

This app is for my girlfriend Clarissa developed by me (Emanuel).
It's purpose is to assist her with various tasks.
In the long term, I hope to add many features that will make her life easier and more enjoyable.

## Privacy
A core principle of the app is to prioritize her privacy and security.

## MVP Features
The initial version of the app will focus on a few key features:
 - **Privacy**: Ensure all features are built with privacy in mind from the ground up.
 - **Color themes**: Allow customization of the app's appearance with a dark, light, and red theme. Generate a proposed palette for red theming.
 - **Menstruation Tracker**: Help Clarissa track her menstrual cycle and symptoms.
 - **Pill Reminder**: Send reminders for taking birth control pills.
 - **Usability**: Ensure the app is user-friendly and easy to navigate with intuitive controls and clear information. The design should be visually appealing and accessible.

### Tabs
Today, Calendar, Profile


### Menstruation Calendar
The menstruation tracker will allow Clarissa to log her menstrual cycle and symptoms.
For this, a tab should be available in the app displaying a user-friendly calendar view. (Calendar)

When she taps on a date, she can input her blood flow intensity.
Cycle start by first day with bloodflow.
Additionally, toggle buttons with icons should be available to indicate symptoms such as cramps, vomiting, headaches or mood changes.
Use the current symptom set. Do not add further options here.
Use discrete space for blood flow intensity.(None/Light/Medium/Heavy)
A notes field should als be available.
After confirming, the data will be stored encrypted locally.
An entry should include the date, blood flow intensity and further recorded info. The data should be stored sorted with the date and time.
Use expo-sqlite for local storage.
The calendar should visualize on which days the birth control pill was taken and will be taken in the future.

### Pill Reminder
The pill reminder feature will allow Clarissa to set reminders for taking her birth control pills in the Profile Tab.
The app will send notifications to remind her to take her pill.
Use expo-notifications for scheduling local notifications.
It should be possible to customize the pill cycle length and reminder times.
It should also be possible to snooze reminders.
Furthermore, she should be able to set different times for each day in the week.
Use default pack length 21+7 pill regimen.
Use device local timezone.

### Today Tab
The Today Tab will provide an overview of her current status.
It will display the current date and the reminders for taking the pill.
It should be possible to quickly track the intake of the pill.
Furthermore, the status of her menstrual cycle should be visible at a glance.
It should also be displayed when the next bleeding phase is expected.
An indicator will show whether she is currently in her fertile window.
Use standard 28 day cycle length model and use simple 14-day ovulation rule as fertile window calculation


## Future Features (not relevant now/Ignore for now)
In the future, I plan to add more features such as:

 - **Encryption**: When using the app, all data should be stored encrypted locally and never shared with third parties.
 - **Milestone View**: Provide a way to visualize and gamify the relationship between me and Clarissa.
 - **Health Insights**: Analyze health data to provide insights and recommendations for improving well-being.
 - **Virtual Roses**: Allow Clarissa to receive virtual roses from me as a form of appreciation and liking.
 - **Connect Partner**: Enable Clarissa to connect with me through the app, allowing us to share milestones and current point of the menstrual cycle.
 - **Integration with Other Apps**: Allow Clarissa to connect the app with other tools she uses for a seamless experience.
 - **Lock**: Lock the app with a PIN or biometric authentication for added security.

# Development Environment
This app is built using React Native and TypeScript, leveraging the Expo framework for development and deployment.
## File structure
### app folder
Contains the app's navigation, which is file-based. The file structure of the app directory determines the app's navigation.

The app has two routes defined by two files: app/(tabs)/index.tsx and app/(tabs)/explore.tsx. The layout file in app/(tabs)/_layout.tsx sets up the tab navigator.
### assets folder
The assets directory contains adaptive-icon.png used for Android and an icon.png used for iOS as app icons. It also contains splash.png which is an image for the project's splash screen and a favicon.png if the app runs in a browser.
### components folder
Contains React Native components, like ThemedText.tsx, which creates text elements that use the app's color scheme in light and dark modes.
### constants folder
Contains Colors.ts, which contains a list of color values throughout the app.
### hooks folder
Contains React Hooks, which allows sharing common behavior between components. For example, useThemeColor() is a hook that returns a color based on the current theme.
### scripts folder
Contains reset-project.js, which can be run with npm run reset-project. This script will move the app directory to app-example, and create a new app directory with an index.tsx file.
### app.json
Contains configuration options for the project and is called the app config. These options change the behavior of your project while developing, building, submitting, and updating your app.
### package.json
The package.json file contains the project's dependencies, scripts, and metadata. Anytime a new dependency is added to your project, it will be added to this file.
### tsconfig.json
Contains the rules that TypeScript will use to enforce type safety throughout the project.