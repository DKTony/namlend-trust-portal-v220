import AsyncStorage from '@react-native-async-storage/async-storage';

export type OfflineOpType = 'approve_request' | 'reject_request' | 'initiate_payment' | 'upload_document' | 'loan_application';

export interface OfflineOperation {
  id: string; // uuid
  type: OfflineOpType;
  payload: any;
  createdAt: number;
}

const STORAGE_KEY = 'offline_queue_v1';

async function readQueue(): Promise<OfflineOperation[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: OfflineOperation[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export async function enqueue(op: Omit<OfflineOperation, 'id' | 'createdAt'>): Promise<OfflineOperation> {
  const item: OfflineOperation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
    ...op,
  };
  const queue = await readQueue();
  queue.push(item);
  await writeQueue(queue);
  return item;
}

export async function dequeueAll(): Promise<OfflineOperation[]> {
  const queue = await readQueue();
  await writeQueue([]);
  return queue;
}

export type ProcessorMap = {
  [K in OfflineOpType]?: (payload: any) => Promise<void>;
};
export async function processQueueWith(processors: ProcessorMap): Promise<{ processed: number; failed: number }> {
  const queue = await readQueue();
  if (!queue.length) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;
  const remaining: OfflineOperation[] = [];

  for (const op of queue) {
    const fn = processors[op.type];
    if (!fn) {
      remaining.push(op); // no processor defined yet
      failed++;
      continue;
    }
    try {
      await fn(op.payload);
      processed++;
    } catch (e) {
      remaining.push(op); // keep for later retry
      failed++;
    }
  }

  await writeQueue(remaining);
  return { processed, failed };
}
