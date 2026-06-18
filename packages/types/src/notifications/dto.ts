import type { PushTokenPlatform } from "./models";

export type RegisterPushTokenRequest = {
  token: string;
  platform: PushTokenPlatform;
  deviceName?: string;
};

export type UnregisterPushTokenRequest = {
  token: string;
};
