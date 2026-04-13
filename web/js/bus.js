// Thin wrapper around Supabase Realtime Broadcast.
// Ephemeral pub/sub — no schema, no RLS.
// All devices on the same CHANNEL_NAME share one "latest prediction" stream.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY, CHANNEL_NAME } from "./config.js";

const EVENT = "prediction";
const DEVICE_ID = (() => {
  try {
    const k = "har-device-id";
    let v = localStorage.getItem(k);
    if (!v) {
      v = Math.random().toString(36).slice(2, 8);
      localStorage.setItem(k, v);
    }
    return v;
  } catch {
    return Math.random().toString(36).slice(2, 8);
  }
})();

export function createBus({ onPrediction } = {}) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 10 } },
  });
  const channel = client.channel(CHANNEL_NAME, {
    config: { broadcast: { self: false, ack: false } },
  });

  let subscribed = false;
  const readyP = new Promise((resolve) => {
    channel
      .on("broadcast", { event: EVENT }, ({ payload }) => {
        try { onPrediction?.(payload); } catch (err) {
          console.error("onPrediction handler threw", err);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          subscribed = true;
          resolve();
        }
      });
  });

  async function publish(payload) {
    if (!subscribed) await readyP;
    return channel.send({
      type: "broadcast",
      event: EVENT,
      payload: { ...payload, device: DEVICE_ID },
    });
  }

  function close() {
    client.removeChannel(channel);
  }

  return { publish, close, ready: readyP, deviceId: DEVICE_ID };
}

export { DEVICE_ID };
