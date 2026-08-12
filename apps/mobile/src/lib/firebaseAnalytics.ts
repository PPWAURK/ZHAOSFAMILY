import Constants from "expo-constants";

type FirebaseAnalyticsClient = {
  logEvent(name: string, parameters?: Record<string, string | number | boolean>): void;
  logScreenView(parameters: { screen_name: string; screen_class: string }): Promise<void>;
  setUserId(userId: string | null): Promise<void>;
  setUserProperties(properties: Record<string, string | null>): Promise<void>;
};

type FirebaseAnalyticsModule = {
  getAnalytics(): unknown;
  logEvent(
    analytics: unknown,
    name: string,
    parameters?: Record<string, string | number | boolean>,
  ): void;
  logScreenView(
    analytics: unknown,
    parameters: { screen_name: string; screen_class: string },
  ): Promise<void>;
  setUserId(analytics: unknown, userId: string | null): Promise<void>;
  setUserProperties(
    analytics: unknown,
    properties: Record<string, string | null>,
  ): Promise<void>;
};

let analyticsClientPromise: Promise<FirebaseAnalyticsClient | null> | null = null;

function getAnalyticsClient(): Promise<FirebaseAnalyticsClient | null> {
  // Expo Go cannot load custom native Firebase modules. Keeping this check
  // before loading the module preserves local Expo Go development while EAS development
  // and production builds use the native SDK.
  if (Constants.executionEnvironment === "storeClient") {
    return Promise.resolve(null);
  }

  if (!analyticsClientPromise) {
    analyticsClientPromise = import("@react-native-firebase/analytics")
      .then((module): FirebaseAnalyticsClient => {
        const firebaseAnalytics = module as unknown as FirebaseAnalyticsModule;
        const analytics = firebaseAnalytics.getAnalytics();

        return {
          logEvent: (
            name: string,
            parameters?: Record<string, string | number | boolean>,
          ): void =>
            firebaseAnalytics.logEvent(analytics, name, parameters),
          logScreenView: (parameters: { screen_name: string; screen_class: string }) =>
            firebaseAnalytics.logScreenView(analytics, parameters),
          setUserId: (userId: string | null) =>
            firebaseAnalytics.setUserId(analytics, userId),
          setUserProperties: (properties: Record<string, string | null>) =>
            firebaseAnalytics.setUserProperties(analytics, properties),
        };
      })
      .catch(() => null);
  }

  return analyticsClientPromise;
}

function ignoreAnalyticsFailure(operation: Promise<void>): void {
  void operation.catch(() => {
    // Analytics must never block product flows when a native build is not yet
    // configured or when the device is offline.
  });
}

export function trackMobileScreen(screenName: string): void {
  void getAnalyticsClient().then((analytics) => {
    if (!analytics) {
      return;
    }

    ignoreAnalyticsFailure(
      analytics.logScreenView({
        screen_name: screenName,
        screen_class: screenName,
      }),
    );
    analytics.logEvent("module_opened", { module_name: screenName });
  });
}

export function identifyAnalyticsUser(user: {
  id: string | number;
  store?: { id?: string | number } | null;
  jobRole?: string | null;
}): void {
  void getAnalyticsClient().then((analytics) => {
    if (!analytics) {
      return;
    }

    ignoreAnalyticsFailure(analytics.setUserId(String(user.id)));
    ignoreAnalyticsFailure(
      analytics.setUserProperties({
        restaurant_id: user.store?.id ? String(user.store.id) : "unassigned",
        employee_job_role: user.jobRole ?? "unassigned",
      }),
    );
  });
}

export function clearAnalyticsUser(): void {
  void getAnalyticsClient().then((analytics) => {
    if (!analytics) {
      return;
    }

    ignoreAnalyticsFailure(analytics.setUserId(null));
    ignoreAnalyticsFailure(
      analytics.setUserProperties({
        restaurant_id: null,
        employee_job_role: null,
      }),
    );
  });
}
