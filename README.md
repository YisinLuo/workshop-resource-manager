<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1y6-JpCuCsUnOybMVG_5IE4iTSYJSDd9L

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Backend (Google Apps Script) FAQ

### Q: 針對歸還登記，需要在 Google Sheet 新增欄位嗎？
**不需要手動新增。** 

只要您在 GAS 編輯器中執行過 `setup()` 函數，程式會自動建立並維護所需的工作表與欄位：

1. **ResourceSessions (資源借用表)**：
   - 欄位：`id`, `items`, `borrower`, `dept`, `borrowTime`, `transferLogs`, `returnedItems`, `status`, `timestamp`
   
2. **ResourceHistory (歸還歷史表)**：
   - 欄位：`id`, `sessionId`, `borrower`, `borrowTime`, `returner`, `returnTime`, `notes`, `transferLogs`, `itemDetails`, `timestamp`

若發現缺少這些工作表，請再次執行 `setup()` 即可。
