const { withAndroidManifest } = require("@expo/config-plugins");

const AD_ID_COLLECTION_META_DATA =
  "google_analytics_adid_collection_enabled";
const ADVERTISING_PERMISSIONS = [
  "com.google.android.gms.permission.AD_ID",
  "android.permission.ACCESS_ADSERVICES_AD_ID",
  "android.permission.ACCESS_ADSERVICES_ATTRIBUTION",
];

function removeAdvertisingPermissions(androidManifest) {
  androidManifest.$ = androidManifest.$ ?? {};
  androidManifest.$["xmlns:tools"] ??=
    "http://schemas.android.com/tools";

  const permissions = androidManifest["uses-permission"] ?? [];

  for (const permissionName of ADVERTISING_PERMISSIONS) {
    const existingPermission = permissions.find(
      permission => permission.$?.["android:name"] === permissionName,
    );

    if (existingPermission) {
      existingPermission.$["tools:node"] = "remove";
      continue;
    }

    permissions.push({
      $: {
        "android:name": permissionName,
        "tools:node": "remove",
      },
    });
  }

  androidManifest["uses-permission"] = permissions;
}

function withDisableAdId(config) {
  return withAndroidManifest(config, config => {
    const androidManifest = config.modResults.manifest;
    const application = androidManifest.application?.[0];

    if (!application) {
      throw new Error("AndroidManifest.xml must contain an application element.");
    }

    removeAdvertisingPermissions(androidManifest);

    const metaData = application["meta-data"] ?? [];
    const existingMetaData = metaData.find(
      item => item.$?.["android:name"] === AD_ID_COLLECTION_META_DATA,
    );

    if (existingMetaData) {
      existingMetaData.$["android:value"] = "false";
      existingMetaData.$["tools:replace"] = "android:value";
    } else {
      metaData.push({
        $: {
          "android:name": AD_ID_COLLECTION_META_DATA,
          "android:value": "false",
          "tools:replace": "android:value",
        },
      });
    }

    application["meta-data"] = metaData;

    return config;
  });
}

module.exports = withDisableAdId;
