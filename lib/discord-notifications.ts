/**
 * Discord 訂單通知集成
 * 當訂單狀態變更時自動推送到 Discord
 */

import { sendDiscordNotify } from '@/lib/notifications';

export async function notifyOrderToDiscord(
    order: any,
    action: 'created' | 'updated' | 'status_change',
    details?: any
) {
    try {
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (!webhookUrl) {
            console.warn('Discord Webhook 未設定，跳過通知');
            return false;
        }

        let title = '';
        let description = '';
        let color = 0xFF69B4; // 預設粉色

        if (action === 'created') {
            title = '🛒 新訂單';
            description = `客戶: ${order.customer_name}\n電話: ${order.phone}`;
            color = 0x0099FF; // 藍色 - 新訂單
        } else if (action === 'status_change') {
            const statusLabels: Record<string, string> = {
                pending: '⏳ 待付款',
                paid: '✅ 已付款',
                preparing: '👨‍🍳 製作中',
                ready: '🎉 可取貨',
                completed: '✨ 已完成',
                cancelled: '❌ 已取消',
            };
            title = statusLabels[order.status] || `狀態變更: ${order.status}`;
            description = `訂單 #${order.order_id}`;
            
            // 根據狀態改變顏色
            const colorMap: Record<string, number> = {
                pending: 0xFFCC00,
                paid: 0x00CC00,
                preparing: 0xFF9900,
                ready: 0x00FF00,
                completed: 0x6666FF,
                cancelled: 0xFF0000,
            };
            color = colorMap[order.status] || 0xFF69B4;
        } else if (action === 'updated') {
            title = '📝 訂單更新';
            description = `訂單 #${order.order_id}`;
            color = 0x9933FF; // 紫色 - 更新
        }

        // 計算商品列表
        const itemsList = (order.items || [])
            .map((item: any) => `• ${item.name}${item.variant_name ? ` (${item.variant_name})` : ''} x${item.quantity}`)
            .join('\n');

        // 建立嵌入式訊息
        const embed = {
            title,
            description,
            color,
            fields: [
                {
                    name: '📦 商品',
                    value: itemsList || '無商品',
                    inline: false,
                },
                {
                    name: '💰 金額',
                    value: `NT$${order.final_price || order.total_price || 0}${order.discount_amount ? ` (已折扣 NT$${order.discount_amount})` : ''}`,
                    inline: true,
                },
                {
                    name: '📍 取貨方式',
                    value: order.delivery_method === 'pickup' 
                        ? `自取: ${order.pickup_time}`
                        : `外送: ${order.delivery_address || '地址待確認'}`,
                    inline: true,
                },
            ],
            footer: {
                text: '月島甜點訂單系統',
                icon_url: 'https://via.placeholder.com/32',
            },
            timestamp: new Date().toISOString(),
        };

        // 發送 Discord 通知
        return await sendDiscordNotify(
            `🎯 訂單通知: ${title}`,
            embed
        );
    } catch (error) {
        console.error('Discord 訂單通知錯誤:', error);
        return false;
    }
}

/**
 * 發送行銷活動通知到 Discord
 */
export async function notifyMarketingCampaignToDiscord(
    campaign: any,
    status: 'started' | 'completed' | 'failed'
) {
    try {
        const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
        if (!webhookUrl) return false;

        const statusConfig = {
            started: {
                title: '📢 行銷活動已開始',
                color: 0x0099FF,
            },
            completed: {
                title: '✅ 行銷活動已完成',
                color: 0x00FF00,
            },
            failed: {
                title: '❌ 行銷活動失敗',
                color: 0xFF0000,
            },
        };

        const config = statusConfig[status];

        const embed = {
            title: config.title,
            description: `活動: ${campaign.name}`,
            color: config.color,
            fields: [
                {
                    name: '📝 說明',
                    value: campaign.description || '無',
                    inline: false,
                },
                {
                    name: '👥 目標客戶',
                    value: `${campaign.targetAudience || 'N/A'}`,
                    inline: true,
                },
                {
                    name: '📊 統計',
                    value: `發送: ${campaign.sent || 0} | 開啟: ${campaign.opened || 0} | 點擊: ${campaign.clicked || 0}`,
                    inline: true,
                },
            ],
            footer: {
                text: '月島甜點行銷系統',
            },
            timestamp: new Date().toISOString(),
        };

        return await sendDiscordNotify(`行銷活動通知: ${config.title}`, embed);
    } catch (error) {
        console.error('Discord 活動通知錯誤:', error);
        return false;
    }
}
