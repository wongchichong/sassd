# sass-d

Generate TypeScript definitions (.d.ts) for SCSS module (*.module.scss). 

By using [sass](https://sass-lang.com/) and [typed-css-modules](https://www.npmjs.com/package/typed-css-modules)


If the following library does't work as expected, then try sassd.

[vite-plugin-sass-dts](https://github.com/activeguild/vite-plugin-sass-dts)

[typed-scss-modules](https://github.com/skovy/typed-scss-modules)

## Installation
```bash
pnpm add -g sass typed-css-modules sass-d
yarn add -g sass typed-css-modules sass-d
```

## Excuting sassd not -d (npm naming thingy)
```bash
sassd ./styles --deleteCss
```
