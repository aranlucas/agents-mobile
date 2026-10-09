# Your AI agents, ready when you are

[![CI](https://github.com/aranlucas/agents-mobile/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/aranlucas/agents-mobile/actions/workflows/ci.yml)
![Expo](https://img.shields.io/badge/Expo-57-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-mobile-61DAFB?logo=react&logoColor=111)

![Illustration of travel, grocery, fitness, and wellness agent workflows on the move](docs/images/readme-cover.png)

*Concept artwork for the mobile app; it is not a product screenshot.*


Take your travel plans, grocery list, fitness routine, and wellness check-in with you. Agents Mobile is the Expo client for four workflows served by the Go [Agents gateway](https://github.com/aranlucas/agents). Each tab pairs an agent conversation with a compact view of the state it produces.

## Ask, plan, and keep moving

Sign in with Clerk, tell an agent what you need, and refine the result in chat. The app refreshes your Clerk session token before each agent run. In Fitness, Android Health Connect can share activity data with the same authenticated gateway.

~~~text
Travel   → Turn a few ideas into a trip plan.
Grocery  → Plan meals and organize the shop.
Fitness  → Plan activity and sync Health Connect data on Android.
Wellness → Coordinate a wellness plan with the agent.
~~~

## Configure the app

Requirements: Node.js from `.node-version`, pnpm 12.6, and an Expo development build for the custom Health Connect module. Expo Go does not include that module. Android builds need an Android SDK; local iOS builds need macOS and Xcode.

~~~sh
pnpm install
cp .env.example .env.local
~~~

Set these values in `.env.local`:

| Variable | Use |
| --- | --- |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk sign-in. |
| `EXPO_PUBLIC_COPILOTKIT_RUNTIME_URL` | CopilotKit runtime URL hosted by the Go gateway. |
| `EXPO_PUBLIC_AGENTS_BASE_URL` | Gateway base URL used by Health Connect sync. |
| `EXPO_PUBLIC_SENTRY_DSN` | Optional client error reporting. |

Start the Expo server or launch a native development build:

~~~sh
pnpm start
pnpm android
pnpm ios
pnpm web
~~~

When using an Android emulator, local gateway URLs are rewritten to the emulator host `10.0.2.2`.


## Local URLs with Portless

This command serves the Expo web client in a browser on the development machine.

The standard development command uses [Portless](https://github.com/vercel-labs/portless).
Install its pinned CLI once with Node.js 24 or newer, then run this repository's command after the
normal dependency and environment setup:

```sh
npm install -g portless@0.15.7
pnpm web
```

The main checkout uses `https://agents-mobile.localhost` with the default proxy settings.
Use the URL printed by Portless if you have changed its proxy port, TLS, or TLD.
Linked Git worktrees get a branch prefix, so each checkout has its own origin.
The first HTTPS run can request local administrator permission to bind port 443,
trust its development certificate, and synchronize local hostnames. Ctrl+C stops
the child server and removes its route. The direct fallback below starts the
server without the proxy.

Use `pnpm web:direct` for the direct browser server and `pnpm start`, `pnpm android`,
or `pnpm ios` for native development. A phone or emulator does not resolve your
computer's `.localhost` name to your computer; keep its existing gateway URL and
native development-client workflow. For browser sign-in, use your development
Clerk instance and authorize the actual browser origin where required. The gateway
must allow that exact origin for browser API calls.

## Peek under the hood

- `src/app/` contains the Travel, Grocery, Fitness, and Wellness routes.
- `src/components/agent-screen.tsx` and `src/components/app-tabs.tsx` provide shared agent screens and navigation.
- `src/hooks/use-health-data-sync.ts` handles activity synchronization.
- `modules/health-data/` is the Android Health Connect Expo module.
- `src/native-markdown/` contains the app's local chat Markdown renderer.
- `packages/types/` defines shared runtime contracts.

~~~sh
pnpm lint
pnpm fmt:check
pnpm typecheck
pnpm test
~~~

EAS build profiles are in [`eas.json`](eas.json).
