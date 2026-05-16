export interface MenuItemAvailabilitySettings {
  is_available?: boolean | null;
  available_from?: string | null;
  available_until?: string | null;
  unavailable_dates?: string[] | null;
  available_weekdays?: string[] | null;
  min_advance_hours?: number | null;
}

export interface MenuItemAvailabilityResult {
  available: boolean;
  reason: string;
}

export function isMissingSupabaseRpcError(error: unknown, functionName?: string) {
  const maybeError = error as { code?: string; message?: string; details?: string } | null;
  if (!maybeError) return false;

  const message = `${maybeError.message ?? ''} ${maybeError.details ?? ''}`;
  return (
    maybeError.code === 'PGRST202' &&
    (!functionName || message.includes(functionName))
  );
}

export function normalizeMenuItemAvailabilityResult(data: unknown): MenuItemAvailabilityResult | null {
  const value = Array.isArray(data) ? data[0] : data;
  if (!value || typeof value !== 'object') return null;

  const row = value as { available?: unknown; reason?: unknown };
  if (typeof row.available !== 'boolean') return null;

  return {
    available: row.available,
    reason: typeof row.reason === 'string' ? row.reason : row.available ? '可預訂' : '商品目前不可訂購',
  };
}

export function evaluateMenuItemAvailability(
  settings: MenuItemAvailabilitySettings | null | undefined,
  deliveryDate: string,
  currentTime: Date = new Date(),
): MenuItemAvailabilityResult {
  if (!settings) {
    return { available: true, reason: '無特殊限制' };
  }

  if (settings.is_available === false) {
    return { available: false, reason: '此項目已停止提供' };
  }

  if (settings.unavailable_dates?.includes(deliveryDate)) {
    return { available: false, reason: '此日期材料用盡或停止提供' };
  }

  if (Array.isArray(settings.available_weekdays)) {
    const weekday = getIsoDateWeekday(deliveryDate);
    if (!settings.available_weekdays.includes(String(weekday))) {
      return { available: false, reason: '此項目在此日期不提供' };
    }
  }

  const minAdvanceHours = Number(settings.min_advance_hours ?? 0);
  if (Number.isFinite(minAdvanceHours) && minAdvanceHours > 0) {
    const hoursUntilDelivery = getHoursUntilTaipeiDate(deliveryDate, currentTime);
    if (hoursUntilDelivery < minAdvanceHours) {
      return {
        available: false,
        reason: `訂單時間距離交付日期不足${minAdvanceHours}小時`,
      };
    }
  }

  if (settings.available_from && settings.available_until) {
    const nowMinutes = getTaipeiMinutes(currentTime);
    const fromMinutes = parseTimeMinutes(settings.available_from);
    const untilMinutes = parseTimeMinutes(settings.available_until);

    if (
      fromMinutes !== null &&
      untilMinutes !== null &&
      !isWithinTimeWindow(nowMinutes, fromMinutes, untilMinutes)
    ) {
      return { available: false, reason: '此項目目前不在開放訂購時間' };
    }
  }

  return { available: true, reason: '可預訂' };
}

function getIsoDateWeekday(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function getHoursUntilTaipeiDate(date: string, currentTime: Date) {
  const deliveryAtTaipeiMidnight = Date.parse(`${date}T00:00:00+08:00`);
  return Math.floor((deliveryAtTaipeiMidnight - currentTime.getTime()) / 3_600_000);
}

function getTaipeiMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

function parseTimeMinutes(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;

  return hour * 60 + minute;
}

function isWithinTimeWindow(current: number, start: number, end: number) {
  if (start <= end) {
    return current >= start && current <= end;
  }

  return current >= start || current <= end;
}
