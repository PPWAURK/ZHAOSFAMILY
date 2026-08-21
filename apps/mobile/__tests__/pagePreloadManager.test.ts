import { storeManagementQueryKeys } from "@zhao/api";
import { Image } from "expo-image";
import { prepareStoresPage, selectCriticalImageUrls } from "@/lib/pagePreloadManager";
import { APP_IMAGE_LOAD_PRIORITIES } from "@/lib/imagePriority";

describe("APP_IMAGE_LOAD_PRIORITIES", () => {
  it("maps P0, P1, and P2 images to Expo image request priorities", () => {
    expect(APP_IMAGE_LOAD_PRIORITIES).toEqual({
      critical: "high",
      important: "normal",
      lazy: "low",
    });
  });
});

describe("selectCriticalImageUrls", () => {
  it("keeps only unique remote images within the P0 preload budget", () => {
    expect(
      selectCriticalImageUrls([
        "https://cdn.example.com/one.jpg",
        "https://cdn.example.com/one.jpg",
        "http://cdn.example.com/two.jpg",
        "https://cdn.example.com/three.jpg",
        "https://cdn.example.com/four.jpg",
      ]),
    ).toEqual([
      "https://cdn.example.com/one.jpg",
      "http://cdn.example.com/two.jpg",
      "https://cdn.example.com/three.jpg",
    ]);
  });

  it("ignores empty and non-remote image sources", () => {
    expect(selectCriticalImageUrls([null, "", "/assets/store.jpg", "file:///tmp/store.jpg"])).toEqual(
      [],
    );
  });
});

describe("prepareStoresPage", () => {
  it("only preloads the current user's store data and critical store images", async () => {
    const prefetch = jest.spyOn(Image, "prefetch").mockResolvedValue(true);
    const ensureQueryData = jest.fn().mockResolvedValue([
      { photoUri: "https://cdn.example.com/store.jpg" },
    ]);

    try {
      await prepareStoresPage({ ensureQueryData } as never, 42);

      expect(ensureQueryData).toHaveBeenCalledTimes(1);
      expect(ensureQueryData).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: storeManagementQueryKeys.stores(42),
        }),
      );
      expect(prefetch).toHaveBeenCalledWith(["https://cdn.example.com/store.jpg"], "memory-disk");
    } finally {
      prefetch.mockRestore();
    }
  });
});
