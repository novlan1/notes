const MESSAGE_LIST = [
  {
    text: 'Press UI',
    link: 'https://novlan1.github.io/press-ui/',
  },
  {
    text: 'T Comm',
    link: 'https://novlan1.github.io/t-comm/',
  },
  {
    text: 'Plugin Light',
    link: 'https://novlan1.github.io/plugin-light/',
  },
  {
    text: 'ONE',
    link: 'https://novlan1.github.io/one/',
  },
  {
    text: 'GAME',
    link: 'https://novlan1.github.io/canvas-game/',
  },
  {
    text: 'Comment',
    link: 'https://novlan1.github.io/comment-code-online/',
  },
  {
    text: 'More CSS',
    link: 'https://novlan1.github.io/more-css/',
  }
];

export function getFooterMessage() {
  return MESSAGE_LIST
    .map(item => `<a href="${item.link}" target="_blank" style="text-decoration: none;">${item.text}</a>`)
    .join('<span style="width: 20px;display: inline-block;"> | </span>');
}
