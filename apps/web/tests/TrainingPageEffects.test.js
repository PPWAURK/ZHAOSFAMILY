import React from "react";
import ReactTestRenderer from "react-test-renderer";
import TrainingCoursePage from "@/features/training/pages/TrainingCoursePage";
import TrainingMaterialPlayerPage from "@/features/training/pages/TrainingMaterialPlayerPage";
import TrainingMaterialsPage from "@/features/training/pages/TrainingMaterialsPage";
import TrainingProgressPage from "@/features/training/pages/TrainingProgressPage";
import TrainingSpacePage from "@/features/training/pages/TrainingSpacePage";
import TrainingUploadPage from "@/features/training/pages/TrainingUploadPage";
import {
  createTrainingMaterial,
  deleteTrainingMaterial,
  fetchTrainingCourse,
  fetchTrainingMaterial,
  fetchTrainingMaterials,
  fetchTrainingMyPlan,
  fetchTrainingPositions,
  fetchTrainingStoreProgress,
  updateTrainingMaterial,
  updateTrainingProgress,
  uploadTrainingMedia,
} from "@/features/training/services/trainingMediaApi";

jest.mock("next/link", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ children, ...props }) => React.createElement("a", props, children),
  };
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams("id=material-1"),
}));

jest.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: 7,
      permissions: ["training.position.manage", "training.material.manage"],
      roles: ["super-admin"],
      jobRole: "holding",
    },
    isLoading: false,
  }),
}));

jest.mock("@/shared/components/confirm/ConfirmProvider", () => ({
  useConfirm: () => jest.fn().mockResolvedValue(true),
}));

jest.mock("@/features/training/components/TrainingLayout", () => {
  const React = require("react");
  const { TRAINING_COPY } = require("@/features/training/constants/training-copy");
  const styles = new Proxy({}, { get: (_target, property) => property });

  return {
    __esModule: true,
    default: ({ children, pageCopy }) => {
      const copy = pageCopy?.zh || {};
      const t = { ...TRAINING_COPY.zh, ...copy, shared: TRAINING_COPY.zh.shared };
      return typeof children === "function"
        ? children({ lang: "zh", styles, t })
        : React.createElement(React.Fragment, null, children);
    },
  };
});

jest.mock("@/shared/components/PdfCanvasViewer", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/features/training/components/QuizManagerModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/features/training/components/TrainingUploadWorkspace", () => ({
  __esModule: true,
  default: () => null,
  getFileBaseName: (file) => file.name,
  getMediaTypeForFile: () => "OTHER",
}));

jest.mock("@/shared/hooks/useMediaUrl", () => ({
  useMediaUrl: (url) => ({ url }),
}));

jest.mock("@/features/training/services/trainingMediaApi", () => ({
  createTrainingMaterial: jest.fn(),
  createTrainingPosition: jest.fn(),
  deleteTrainingMaterial: jest.fn(),
  deleteTrainingPosition: jest.fn(),
  fetchManagedTrainingPositions: jest.fn(),
  fetchTrainingCourse: jest.fn(),
  fetchTrainingMaterial: jest.fn(),
  fetchTrainingMaterials: jest.fn(),
  fetchTrainingMyPlan: jest.fn(),
  fetchTrainingPositions: jest.fn(),
  fetchTrainingStoreProgress: jest.fn(),
  updateTrainingMaterial: jest.fn(),
  updateTrainingPosition: jest.fn(),
  updateTrainingProgress: jest.fn(),
  uploadTrainingMedia: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  fetchTrainingCourse.mockRejectedValue(new Error("offline"));
  fetchTrainingMaterial.mockRejectedValue(new Error("offline"));
  fetchTrainingMaterials.mockRejectedValue(new Error("offline"));
  fetchTrainingMyPlan.mockRejectedValue(new Error("offline"));
  fetchTrainingPositions.mockRejectedValue(new Error("offline"));
  fetchTrainingStoreProgress.mockRejectedValue(new Error("offline"));
});

async function renderPage(page) {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(page);
    await Promise.resolve();
  });
  ReactTestRenderer.act(() => renderer.unmount());
}

test("starts the course, material, progress, plan, and upload data effects", async () => {
  await renderPage(<TrainingCoursePage courseId="course-1" />);
  await renderPage(<TrainingMaterialPlayerPage />);
  await renderPage(<TrainingMaterialsPage />);
  await renderPage(<TrainingProgressPage />);
  await renderPage(<TrainingSpacePage />);
  await renderPage(<TrainingUploadPage />);

  expect(fetchTrainingCourse).toHaveBeenCalledWith("course-1");
  expect(fetchTrainingMaterial).toHaveBeenCalledWith("material-1");
  expect(fetchTrainingMaterials).toHaveBeenCalled();
  expect(fetchTrainingStoreProgress).toHaveBeenCalled();
  expect(fetchTrainingMyPlan).toHaveBeenCalled();
  expect(fetchTrainingPositions).toHaveBeenCalled();
  expect(createTrainingMaterial).not.toHaveBeenCalled();
  expect(deleteTrainingMaterial).not.toHaveBeenCalled();
  expect(updateTrainingMaterial).not.toHaveBeenCalled();
  expect(updateTrainingProgress).not.toHaveBeenCalled();
  expect(uploadTrainingMedia).not.toHaveBeenCalled();
});

test("sorts training position categories from the loaded plan", async () => {
  fetchTrainingMyPlan.mockResolvedValue({
    required: [
      { id: 1, type: "VIDEO", positionId: "zebra", title: "Zebra" },
      { id: 2, type: "VIDEO", positionId: "assistant", title: "Assistant" },
    ],
    optional: [],
  });

  await renderPage(<TrainingSpacePage />);

  expect(fetchTrainingMyPlan).toHaveBeenCalledTimes(1);
});
