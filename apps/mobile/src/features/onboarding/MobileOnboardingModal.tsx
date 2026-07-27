import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { authControlStyles } from "@/features/auth/AuthFormControls";
import type { AuthLanguage } from "@/features/auth/authCopy";
import { scaleStyles } from "@/lib/responsive";
import {
  resolveOnboardingCompletionDestination,
  type MobileOnboardingCompletionDestination,
  type MobileOnboardingTargetBounds,
  type MobileOnboardingTargetId,
  type MobileOnboardingTargets,
} from "@/features/onboarding/mobileOnboardingState";

type MobileOnboardingModalProps = {
  isReplay: boolean;
  language: AuthLanguage;
  reduceMotionOverride?: boolean;
  showOrderStep: boolean;
  targets: MobileOnboardingTargets;
  visible: boolean;
  onComplete: (destination: MobileOnboardingCompletionDestination | null) => Promise<void>;
};

type MobileOnboardingCopy = {
  back: string;
  congratsBody: string;
  congratsTitle: string;
  close: string;
  finish: string;
  issuesBody: string;
  issuesTitle: string;
  moreBody: string;
  moreTitle: string;
  next: string;
  newsBody: string;
  newsTitle: string;
  ordersBody: string;
  ordersTitle: string;
  saveError: string;
  skip: string;
  startTraining: string;
  stepLabel: (step: number, total: number) => string;
  trainingBody: string;
  trainingTitle: string;
};

const ONBOARDING_COPY: Record<AuthLanguage, MobileOnboardingCopy> = {
  zh: {
    back: "上一步",
    congratsBody: "这里会记录团队和门店的优秀表现，及时了解值得学习的经验。",
    congratsTitle: "查看表彰",
    close: "关闭",
    finish: "完成",
    issuesBody: "这里会发布需要改进的事项，关注后及时调整门店工作。",
    issuesTitle: "关注批评",
    moreBody: "右上角的更多菜单里有个人资料、培训记录和其他工作模块，需要时随时从这里进入。",
    moreTitle: "更多功能",
    next: "下一步",
    newsBody: "这里发布总部和门店的最新通知，进入首页后先从这里了解今天的重要信息。",
    newsTitle: "查看资讯",
    ordersBody: "1. 选择供应商；2. 设置配送时间和商品数量；3. 在确认页检查后提交订单。",
    ordersTitle: "下单流程",
    saveError: "暂时无法保存引导状态，请检查网络后重试。",
    skip: "跳过引导",
    startTraining: "开始我的培训",
    stepLabel: (step, total) => `第 ${step} / ${total} 步`,
    trainingBody: "先点这里进入培训，查看与你岗位相关的必学内容和学习进度。",
    trainingTitle: "进入培训",
  },
  en: {
    back: "Back",
    congratsBody:
      "Find team and store achievements here, and learn from the practices worth repeating.",
    congratsTitle: "Recognition",
    close: "Close",
    finish: "Done",
    issuesBody:
      "This is where improvement items are published, so you can adjust store work promptly.",
    issuesTitle: "Improvements",
    moreBody:
      "Use the More menu in the top right for your profile, training history, and other work modules.",
    moreTitle: "More features",
    next: "Next",
    newsBody:
      "Head office and store updates appear here. Start your day by checking what matters now.",
    newsTitle: "Updates",
    ordersBody:
      "1. Choose a supplier. 2. Set the delivery time and quantities. 3. Review and submit the order.",
    ordersTitle: "Ordering steps",
    saveError: "We could not save this guide. Check your connection and try again.",
    skip: "Skip guide",
    startTraining: "Start my training",
    stepLabel: (step, total) => `Step ${step} of ${total}`,
    trainingBody: "Start here to view the learning required for your role and your progress.",
    trainingTitle: "Open training",
  },
  fr: {
    back: "Retour",
    congratsBody:
      "Retrouvez ici les réussites des équipes et des boutiques, et les pratiques à reproduire.",
    congratsTitle: "Félicitations",
    close: "Fermer",
    finish: "Terminer",
    issuesBody:
      "Les points à améliorer sont publiés ici pour ajuster rapidement le travail en boutique.",
    issuesTitle: "Points à améliorer",
    moreBody:
      "Le menu Plus en haut à droite donne accès à votre profil, votre historique de formation et aux autres modules.",
    moreTitle: "Plus de fonctions",
    next: "Suivant",
    newsBody:
      "Les actualités du siège et des boutiques sont publiées ici. Commencez par les consulter.",
    newsTitle: "Actualités",
    ordersBody:
      "1. Choisissez un fournisseur. 2. Réglez la livraison et les quantités. 3. Vérifiez puis envoyez la commande.",
    ordersTitle: "Étapes de commande",
    saveError: "Impossible d’enregistrer ce guide. Vérifiez votre connexion et réessayez.",
    skip: "Passer le guide",
    startTraining: "Commencer ma formation",
    stepLabel: (step, total) => `Étape ${step} sur ${total}`,
    trainingBody:
      "Commencez ici pour consulter les contenus requis pour votre poste et votre progression.",
    trainingTitle: "Ouvrir la formation",
  },
};

