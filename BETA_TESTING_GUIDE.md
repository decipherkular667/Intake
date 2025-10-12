# 🧪 IntakeAI Health - Beta Testing Guide

Welcome beta tester! Thank you for helping test IntakeAI Health! 🎉

## 📱 What is This App?

IntakeAI Health is an AI-powered nutrition tracking app that gives you:
- Smart food logging with search
- AI-powered health insights
- Traditional Chinese Medicine (TCM) recommendations
- Multi-language support (English & Chinese)
- Works as a Progressive Web App (PWA) - install it like a native app!

---

## 🚀 Getting Started

### Option 1: Use as Web App
1. Open the URL in your mobile browser (Chrome/Safari)
2. Create an account
3. Start using immediately!

### Option 2: Install as PWA (Recommended)
The app can be installed on your phone like a native app!

#### On iPhone/iPad (Safari):
1. Open the app URL in Safari
2. Tap the **Share** button (square with arrow pointing up)
3. Scroll down and tap "**Add to Home Screen**"
4. Tap "**Add**"
5. The app icon will appear on your home screen! 📲

#### On Android (Chrome):
1. Open the app URL in Chrome
2. A pop-up will ask "**Install IntakeAI Health?**"
3. Tap "**Install**" or "**Add**"
4. Or tap the **menu** (three dots) → "**Add to Home screen**"
5. The app is now on your home screen! 📱

#### Benefits of Installing:
- ✅ Opens like a native app (no browser UI)
- ✅ Faster access from home screen
- ✅ Basic offline functionality
- ✅ Full-screen experience

---

## 📋 What to Test

Please try to test all these features and let us know if anything breaks!

### 1. 👤 Account & Authentication
- [ ] Register a new account
- [ ] Log in with your account
- [ ] Log out
- [ ] Stay logged in after closing app

**Try breaking it:**
- Use a weak password
- Use an email that's already registered
- Leave fields empty

### 2. 🏥 Health Profile
- [ ] Create your health profile
- [ ] Fill in all fields (age, weight, height, etc.)
- [ ] Add medical conditions
- [ ] Add allergies
- [ ] Add medications
- [ ] Set dietary restrictions
- [ ] Set health goals

**Try breaking it:**
- Enter crazy values (weight: 999, height: 10)
- Add lots of conditions
- Use special characters

### 3. 🍎 Food Diary
- [ ] Search for a food
- [ ] Add food to diary
- [ ] Log different meal types (breakfast, lunch, dinner, snack)
- [ ] View today's entries
- [ ] Delete a food entry
- [ ] Change the date

**Try breaking it:**
- Search for gibberish
- Add 20+ foods in one day
- Try foods in different languages (if multilingual)
- Log foods on past dates

### 4. 🤖 AI Insights
- [ ] View daily insights after logging foods
- [ ] Check health score
- [ ] Read AI recommendations
- [ ] View TCM recommendations
- [ ] Check if insights update when you add more food

**Try breaking it:**
- Request insights with no food logged
- Request insights multiple times quickly
- Check if it handles rate limiting gracefully

### 5. 🌍 Language Support
- [ ] Switch between English and Chinese (if available)
- [ ] Check if food names translate
- [ ] Check if UI translates properly

### 6. 📱 PWA Features (If Installed)
- [ ] Open app from home screen
- [ ] Check if it looks like a native app
- [ ] Try using with slow/no internet
- [ ] Check if it loads faster after first use

### 7. 🔄 Navigation
- [ ] Use bottom navigation
- [ ] Navigate between all pages
- [ ] Use back button (if available)
- [ ] Check if page state is preserved

---

## 🐛 How to Report Bugs

When you find something broken, please send:

### Include These Details:
1. **What you were trying to do**
   - Example: "I was trying to add an apple to my diary"

2. **What happened (the bug)**
   - Example: "The app crashed and went to a blank screen"

3. **Screenshots (if possible)**
   - Take a screenshot of the error

4. **Your device info**
   - Example: "iPhone 13, iOS 16.3, Safari"
   - Example: "Samsung S21, Android 12, Chrome"

5. **Steps to reproduce**
   - Example: "1. Go to Food Diary 2. Search for 'apple' 3. Click Add 4. App crashes"

### Where to Send Bug Reports:
[Your preferred contact method - email, WhatsApp, Discord, etc.]

---

## 💡 Known Limitations (Beta)

These are expected limitations - no need to report these:

- ⚠️ **No email verification** - Please use a real email anyway
- ⚠️ **No password reset** - Contact us if you forget your password
- ⚠️ **Rate limiting** - 20 AI requests per hour (should be enough for testing)
- ⚠️ **Beta bugs** - Some features might not work perfectly
- ⚠️ **Limited users** - App is optimized for small group testing
- ⚠️ **Data might be reset** - Don't rely on this for actual health tracking yet!

---

## ✨ What We're Looking For

### Critical Issues (Report ASAP):
- App crashes or freezes
- Cannot log in/register
- Data loss
- Security concerns
- Major UI breaks

### Nice to Report:
- Confusing UI/UX
- Typos or grammar
- Slow performance
- Missing features you expected
- Ideas for improvement

### Don't Worry About:
- Minor visual glitches
- Placeholder text
- "Beta" labels
- Test data showing up

---

## 📊 Testing Checklist

Use this checklist to track your testing progress:

### Day 1: Basic Setup
- [ ] Install/access the app
- [ ] Create account and log in
- [ ] Complete health profile
- [ ] Log at least 3 foods
- [ ] Get your first AI insights

### Day 2-3: Regular Usage
- [ ] Log all your meals for a day
- [ ] Try different types of foods
- [ ] Test the search functionality
- [ ] Check insights multiple times
- [ ] Navigate through all pages

### Day 4-7: Edge Cases
- [ ] Try to break things (weird inputs)
- [ ] Test with slow internet
- [ ] Use offline (if PWA installed)
- [ ] Try on different devices (if possible)
- [ ] Report all bugs found

---

## 🎯 Key Scenarios to Test

### Scenario 1: New User Journey
1. Register → Complete profile → Log breakfast → View insights
2. **Expected**: Smooth flow, no errors, insights make sense

### Scenario 2: Daily Tracking
1. Log breakfast, lunch, dinner, and snack
2. Check insights after each meal
3. **Expected**: Insights update and improve with more data

### Scenario 3: TCM Recommendations
1. Add foods with specific properties
2. Check if TCM recommendations appear
3. **Expected**: Get relevant TCM dietary advice

### Scenario 4: Profile Updates
1. Change your health profile
2. Log the same foods again
3. **Expected**: Insights should reflect profile changes

---

## ⚡ Quick Tips

- **Save your login** - No password reset yet!
- **Be patient** - AI insights take 5-10 seconds to generate
- **Report everything** - Even small issues help!
- **Have fun** - Try to break things! That's the goal!
- **Ask questions** - Not sure about something? Just ask!

---

## 🙏 Thank You!

Your feedback is invaluable! Every bug you find helps make the app better for everyone.

### Questions or Issues?
Contact: [Your contact method]

### Want to Suggest Features?
We'd love to hear your ideas!

---

**Happy Testing! 🚀**

*Last updated: [Date]*
