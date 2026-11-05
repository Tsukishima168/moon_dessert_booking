import { Fragment } from 'react';

// 把純文字裡的 http(s) 網址變成可點擊的站外連結（另開分頁）。
// 給「文案存成字串」的頁面（FAQ、服務條款）用：字串本身仍是純文字，可同時進 JSON-LD，不必改成 JSX。
// 網址在全形標點、括號或空白處結束，例如「…（https://lin.ee/MndRHE2）詢問」只會連到網址本身。
const URL_PATTERN = /(https?:\/\/[^\s，。；：、（）()]+)/g;

export default function LinkifyText({ text }: { text: string }) {
  // split 帶捕捉群組時，奇數索引就是比對到的網址。
  const parts = text.split(URL_PATTERN);

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-moon-accent underline underline-offset-4 hover:text-moon-text transition-colors"
          >
            {part}
          </a>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        )
      )}
    </>
  );
}
