# 🚀 TypeScript Template

A friendly TypeScript starter for Node.js ESM projects, with testing, linting, and formatting ready to go.

## ✨ What's Included

- ⚡ TypeScript + Node.js ESM setup
- 🧪 Vitest for fast, native ESM testing
- 🧹 XO linting and Prettier formatting
- 🧭 Import aliases via `package.json#imports`

## 📋 Requirements

- Node.js 24.15+ or 26+ (Vitest 5 doesn't support Node 25)

## 🧩 TypeScript 7

`tsc` is TypeScript 7 (the `@typescript/native` package). XO lints through typescript-eslint, which needs the TypeScript 6 API that 7.0 doesn't ship, so `typescript` is aliased to `@typescript/typescript6`, following [Microsoft's side-by-side setup](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0). Drop the alias once typescript-eslint supports TypeScript 7.

## 🛠️ Setup

```bash
npm install
```

## ▶️ Scripts

- `npm start` - Run the app with `tsx`
- `npm test` - Run Vitest tests
- `npm run lint` - Lint code with XO
- `npm run format` - Format files with Prettier

## 📁 Project Structure

- `src/index.ts` - Entry point example
- `src/modules/greet.ts` - Sample module
- `tests/index.test.ts` - Sample Vitest test
- `tsconfig.json` - TypeScript config extending `@tsconfig/node24`

## 🧭 Path Aliases

- `#src/*` -> `src/*`
- `#modules/*` -> `src/modules/*`

Use `.js` import specifiers in TypeScript source to match Node ESM resolution.
