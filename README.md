# VALEN TOOLS
Personal AI chat web app for VannAPI.

## Deploy with GitHub + Vercel
1. Create a GitHub repository and upload the contents of this folder.
2. Import the repository at Vercel.
3. In Vercel > Project Settings > Environment Variables, add:
   - Name: `VANNS_API_KEY`
   - Value: your private VannAPI key
4. Redeploy.

Never commit your real API key or put it in frontend code.

## Local development
Requires Node.js 20+.
```bash
npm install
cp .env.example .env.local
npm run dev
```
Set your key in `.env.local` before running.

Chat history is saved in this browser's local storage only; it is not synced across devices.
The model IDs are taken from the model list supplied for this project.
