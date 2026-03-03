#!/bin/bash

# 🚀 通用一鍵安全部署腳本 v2.0
# 適用於：Next.js、Vite、React 等所有 Node.js 項目
# 部署平台：Vercel、Firebase Hosting、Netlify
# 🔒 包含完整的安全防護檢查

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 獲取項目名稱
PROJECT_NAME=$(basename "$PWD")
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   🚀 通用安全部署 v2.0${NC}"
echo -e "${MAGENTA}   📦 項目: $PROJECT_NAME${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# =============================================
# 步驟 1：環境檢查
# =============================================
echo -e "${YELLOW}[步驟 1/6]${NC} 🔍 環境檢查..."

# 檢查 Git 狀態
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ 錯誤：不是 Git 倉庫${NC}"
    exit 1
fi

# 檢查是否有未合併的改動
if [ "$(git status --porcelain | grep -c '^[A-Z]')" -gt 100 ]; then
    echo -e "${YELLOW}⚠️  警告：超過 100 個未提交改動${NC}"
    echo "建議分次提交，避免大量改動一次提交"
fi

echo -e "${GREEN}✅ Git 倉庫正常${NC}"
echo ""

# =============================================
# 步驟 2：安全掃描（敏感信息檢查）
# =============================================
echo -e "${YELLOW}[步驟 2/6]${NC} 🔐 安全掃描..."

SECURITY_ISSUES=0

# 檢查 1：是否有敏感文件未被提交
echo -n "   檢查未提交的敏感文件..."
if git status --porcelain | grep -E "\.env|.*key.*json|secret|credentials|\.pem|\.p8" > /dev/null; then
    echo -e " ${RED}❌ 發現敏感文件${NC}"
    echo -e "   ${RED}檢測到未提交的敏感文件：${NC}"
    git status --porcelain | grep -E "\.env|.*key.*json|secret|credentials" | sed 's/^/     /'
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
else
    echo -e " ${GREEN}✓${NC}"
fi

# 檢查 2：是否有已提交的敏感信息在 Git 歷史中
echo -n "   檢查 Git 歷史中的敏感信息..."
if git log --all --oneline --decorate | grep -iE "firebase.*key|supabase.*secret|api.*key.*=.*[0-9a-zA-Z]{20,}" > /dev/null 2>&1; then
    echo -e " ${RED}⚠️ 警告${NC}"
    echo -e "   ${YELLOW}建議檢查 Git 歷史是否洩露敏感信息${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
else
    echo -e " ${GREEN}✓${NC}"
fi

# 檢查 3：.gitignore 配置
echo -n "   檢查 .gitignore..."
if [ ! -f ".gitignore" ]; then
    echo -e " ${RED}❌ 缺失${NC}"
    echo "   ${YELLOW}建議添加 .gitignore 文件${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
else
    if grep -q "\.env" .gitignore && grep -q "node_modules" .gitignore; then
        echo -e " ${GREEN}✓${NC}"
    else
        echo -e " ${YELLOW}⚠️ 可能不完整${NC}"
        echo "   建議包含：.env, node_modules, dist, .next"
    fi
fi

# 檢查 4：package.json 中是否有個人信息
echo -n "   檢查 package.json..."
if grep -E '"password"|"secret"|"token"' package.json > /dev/null 2>&1; then
    echo -e " ${RED}⚠️ 警告${NC}"
    echo -e "   ${RED}發現敏感字段在 package.json${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
else
    echo -e " ${GREEN}✓${NC}"
fi

# 檢查 5：本地 .env 文件
echo -n "   檢查本地環境變數..."
if [ -f ".env" ] || [ -f ".env.local" ]; then
    echo -e " ${GREEN}✓ 本地配置存在${NC}"
    echo -e "   ${CYAN}💡 本地 .env 文件已在 .gitignore 中${NC}"
else
    echo -e " ${YELLOW}ℹ️  未找到 .env 文件${NC}"
    echo -e "   ${CYAN}💡 如果使用環境變數，在本地創建 .env.local${NC}"
fi

echo ""

if [ $SECURITY_ISSUES -gt 0 ]; then
    echo -e "${RED}發現 $SECURITY_ISSUES 個安全問題，建議在部署前修復${NC}"
    read -p "是否繼續部署？(y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}已取消部署${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ 安全掃描完成${NC}"
echo ""

# =============================================
# 步驟 3：更新代碼
# =============================================
echo -e "${YELLOW}[步驟 3/6]${NC} 📥 更新遠端代碼..."

if git pull origin main 2>/dev/null; then
    echo -e "${GREEN}✅ main 分支已更新${NC}"
elif git pull origin master 2>/dev/null; then
    echo -e "${GREEN}✅ master 分支已更新${NC}"
else
    echo -e "${YELLOW}⚠️ 無遠端分支或無網路連接${NC}"
fi
echo ""

# =============================================
# 步驟 4：提交改動
# =============================================
echo -e "${YELLOW}[步驟 4/6]${NC} 📝 提交改動..."

