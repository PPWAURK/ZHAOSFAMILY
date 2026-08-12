import { mobileApiClient } from '@/lib/api';

export function recordMobileModuleOpen(moduleName: string): void {
  void mobileApiClient
    .post('/analytics/mobile/events', { moduleName })
    .catch(() => {
      // Usage reporting must not delay navigation when the device is offline.
    });
}