const BASE_STEPS: MobileOnboardingTargetId[] = ["news", "congrats", "issues", "training", "more"];
export function MobileOnboardingModal({
  isReplay,
  language,
  reduceMotionOverride,
  showOrderStep,
  targets,
  visible,
  onComplete,
}: MobileOnboardingModalProps) {
  const copy = ONBOARDING_COPY[language];
  const { height } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [reduceMotion, setReduceMotion] = useState(
    typeof reduceMotionOverride === "boolean" ? reduceMotionOverride : false,
  );
  const revealProgress = useRef(new Animated.Value(0)).current;
  const steps = showOrderStep
    ? [...BASE_STEPS.slice(0, 3), "orders" as const, ...BASE_STEPS.slice(3)]
    : BASE_STEPS;
  const activeTargetId = steps[step] ?? "more";
  const isBottomNavigationTarget = activeTargetId === "orders" || activeTargetId === "training";
  const isFinalStep = step === steps.length - 1;
  const target = targets[activeTargetId];
  const targetCenterX = target ? target.x + target.width / 2 : 0;

  useEffect(() => {
    if (typeof reduceMotionOverride === "boolean") {
      setReduceMotion(reduceMotionOverride);
      return;
    }

    let isMounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [reduceMotionOverride]);

  useEffect(() => {
    if (!visible) return;

    setStep(0);
    setSaveError("");
    revealProgress.setValue(reduceMotion ? 1 : 0);

    if (!reduceMotion) {
      Animated.timing(revealProgress, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  }, [reduceMotion, revealProgress, visible]);

  async function finish(destination: MobileOnboardingCompletionDestination): Promise<void> {
    const nextDestination = resolveOnboardingCompletionDestination(isReplay, destination);

    if (nextDestination === null) {
      await onComplete(null);
      return;
    }

    setIsSubmitting(true);
    setSaveError("");

    try {
      await onComplete(nextDestination);
    } catch {
      setSaveError(copy.saveError);
    } finally {
      setIsSubmitting(false);
    }
  }

  function moveToNextStep(): void {
    if (isFinalStep) {
      void finish("training");
      return;
    }

    setSaveError("");
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function handleRequestClose(): void {
    if (!isSubmitting) void finish("home");
  }

  const { body, title } = getStepContent(copy, activeTargetId);

  return (
    <Modal
      animationType="none"
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
      onRequestClose={handleRequestClose}
    >
      <View accessibilityViewIsModal style={styles.overlay}>
        <View pointerEvents="none" style={styles.backdrop} />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.spotlight,
            target ? buildSpotlightStyle(target) : styles.hiddenTarget,
            { opacity: revealProgress },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.pointer,
            isBottomNavigationTarget
              ? [
                  styles.trainingPointer,
                  { left: targetCenterX - 10, top: target ? target.y - 12 : 0 },
                ]
              : [
                  styles.morePointer,
                  { left: targetCenterX - 10, top: target ? target.y + target.height : 0 },
                ],
          ]}
        />

        <Animated.View
          accessibilityLiveRegion="polite"
          style={[
            styles.coachmark,
            isBottomNavigationTarget
              ? [styles.trainingCoachmark, { bottom: target ? height - target.y + 16 : 96 }]
              : [styles.moreCoachmark, { top: target ? target.y + target.height + 16 : 96 }],
            {
              opacity: revealProgress,
              transform: [
                {
                  translateY: revealProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [reduceMotion ? 0 : 10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.coachmarkHeader}>
            <Text style={styles.step}>{copy.stepLabel(step + 1, steps.length)}</Text>
            <Pressable
              accessibilityLabel={isReplay ? copy.close : copy.skip}
              accessibilityRole="button"
              disabled={isSubmitting}
              hitSlop={10}
              onPress={() => void finish("home")}
            >
              <Text style={styles.skip}>{isReplay ? copy.close : copy.skip}</Text>
            </Pressable>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          {saveError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {saveError}
            </Text>
          ) : null}
          <View style={styles.actions}>
            {step > 0 ? (
              <Pressable
                accessibilityLabel={copy.back}
                accessibilityRole="button"
                disabled={isSubmitting}
                style={styles.backButton}
                onPress={() => {
                  setSaveError("");
                  setStep((current) => Math.max(current - 1, 0));
                }}
              >
                <Text style={styles.backButtonText}>{copy.back}</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable
              accessibilityLabel={
                isFinalStep ? (isReplay ? copy.finish : copy.startTraining) : copy.next
              }
              accessibilityRole="button"
              disabled={isSubmitting}
              style={[styles.nextButton, isSubmitting && styles.nextButtonDisabled]}
              onPress={moveToNextStep}
            >
              <Text style={styles.nextButtonText}>
                {isFinalStep ? (isReplay ? copy.finish : copy.startTraining) : copy.next}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function buildSpotlightStyle(target: MobileOnboardingTargetBounds): {
  height: number;
  left: number;
  top: number;
  width: number;
} {
  const padding = 6;

  return {
    height: target.height + padding * 2,
    left: target.x - padding,
    top: target.y - padding,
    width: target.width + padding * 2,
  };
}

function getStepContent(
  copy: MobileOnboardingCopy,
  target: MobileOnboardingTargetId,
): { body: string; title: string } {
  if (target === "news") return { body: copy.newsBody, title: copy.newsTitle };
  if (target === "congrats") return { body: copy.congratsBody, title: copy.congratsTitle };
  if (target === "issues") return { body: copy.issuesBody, title: copy.issuesTitle };
  if (target === "orders") return { body: copy.ordersBody, title: copy.ordersTitle };
  if (target === "training") return { body: copy.trainingBody, title: copy.trainingTitle };

  return { body: copy.moreBody, title: copy.moreTitle };
}

const styles = StyleSheet.create(
  scaleStyles({
    actions: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 24,
    },
    backButton: {
      minHeight: 44,
      justifyContent: "center",
    },
    backButtonText: {
      color: "rgba(10, 10, 10, 0.62)",
      fontSize: 14,
      fontWeight: "600",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(10, 10, 10, 0.48)",
    },
    body: {
      color: "rgba(10, 10, 10, 0.7)",
      fontSize: 15,
      lineHeight: 23,
    },
    coachmark: {
      backgroundColor: "#ffffff",
      left: 20,
      padding: 22,
      position: "absolute",
      right: 20,
    },
    coachmarkHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    error: {
      color: authControlStyles.colors.redDeep,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 12,
    },
    moreCoachmark: {},
    hiddenTarget: {
      opacity: 0,
    },
    morePointer: {
      borderBottomColor: "#ffffff",
      borderBottomWidth: 12,
      borderLeftColor: "transparent",
      borderLeftWidth: 10,
      borderRightColor: "transparent",
      borderRightWidth: 10,
      position: "absolute",
    },
    nextButton: {
      alignItems: "center",
      backgroundColor: authControlStyles.colors.red,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 18,
    },
    nextButtonDisabled: {
      opacity: 0.55,
    },
    nextButtonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "700",
    },
    overlay: {
      flex: 1,
    },
    pointer: {
      zIndex: 2,
    },
    skip: {
      color: "rgba(10, 10, 10, 0.55)",
      fontSize: 13,
      fontWeight: "600",
    },
    spotlight: {
      borderColor: "#ffffff",
      borderWidth: 2,
      height: 68,
      position: "absolute",
      width: 68,
      zIndex: 1,
    },
    step: {
      color: authControlStyles.colors.red,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1,
    },
    title: {
      color: authControlStyles.colors.ink,
      fontSize: 23,
      fontWeight: "800",
      lineHeight: 30,
    },
    trainingCoachmark: {},
    trainingPointer: {
      borderLeftColor: "transparent",
      borderLeftWidth: 10,
      borderRightColor: "transparent",
      borderRightWidth: 10,
      borderTopColor: "#ffffff",
      borderTopWidth: 12,
      position: "absolute",
    },
  }),
);
