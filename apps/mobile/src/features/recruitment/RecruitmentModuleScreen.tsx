import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import type {
  CreateRecruitmentRequestRequest,
  RecruitmentContractType,
  RecruitmentPosition,
  RecruitmentRequestItem,
} from "@zhao/types";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { TrackingText, authControlStyles } from "@/features/auth/AuthFormControls";
import type { AuthLanguage } from "@/features/auth/authCopy";
import { storeStyles as styles } from "@/features/stores/storeStyles";
import {
  createRecruitmentRequest,
  deleteRecruitmentRequest,
  fetchRecruitmentRequests,
} from "@/features/recruitment/recruitmentApi";
import {
  RECRUITMENT_CONTRACT_LABELS,
  RECRUITMENT_COPY,
  RECRUITMENT_POSITION_LABELS,
  RECRUITMENT_STATUS_LABELS,
} from "@/features/recruitment/recruitmentCopy";

type RecruitmentModuleScreenProps = {
  language: AuthLanguage;
};

type RecruitmentCombo = Partial<
  Record<
    RecruitmentPosition,
    Partial<Record<RecruitmentContractType, string>>
  >
>;

const CONTRACT_TYPES: RecruitmentContractType[] = ["full_time", "part_time"];
const POSITIONS: RecruitmentPosition[] = ["waiter", "chef", "kitchen_assistant"];
const DEFAULT_HEADCOUNT = "1";

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
}

function isActivePosition(
  combo: Record<string, Partial<Record<string, string>>>,
  pos: RecruitmentPosition,
): boolean {
  return !!combo[pos] && Object.keys(combo[pos]).length > 0;
}

