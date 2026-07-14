/**
 * JSON-LD 序列化：把 `<` 轉義成 `<`，避免字串內的 `</script>` 提前關閉
 * script 標籤造成 XSS。任何要塞進 <script type="application/ld+json"> 的
 * 物件都必須經過本函式，即使目前內容是寫死的靜態文字——來源哪天接上 DB
 * 就會變成注入點。
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
