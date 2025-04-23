const MESSAGE_LIST = [
  { text: 'Press UI', link: 'https://github.com/novlan1/press-ui/' },
  { text: 'T Comm', link: 'https://github.com/novlan1/t-comm/' },
  {
    text: 'Plugin Light',
    link: 'https://github.com/novlan1/plugin-light/',
  },
];

export function getFooterMessage() {
  return MESSAGE_LIST
    .map(item => `<a href="${item.link}" target="_blank" style="text-decoration: none;">${item.text}</a>`)
    .join('<span style="width: 20px;display: inline-block;"> | </span>');
}
