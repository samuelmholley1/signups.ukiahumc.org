# SED Replacement Plan for Food Distribution Pages

**Date:** November 23, 2025  
**Purpose:** Transform cloned liturgist pages into food distribution pages using sed commands

---

## 🔧 WHAT IS SED?

`sed` is a "find and replace" command that works on entire files at once. Think of it like Microsoft Word's "Find & Replace All" but for code files.

---

## 📋 STEP-BY-STEP REPLACEMENT PLAN

### **Step 1: Change Colors**
```bash
cd /Users/samuelholley/Projects/signups.ukiahumc.org/src/app/food-distribution
sed -i '' -e 's/blue-/green-/g' -e 's/indigo-/emerald-/g' -e 's/purple-/green-/g' page.tsx
```
**What it does:** Changes all the color styling from blue theme to green theme
- `blue-` → `green-` (buttons, borders, etc.)
- `indigo-` → `emerald-` (gradients, backgrounds)
- `purple-` → `green-` (highlights)

**Why:** Food distribution should look different from liturgist signups (green vs blue)

---

### **Step 2: Change Role Names (Part 1)**
```bash
sed -i '' -e "s/'liturgist2'/'volunteer2'/g" -e "s/liturgist2/volunteer2/g" page.tsx
```
**What it does:** Changes "liturgist2" → "volunteer2"

**Why:** We do this FIRST because if we change "liturgist" first, it would also change "liturgist2" to "volunteer12" (oops!)

---

### **Step 3: Change Role Names (Part 2)**
```bash
sed -i '' -e "s/'liturgist'/'volunteer1'/g" -e "s/liturgist/volunteer1/g" page.tsx
```
**What it does:** Changes "liturgist" → "volunteer1"

**Why:** Now it's safe to change the main role name

---

### **Step 4: Change Role Names (Part 3)**
```bash
sed -i '' -e "s/'backup'/'volunteer2'/g" -e "s/backup/volunteer2/g" page.tsx
```
**What it does:** Changes "backup" → "volunteer2"

**Why:** Food distribution doesn't need "backup liturgist" - just "volunteer #2"

---

### **Step 5: Update Button/Label Text**
```bash
sed -i '' -e 's/Main Liturgist/Volunteer #1/g' -e 's/Backup Liturgist/Volunteer #2/g' page.tsx
```
**What it does:** Changes what users SEE on screen
- "Main Liturgist" → "Volunteer #1"
- "Backup Liturgist" → "Volunteer #2"

**Why:** Food volunteers don't need church-specific titles

---

### **Step 6: Update Page Titles**
```bash
sed -i '' -e 's/Liturgist Services/Food Distribution/g' -e 's/Liturgist Schedule/Food Distribution Schedule/g' page.tsx
```
**What it does:** Changes page headers and titles

**Why:** Page should say "Food Distribution" not "Liturgist Services"

---

### **Step 7: Remove Christmas Eve Special Logic**
```bash
sed -i '' -e '/Christmas Eve/d' page.tsx
```
**What it does:** DELETES any line that mentions "Christmas Eve"

**Why:** Food distribution doesn't need special Christmas Eve handling (no 4 volunteers, no candle lighting notes)

---

### **Step 8: Remove Advent Candle References**
```bash
sed -i '' -e '/Advent/d' -e '/candle/d' page.tsx
```
**What it does:** DELETES lines mentioning "Advent" or "candle"

**Why:** Food distribution doesn't involve lighting Advent candles - that's liturgist-specific

---

### **Step 9: Remove Liturgist Dropdown List**
```bash
sed -i '' -e "/import.*getAllLiturgists/d" -e "/const liturgists = getAllLiturgists/d" page.tsx
```
**What it does:** Removes the code that pulls up a dropdown list of known liturgists

**Why:** Food volunteers are new each time - no pre-populated list needed. They just type their name.

---

### **Step 10: Apply Same Changes to Schedule Summary**
```bash
cd /Users/samuelholley/Projects/signups.ukiahumc.org/src/app/food-distribution/schedule-summary
sed -i '' -e 's/blue-/green-/g' -e 's/indigo-/emerald-/g' -e 's/purple-/green-/g' page.tsx
sed -i '' -e 's/Liturgist/Food Distribution/g' page.tsx
sed -i '' -e 's/liturgist/volunteer/g' page.tsx
sed -i '' -e '/Christmas Eve/d' -e '/Advent/d' -e '/candle/d' page.tsx
```

---

## 🎯 END RESULT

After running all commands:
- ✅ Green-themed food distribution page
- ✅ 2 volunteer slots (Volunteer #1, Volunteer #2)
- ✅ No church-specific liturgy terms
- ✅ No special Christmas/Advent logic
- ✅ Simple name entry (no dropdown)
- ✅ Everything else works the same (password, calendar, real-time updates)

---

## ⚠️ IMPORTANT NOTES

1. **Order matters!** Run commands in the exact order listed
2. **Test after each step** to ensure no syntax errors
3. **Backup before starting** (we already did this by keeping liturgists/ folder intact)
4. **Commit after completion** so changes can be rolled back if needed

---

## 🚀 QUICK EXECUTION (All at Once)

```bash
cd /Users/samuelholley/Projects/signups.ukiahumc.org/src/app/food-distribution

# Colors
sed -i '' -e 's/blue-/green-/g' -e 's/indigo-/emerald-/g' -e 's/purple-/green-/g' page.tsx

# Roles (careful order!)
sed -i '' -e "s/'liturgist2'/'volunteer2'/g" -e "s/liturgist2/volunteer2/g" page.tsx
sed -i '' -e "s/'liturgist'/'volunteer1'/g" -e "s/liturgist/volunteer1/g" page.tsx
sed -i '' -e "s/'backup'/'volunteer2'/g" -e "s/backup/volunteer2/g" page.tsx

# Labels
sed -i '' -e 's/Main Liturgist/Volunteer #1/g' -e 's/Backup Liturgist/Volunteer #2/g' page.tsx

# Titles
sed -i '' -e 's/Liturgist Services/Food Distribution/g' -e 's/Liturgist Schedule/Food Distribution Schedule/g' page.tsx

# Remove special logic
sed -i '' -e '/Christmas Eve/d' page.tsx
sed -i '' -e '/Advent/d' -e '/candle/d' page.tsx

# Remove dropdown
sed -i '' -e "/import.*getAllLiturgists/d" -e "/const liturgists = getAllLiturgists/d" page.tsx

# Schedule summary
cd schedule-summary
sed -i '' -e 's/blue-/green-/g' -e 's/indigo-/emerald-/g' -e 's/purple-/green-/g' page.tsx
sed -i '' -e 's/Liturgist/Food Distribution/g' page.tsx
sed -i '' -e 's/liturgist/volunteer/g' page.tsx
sed -i '' -e '/Christmas Eve/d' -e '/Advent/d' -e '/candle/d' page.tsx

# Return to project root
cd /Users/samuelholley/Projects/signups.ukiahumc.org

# Commit changes
git add -A
git commit -m "Transform food-distribution pages using sed (green theme, volunteers, no liturgy-specific logic)"
git push
```

---

**Status:** ⏳ Ready to execute (waiting for build to stabilize first)
