#!/bin/bash
# 將 Discord Webhook URL 加入 Vercel 環境變數
# 用法: ./scripts/setup-discord-env.sh "https://discord.com/api/webhooks/你的ID/你的Token"

set -e
URL="$1"

if [ -z "$URL" ]; then
  echo "用法: ./scripts/setup-discord-env.sh \"https://discord.com/api/webhooks/ID/Token\""
  echo ""
  echo "如何取得 Webhook URL："
  echo "  1. 開啟 Discord → dessert-booking 頻道"
  echo "  2. 右鍵頻道 → 編輯頻道 → 整合 → Webhook → 新增"
  echo "  3. 複製 Webhook URL"
  exit 1
fi

if [[ ! "$URL" =~ ^https://discord\.com/api/webhooks/ ]]; then
  echo "錯誤：URL 格式應為 https://discord.com/api/webhooks/ID/Token"
  exit 1
fi

echo "正在將 DISCORD_WEBHOOK_URL 加入 Vercel (production, preview, development)..."
echo "$URL" | npx vercel env add DISCORD_WEBHOOK_URL production
echo "$URL" | npx vercel env add DISCORD_WEBHOOK_URL preview
echo "$URL" | npx vercel env add DISCORD_WEBHOOK_URL development

echo ""
echo "✅ 完成！請執行以下指令重新部署："
echo "   npx vercel --prod"
echo "或到 Vercel Dashboard 手動觸發部署。"
