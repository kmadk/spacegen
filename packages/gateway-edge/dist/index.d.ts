import * as hono_types from 'hono/types';
import { Hono } from 'hono';

declare function createApp(): Hono<hono_types.BlankEnv, hono_types.BlankSchema, "/">;

export { createApp };
