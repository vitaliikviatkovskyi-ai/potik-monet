import { getStore } from '@netlify/blobs';
import { createShareHandler } from '../lib/shares-core.mjs';

export default createShareHandler(() => getStore({ name: 'potik-goal-shares', consistency: 'strong' }));
