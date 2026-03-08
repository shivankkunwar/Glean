import { startQueueProcessor } from '../utils/queue';

export default defineNitroPlugin(() => {
  startQueueProcessor();
});