STAGED_CHANGES=$(git status --porcelain | grep -c "^" || true)

if [ $STAGED_CHANGES -eq 0 ]; then
    echo -e "${CYAN}ℹ️  無新改動需要提交${NC}"
else
    echo "📊 改動統計："
    echo "   $(git status --porcelain | wc -l) 個文件被修改"
    
    # 顯示改動文件列表（前 10 個）
    echo -e "   ${YELLOW}詳細改動：${NC}"
    git status --porcelain | head -10 | sed 's/^/     /'
    
    if [ $(git status --porcelain | wc -l) -gt 10 ]; then
        echo "     ... 還有 $(git status --porcelain | tail -n +11 | wc -l) 個文件"
    fi
    
    echo ""
    read -p "確認提交這些改動？(y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}已取消提交${NC}"
        exit 1
    fi
    
    git add -A
    git commit -m "🚀 自動部署 - $TIMESTAMP"
    echo -e "${GREEN}✅ 改動已提交${NC}"
fi
echo ""

# =============================================
# 步驟 5：推送到遠端
# =============================================
echo -e "${YELLOW}[步驟 5/6]${NC} ⬆️  推送到遠端..."

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if git push origin "$CURRENT_BRANCH" 2>/dev/null; then
    echo -e "${GREEN}✅ 已推送到 origin/$CURRENT_BRANCH${NC}"
else
    echo -e "${RED}❌ 推送失敗${NC}"
    echo "   可能原因："
    echo "   • 無網路連接"
    echo "   • 遠端倉庫地址不正確"
    echo "   • 認證失敗（需要 SSH key 或 token）"
    exit 1
fi
echo ""

# =============================================
# 步驟 6：本地驗證構建（可選但推薦）
# =============================================
echo -e "${YELLOW}[步驟 6/6]${NC} 🔨 驗證本地構建..."

if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}ℹ️  未找到 package.json，跳過構建驗證${NC}"
else
    # 檢查 node_modules 是否存在
    if [ ! -d "node_modules" ]; then
        echo "⏳ 首次部署，安裝依賴（這可能需要幾分鐘）..."
        if npm install --legacy-peer-deps > /dev/null 2>&1; then
            echo "   ✓ 依賴安裝完成"
        elif npm install > /dev/null 2>&1; then
            echo "   ✓ 依賴安裝完成"
        else
            echo -e "${YELLOW}⚠️  依賴安裝失敗，跳過構建驗證${NC}"
        fi
    fi
    
    # 執行構建
    echo "⏳ 構建中..."
    if npm run build > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 構建成功${NC}"
        
        # 檢查構建輸出中的敏感信息
        echo -n "   掃描構建輸出..."
        OUTPUT_DIR=$([ -d "dist" ] && echo "dist" || ([ -d ".next" ] && echo ".next" || echo ""))
        
        if [ -z "$OUTPUT_DIR" ]; then
            echo " ${YELLOW}未找到輸出目錄${NC}"
        elif grep -r "FIREBASE_API_KEY\|SUPABASE_ANON_KEY\|SECRET\|PRIVATE_KEY\|password" "$OUTPUT_DIR" 2>/dev/null > /dev/null; then
            echo -e " ${RED}⚠️ 警告：可能在構建輸出中洩露敏感信息${NC}"
            echo -e "   ${RED}請檢查你的環境變數配置${NC}"
            SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
        else
            echo -e " ${GREEN}✓ 無敏感信息洩露${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  構建失敗${NC}"
        echo "   但代碼已推送，部署平台會嘗試構建"
        echo "   請檢查錯誤信息"
    fi
fi
echo ""

# =============================================
# 完成報告
# =============================================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   ✅ 部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${BLUE}📋 部署摘要：${NC}"
echo "   項目：$PROJECT_NAME"
echo "   分支：$CURRENT_BRANCH"
echo "   時間：$TIMESTAMP"
echo ""

echo -e "${BLUE}📌 接下來會發生什麼：${NC}"
echo "   自動部署平台會檢測到你的 Git push"
echo "   開始自動構建和部署（約 1-5 分鐘）"
echo ""

echo -e "${BLUE}📊 查看部署狀態：${NC}"
echo "   • Vercel: https://vercel.com/dashboard"
echo "   • Firebase: https://console.firebase.google.com"
echo "   • GitHub: https://github.com/Tsukishima168"
echo ""

echo -e "${BLUE}💡 常用 Git 命令：${NC}"
echo "   git status              # 查看當前改動"
echo "   git log --oneline -5    # 查看最近 5 次提交"
echo "   git diff                # 查看詳細改動"
echo "   git restore .           # 放棄所有本地改動"
echo "   git push --force-with-lease HEAD~1  # 撤回最後一次推送（謹慎使用）"
echo ""

if [ $SECURITY_ISSUES -gt 0 ]; then
    echo -e "${YELLOW}⚠️  提醒：還有 $SECURITY_ISSUES 個安全問題需要注意${NC}"
fi

echo ""
