import { DurableObject, env } from 'cloudflare:workers';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

export class Counter extends DurableObject {
    count: number = 0;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        ctx.blockConcurrencyWhile(async () => {
            const stored = await ctx.storage.get<number>('count');
            this.count = stored || 0;
        });
    }

    async getCount() {
        return this.count;
    }

    async incrementCount() {
        this.count++;
        await this.ctx.storage.put('count', this.count);
        return this.count;
    }
}

export class RateLimiter extends DurableObject {
    async check(): Promise<{ waitMs: number; rejected: boolean }> {
        const now = Date.now();
        const windowStart = now - this.env.REQUESTS_WINDOW_MS;

        const stored = await this.ctx.storage.get<number[]>('timestamps');
        const timestamps = stored ?? [];

        // only keep timestamps happened in the past REQUESTS_WINDOW_MS
        const active = timestamps.filter(
            (timestamp) => timestamp > windowStart
        );

        let waitMs = 0;
        if (active.length >= this.env.ALLOWED_REQUESTS) {
            active.sort((a, b) => a - b);

            const oldestValid =
                active[active.length - this.env.ALLOWED_REQUESTS];

            if (oldestValid !== undefined)
                waitMs = Math.max(
                    0,
                    oldestValid + this.env.REQUESTS_WINDOW_MS - now + 1
                );
        }

        if (waitMs > this.env.MAX_WAIT_MS) return { waitMs, rejected: true };

        active.push(now + waitMs);
        await this.ctx.storage.put(
            'timestamps',
            active.filter(
                (timestamp) =>
                    timestamp > now + waitMs - this.env.REQUESTS_WINDOW_MS
            )
        );

        return { waitMs, rejected: false };
    }
}

const app = new Hono<{ Bindings: Env }>();

app.use(
    '*',
    cors({
        origin: env.ALLOWED_ORIGINS,
        allowMethods: ['GET', 'POST']
    })
);

app.get('/', async (ctx) => {
    const counter = ctx.env.COUNTER_DO.getByName('counter');
    const count = await counter.getCount();
    return ctx.json({ count });
});

app.post('/', async (ctx) => {
    const ip = ctx.req.header('CF-Connecting-IP') ?? 'anonymous';
    const ratelimiter = ctx.env.RATE_LIMITER_DO.get(
        ctx.env.RATE_LIMITER_DO.idFromName(ip)
    );
    const { waitMs, rejected } = await ratelimiter.check();

    if (rejected)
        return ctx.json({ error: 'Too many requests, slow down :(' }, 429);

    if (waitMs > 0) await scheduler.wait(waitMs);

    const counter = ctx.env.COUNTER_DO.getByName('counter');
    const count = await counter.incrementCount();
    return ctx.json({ count });
});

export default app satisfies ExportedHandler<Env>;
