# Test Edit Flow - Debugging Guide

## Current Implementation

### Flow:
1. **RequestDetails.jsx** → Click "Modifier" button → Navigate to `/admin/requests/:id/edit`
2. **RequestEdit.jsx** → Fill form → Click "Enregistrer les modifications" → Send PUT request
3. **requestsAdmin.js** → `updateRequest()` → `PUT /api/admin/requests/:id`

## Test Procedure

### Step 1: Navigate to Request Details
1. Go to `/admin/requests/:id` (replace :id with actual request ID)
2. Open Browser Console (F12)
3. You should see: `POST /api/admin/requests/:id/mark-viewed` in Network tab

### Step 2: Click "Modifier" Button
1. Find the "✏️ Modifier" button on the details page
2. Click it
3. **Expected**: Navigate to `/admin/requests/:id/edit`
4. **Console should show**: `RequestEdit component rendered. ID: [id]`

### Step 3: Verify Form Loaded
1. On the edit page, console should show:
   - `=== RequestEdit mounted ===`
   - `handleSubmit is defined: true`
2. Check that form fields are populated

### Step 4: Make a Change
1. Change the Status dropdown
2. **Console should show**: `STATUS CHANGED: [new value]`

### Step 5: Click Save Button
1. Click "Enregistrer les modifications" button
2. **Console should show IN THIS ORDER**:
   ```
   === SAVE BUTTON CLICKED ===
   Button type: submit
   Disabled: false
   Form: [HTMLFormElement object]
   🎯 FORM ONSUBMIT EVENT FIRED 🎯
   === FORM SUBMIT TRIGGERED ===
   Request ID: [id]
   Current Status: [status]
   SAVE CLICKED - Payload: {current_status: "...", is_active: true}
   Calling updateRequest...
   === updateRequest API called ===
   Request ID: [id]
   URL: /api/admin/requests/[id]
   ```
3. **Network tab should show**: `PUT /api/admin/requests/:id`
4. **After success, console shows**:
   ```
   === updateRequest SUCCESS ===
   Response: {...}
   UPDATE RESPONSE: {...}
   Redirecting to details page...
   ```

## Troubleshooting

### If NO console logs appear:
- JavaScript error preventing component from loading
- Check browser console for red errors
- Route might not be configured

### If "RequestEdit component rendered" appears but nothing else:
- Component crash during initial data load
- Check for errors in `loadRequest()` or `loadAgents()`

### If field change logs appear but button click doesn't:
- Button is disabled (check `saving` state in console)
- CSS issue covering button
- Event listener not attached

### If "SAVE BUTTON CLICKED" appears but no "FORM ONSUBMIT EVENT FIRED":
- Form submission being prevented by something
- Button click not triggering form submit event
- Check if button is really inside `<form>` tags

### If "FORM ONSUBMIT EVENT FIRED" appears but no "FORM SUBMIT TRIGGERED":
- Error in first line of handleSubmit (before any logs)
- Check for syntax errors

### If "Calling updateRequest" appears but no API logs:
- Import issue with updateRequest function
- Check import at top of RequestEdit.jsx

### If API logs appear but no network request:
- axiosClient configuration issue
- CSRF token issue
- Check axiosClient.js configuration

## File Locations

- Details page: `src/pages/admin/RequestDetails.jsx`
- Edit page: `src/pages/admin/RequestEdit.jsx`
- API client: `src/api/requestsAdmin.js`
- Routes: `src/App.jsx` (line 48)

## Expected Network Requests

When editing a request, you should see:
1. `GET /api/admin/requests/:id` - Load request data
2. `GET /api/admin/users?role=agent` - Load agents list
3. `PUT /api/admin/requests/:id` - Update request (when clicking Save)

## Quick Fix Attempts

If the form still doesn't work after all logs:

### 1. Check if button is actually inside form:
Open React DevTools → Find `<form>` element → Verify `<button type="submit">` is a child

### 2. Manually test form submission:
In browser console, run:
```javascript
document.querySelector('.edit-form').addEventListener('submit', (e) => {
  console.log('MANUAL LISTENER: Form submitted!', e);
});
```
Then click Save button. If this log appears, the form IS submitting but handleSubmit isn't being called.

### 3. Check for global event prevention:
In browser console, run:
```javascript
window.addEventListener('submit', (e) => {
  console.log('GLOBAL SUBMIT LISTENER:', e);
}, true);
```
This captures ALL form submissions. If this doesn't log, something is preventing the submit event entirely.

### 4. Test programmatic submit:
In browser console, run:
```javascript
document.querySelector('.edit-form').requestSubmit();
```
This should trigger the form submission directly. If this works but clicking doesn't, it's a button/click issue.

## Report Back

When testing, please report:
1. Which console logs you see (and in what order)
2. Which network requests appear in Network tab
3. Any error messages (red text) in console
4. Screenshot of console output if possible
