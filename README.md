# Cloudflare Counter

A rate-limited counter application built with [Cloudflare Workers](https://workers.cloudflare.com/), [Hono](https://hono.dev/), and [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/).

## Configuration

The application is configured primarily through `wrangler.toml`.

The following environment variables can be adjusted in your `[vars]` section to tune the rate-limiting behavior:

- `ALLOWED_REQUESTS`: Number of requests allowed per timeframe.
- `REQUESTS_WINDOW_MS`: The timeframe sliding window in milliseconds.
- `MAX_WAIT_MS`: The maximum time in milliseconds the server will queue/wait a request before outright rejecting it.

## Local Development

1. Install dependencies:

```bash
bun install
```

2. Start the local development server:

```bash
bun run dev
```

3. Format code:

```bash
bun run format
```

4. Deploy to Cloudflare:

```bash
bun run deploy
```

## Contributing

Contributions are welcome! Feel free to [open an issue](https://github.com/madkarmaa/cloudflare-counter/issues/new) or submit a pull request if you'd like to improve the tool or fix any bugs.

## License

This project is licensed under the [MIT License](./LICENSE).