export function RecruitmentModuleScreen({
  language,
}: RecruitmentModuleScreenProps) {
  const copy = RECRUITMENT_COPY[language];
  const contractLabels = RECRUITMENT_CONTRACT_LABELS[language];
  const positionLabels = RECRUITMENT_POSITION_LABELS[language];
  const statusLabels = RECRUITMENT_STATUS_LABELS[language];
  const [requests, setRequests] = useState<RecruitmentRequestItem[]>([]);
  const [combo, setCombo] = useState<RecruitmentCombo>({
    waiter: { full_time: DEFAULT_HEADCOUNT },
  });
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const sortedRequests = useMemo(
    () =>
      [...requests].sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
      ),
    [requests],
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadRequests(): Promise<void> {
      try {
        setIsLoading(true);
        setErrorMessage("");
        const nextRequests = await fetchRecruitmentRequests();

        if (!isCancelled) {
          setRequests(nextRequests);
        }
      } catch {
        if (!isCancelled) {
          setRequests([]);
          setErrorMessage(copy.loadError);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRequests();

    return () => {
      isCancelled = true;
    };
  }, [copy.loadError]);

  function resetMessages(): void {
    setMessage("");
    setErrorMessage("");
  }

  function togglePosition(pos: RecruitmentPosition): void {
    resetMessages();
    if (isActivePosition(combo, pos)) {
      setCombo((prev) => {
        const next = { ...prev };
        delete next[pos];
        return next;
      });
    } else {
      setCombo((prev) => ({
        ...prev,
        [pos]: { full_time: DEFAULT_HEADCOUNT },
      }));
    }
  }

  function toggleContractForPosition(
    pos: RecruitmentPosition,
    ct: RecruitmentContractType,
  ): void {
    resetMessages();
    setCombo((prev) => {
      const currentContracts = prev[pos] || {};
      if (ct in currentContracts) {
        const next = { ...prev };
        const remaining = { ...currentContracts };
        delete remaining[ct];
        if (Object.keys(remaining).length === 0) {
          delete next[pos];
        } else {
          next[pos] = remaining;
        }
        return next;
      }
      return {
        ...prev,
        [pos]: { ...currentContracts, [ct]: DEFAULT_HEADCOUNT },
      };
    });
  }

  function patchComboHeadcount(
    pos: RecruitmentPosition,
    ct: RecruitmentContractType,
    value: string,
  ): void {
    resetMessages();
    const sanitized = value.replace(/[^\d]/g, "");
    setCombo((prev) => ({
      ...prev,
      [pos]: { ...prev[pos], [ct]: sanitized },
    }));
  }

  async function handleSubmit(): Promise<void> {
    resetMessages();

    const entries: { pos: RecruitmentPosition; ct: RecruitmentContractType; headcount: number }[] = [];

    for (const [pos, contracts] of Object.entries(combo)) {
      for (const [ct, raw] of Object.entries(contracts)) {
        const n = Number(raw);
        if (Number.isInteger(n) && n >= 1) {
          entries.push({
            pos: pos as RecruitmentPosition,
            ct: ct as RecruitmentContractType,
            headcount: n,
          });
        }
      }
    }

    if (entries.length === 0) {
      setErrorMessage(copy.requiredError);
      return;
    }

    try {
      setIsSubmitting(true);

      const payloads: CreateRecruitmentRequestRequest[] = entries.map(
        ({ pos, ct, headcount }) => ({
          contractType: ct,
          position: pos,
          headcount,
          notes: notes.trim() || undefined,
        }),
      );

      const createdRequests = await Promise.all(
        payloads.map((payload) => createRecruitmentRequest(payload)),
      );

      setRequests((current) => [...createdRequests, ...current]);
      setCombo({ waiter: { full_time: DEFAULT_HEADCOUNT } });
      setNotes("");
      setMessage(copy.submitSuccess);
    } catch {
      setErrorMessage(copy.submitError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: number | string): Promise<void> {
    resetMessages();
    setDeletingId(id);
    try {
      await deleteRecruitmentRequest(id);
      setRequests((current) => current.filter((r) => r.id !== Number(id)));
    } catch {
      setErrorMessage(copy.deleteError);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TrackingText color={authControlStyles.colors.red} size={10.5}>
          {copy.kicker}
        </TrackingText>
        <Text style={styles.title}>
          {copy.title}
          {"\n"}
          <Text style={styles.titleAccent}>{copy.titleAccent}</Text>
        </Text>
        <Text style={styles.hint}>{copy.intro}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{copy.formTitle}</Text>
        </View>

        <Text style={styles.statLabel}>{copy.positionLabel}</Text>
        <View style={styles.roleGrid}>
          {POSITIONS.map((pos) => {
            const active = isActivePosition(combo, pos);

            return (
              <Pressable
                key={pos}
                style={[styles.rolePill, active ? styles.rolePillActive : null]}
                onPress={() => togglePosition(pos)}
              >
                <Text
                  style={[
                    styles.rolePillText,
                    active ? styles.rolePillTextActive : null,
                  ]}
                >
                  {positionLabels[pos]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {POSITIONS.filter((pos) => isActivePosition(combo, pos)).map((pos) => {
          const contracts = combo[pos];

          return (
            <View key={pos} style={styles.contractCard}>
              <Text style={styles.contractCardTitle}>{positionLabels[pos]}</Text>
              <View style={styles.contractRow}>
                {CONTRACT_TYPES.map((ct) => {
                  const isOn = ct in (contracts || {});

                  return isOn ? (
                    <View key={ct} style={styles.contractChip}>
                      <Pressable
                        style={styles.contractChipToggle}
                        onPress={() => toggleContractForPosition(pos, ct)}
                      >
                        <Text style={styles.contractChipLabel}>{contractLabels[ct]}</Text>
                      </Pressable>
                      <TextInput
                        keyboardType="number-pad"
                        style={styles.contractChipInput}
                        value={contracts?.[ct] ?? ""}
                        onChangeText={(value) => patchComboHeadcount(pos, ct, value)}
                      />
                    </View>
                  ) : (
                    <Pressable
                      key={ct}
                      style={[styles.rolePill, styles.contractAddPill]}
                      onPress={() => toggleContractForPosition(pos, ct)}
                    >
                      <Text style={styles.rolePillText}>+{contractLabels[ct]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}

        <Text style={styles.statLabel}>{copy.notesLabel}</Text>
        <TextInput
          multiline
          placeholder={copy.notesPlaceholder}
          placeholderTextColor={authControlStyles.colors.ink40}
          style={[styles.searchInput, { minHeight: 96, paddingTop: 12 }]}
          textAlignVertical="top"
          value={notes}
          onChangeText={(value) => {
            resetMessages();
            setNotes(value);
          }}
        />

        {message ? <Text style={[styles.message, { color: "#1a7f3d" }]}>{message}</Text> : null}
        {errorMessage ? <Text style={styles.message}>{errorMessage}</Text> : null}

        <Pressable
          disabled={isSubmitting}
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={() => void handleSubmit()}
        >
          <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
            {isSubmitting ? copy.submitting : copy.submit}
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{copy.listTitle}</Text>
        </View>

        {isLoading ? <ZhaoLoadingIndicator label={copy.loading} /> : null}

        {!isLoading && sortedRequests.length === 0 && !errorMessage ? (
          <Text style={styles.emptyText}>{copy.empty}</Text>
        ) : null}

        {!isLoading && sortedRequests.length > 0 ? (
          <View style={styles.list}>
            {sortedRequests.map((request) => (
              <View key={request.id} style={styles.card}>
                <View style={styles.cardBody}>
                  <Text style={styles.cardName}>
                    {positionLabels[request.position]} ·{" "}
                    {contractLabels[request.contractType]}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {request.headcount} {copy.peopleUnit} ·{" "}
                    {formatDate(request.createdAt)}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {copy.statusLabel}: {statusLabels[request.status]}
                  </Text>
                  {request.notes ? (
                    <Text style={styles.emptyText}>{request.notes}</Text>
                  ) : null}
                  {request.handledNotes ? (
                    <Text style={styles.emptyText}>
                      {copy.handledNotesLabel}: {request.handledNotes}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  disabled={deletingId === request.id}
                  onPress={() => void handleDelete(request.id)}
                  style={{ alignSelf: "flex-end", paddingVertical: 4, paddingHorizontal: 4 }}
                >
                  <Text
                    style={{
                      color: authControlStyles.colors.red,
                      fontFamily: "monospace",
                      fontSize: 11,
                      fontWeight: "700",
                      letterSpacing: 0.5,
                    }}
                  >
                    {"删除"}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}
