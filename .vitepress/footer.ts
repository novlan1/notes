const MESSAGE_LIST = [
  {
    text: 'ONE',
    link: 'https://novlan1.github.io/one/',
  },
  {
    text: 'GAME',
    link: 'https://novlan1.github.io/canvas-game/',
  },
  {
    text: 'CSS',
    link: 'https://novlan1.github.io/more-css/',
  },
  {
    text: 'COMMENT',
    link: 'https://novlan1.github.io/comment-code-online/',
  },
];

export function getFooterMessage() {
  return MESSAGE_LIST
    .map(item => `<a href="${item.link}" target="_blank" style="text-decoration: none;">${item.text}</a>`)
    .join('<span style="width: 20px;display: inline-block;"> | </span>');
}
