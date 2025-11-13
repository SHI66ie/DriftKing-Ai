# 🚀 Google Drive API Setup (5 minutes)

Your KobayashiAI app can now load data directly from Google Drive! Here's how to set it up:

## 📋 Quick Setup Steps

### 1. **Get Google Drive API Key**
1. Go to [Google Cloud Console](https://console.developers.google.com/)
2. Create a new project (or select existing)
3. **Enable Google Drive API v3**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Drive API"
   - Click "Enable"
4. **Create API Key**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy your API key

### 2. **Configure Locally**
Create `.env.local` file in your project root:
```bash
# In your project folder
echo "GOOGLE_DRIVE_API_KEY=your_actual_api_key_here" > .env.local
```

### 3. **Restart & Test**
```bash
# Restart your dev server
npm run dev

# Open dashboard and select Barber track
# Should show "Google Drive" as data source in console
```

## 🌐 **For Deployment**

### Netlify
1. Site Settings → Environment Variables
2. Add: `GOOGLE_DRIVE_API_KEY` = `your_api_key`

### Vercel
1. Project Settings → Environment Variables  
2. Add: `GOOGLE_DRIVE_API_KEY` = `your_api_key`

## ✅ **What You Get**

- **No Downloads**: 18+ GB stays in the cloud
- **All Tracks**: Access to all 7 Toyota GR Cup tracks
- **Always Updated**: Uses latest data from shared folder
- **Fast Loading**: Direct JSON from Google Drive
- **Easy Deploy**: Just add one environment variable

## 🔍 **Testing**

1. **Open Dashboard**: http://localhost:3001/dashboard
2. **Select Barber Track** (has local data as fallback)
3. **Check Console**: Should show data source (Google Drive or Local Files)
4. **Try Other Tracks**: Will work once Google Drive API is configured

## 🆘 **Troubleshooting**

- **503 Error**: Google Drive API not configured → Follow setup steps above
- **404 Error**: No local data → Download from Google Drive or configure API
- **Rate Limits**: Google Drive API has daily quotas (usually sufficient for development)

---

**Need Help?** Check the setup guide in the dashboard when you see an error!
