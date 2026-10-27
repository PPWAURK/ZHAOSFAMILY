import ReactTestRenderer from "react-test-renderer";
import TrainingPositionsPage from "@/features/training/pages/TrainingPositionsPage";
import { fetchManagedTrainingPositions, updateTrainingPosition } from "@/features/training/services/trainingMediaApi";

jest.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => ({
    user: { permissions: ["training.position.manage"] },
    isLoading: false,
  }),
}));

jest.mock("@/shared/components/confirm/ConfirmProvider", () => ({
  useConfirm: () => jest.fn().mockResolvedValue(true),
}));

jest.mock("@/features/training/components/TrainingLayout", () => {
  const styles = new Proxy({}, { get: (_target, property) => property });

  return {
    __esModule: true,
    default: ({ children }) =>
      children({
        lang: "zh",
        styles,
        t: { page: { stepLabel: "STEP 05", stepDetail: "Positions" } },
      }),
  };
});

jest.mock("@/features/training/components/JobRolePositionPanel", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/features/training/services/trainingMediaApi", () => ({
  createTrainingPosition: jest.fn(),
  deleteTrainingPosition: jest.fn(),
  fetchManagedTrainingPositions: jest.fn(),
  updateTrainingPosition: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  fetchManagedTrainingPositions.mockResolvedValue([]);
  updateTrainingPosition.mockResolvedValue(undefined);
});

test("loads managed positions and saves the edited position with a numeric sort order", async () => {
  let renderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<TrainingPositionsPage />);
    await Promise.resolve();
  });

  expect(fetchManagedTrainingPositions).toHaveBeenCalledTimes(1);

  const editButton = renderer.root
    .findAllByType("button")
    .find((button) => button.props.children === "编辑");
  expect(editButton).toBeDefined();

  const positionGroup = renderer.root.findAll(
    (node) => typeof node.props.onSavePosition === "function",
  )[0];

  await ReactTestRenderer.act(async () => {
    await positionGroup.props.onSavePosition("assistant");
  });
  expect(updateTrainingPosition).not.toHaveBeenCalled();

  await ReactTestRenderer.act(async () => {
    editButton.props.onClick();
  });

  const saveButton = renderer.root
    .findAllByType("button")
    .find((button) => button.props.children === "保存");
  expect(saveButton).toBeDefined();

  await ReactTestRenderer.act(async () => {
    await saveButton.props.onClick();
  });

  expect(updateTrainingPosition).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({ sortOrder: expect.any(Number) }),
  );
  ReactTestRenderer.act(() => renderer.unmount());
});
