# PERMANENT MAP ROTATION FIX - ActivityTrackerNew.js

## Problem
Map rotation keeps getting lost after app restarts. The map should rotate based on device compass orientation regardless of tracking state.

## CRITICAL FIXES TO MAINTAIN

### 1. Magnetometer Setup (Line ~179)
**ENSURE**: Update interval is 500ms for responsiveness:
```javascript
Magnetometer.setUpdateInterval(500); // More frequent updates
```

### 2. Magnetometer Listener (Line ~194)  
**ENSURE**: Heading threshold is 5 degrees for sensitivity:
```javascript
if (minDiff > 5) { // 5 degrees for better rotation
```

### 3. Map Rotation Trigger (Line ~202)
**CRITICAL**: Map rotation must NOT require tracking:
```javascript
// Allow map rotation whenever we have location and not paused (NO TRACKING REQUIREMENT)
if (!isPaused && location && mapRef.current) {
    animateToHeading(newHeading);
}
```

**WRONG** (DO NOT USE):
```javascript
// This prevents rotation when not tracking
if (isTracking && !isPaused && location) {
    animateToHeading(newHeading);
}
```

### 4. animateToHeading Function (Line ~714)
**ENSURE**: Only requires mapRef and location:
```javascript
const animateToHeading = (newHeading) => {
    if (!mapRef.current || !location) {
        return; // NO tracking requirement here
    }
    // ... rest of function
}
```

**CRITICAL SETTINGS**:
- Throttle: 300ms max (not 500ms or higher)
- Heading threshold: 5 degrees (not 8 or 10)
- Animation duration: 400ms (not 600ms or higher)

### 5. Debug Logging
Keep some logging active to verify it's working:
```javascript
// In magnetometer listener
if (Math.random() < 0.3) {
    console.log('[MAGNETOMETER] Heading change...', hasLocation: !!location);
}

// In animateToHeading
if (Math.random() < 0.4) {
    console.log('[MAP_ROTATION] ✅ Rotating map from', oldHeading, 'to', newHeading);
}
```

## HOW TO VERIFY IT'S WORKING

### In Expo Logs:
You should see these logs when rotating the device:
```
[MAGNETOMETER] Heading change from X.X to Y.Y diff: Z.Z hasLocation: true paused: false
[MAP_ROTATION] ✅ Rotating map from X.X to Y.Y
```

### On Device:
1. Open any activity screen (Running/Walking/Cycling)
2. Rotate the physical device
3. Map should rotate smoothly to match device orientation
4. Works whether tracking is started or not

## IF ROTATION STOPS WORKING

1. Check that the magnetometer listener condition is:
   ```javascript
   if (!isPaused && location && mapRef.current) {
   ```
   NOT:
   ```javascript
   if (isTracking && !isPaused && location) {
   ```

2. Check update intervals:
   - Magnetometer: 500ms
   - Map throttle: 300ms
   - Heading threshold: 5 degrees

3. Check logs for magnetometer activity

## BACKUP OF WORKING CODE

### Working magnetometer condition:
```javascript
// Allow map rotation whenever we have location and not paused (NO TRACKING REQUIREMENT)
if (!isPaused && location && mapRef.current) {
    animateToHeading(newHeading);
}
```

### Working animateToHeading start:
```javascript
const animateToHeading = (newHeading) => {
    if (!mapRef.current || !location) {
        console.log('[MAP_ROTATION] Skipping - no map ref or location:', { hasMapRef: !!mapRef.current, hasLocation: !!location });
        return; // Don't update map if no map ref or location - NO TRACKING CHECK
    }
```

## REMEMBER
The key is that map rotation should work based on device orientation ALWAYS when on an activity screen, regardless of whether tracking has been started. This provides a compass-like experience for users.
