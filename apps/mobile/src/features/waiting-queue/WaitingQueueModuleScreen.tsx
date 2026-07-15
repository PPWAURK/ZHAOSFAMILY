import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { WaitingQueueEntry } from "@zhao/types";
import { useScreenName } from "@/lib/useScreenName";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import {
  TrackingText,
  authControlStyles,
} from "@/features/auth/AuthFormControls";
import type { AuthLanguage } from "@/features/auth/authCopy";
import { storeStyles as styles } from "@/features/stores/storeStyles";
import {
  addWaitingQueueEntry,
  fetchWaitingQueue,
  seatWaitingQueueEntry,
} from "@/features/waiting-queue/waitingQueueApi";
import { WAITING_QUEUE_COPY } from "@/features/waiting-queue/waitingQueueCopy";

type WaitingQueueModuleScreenProps = {
  language: AuthLanguage;
};

type SpecialCaseKey = "hasDisabled" | "hasPregnant" | "hasElderly";
type QueueListMode = "waiting" | "history";

const POLL_INTERVAL_MS = 5000;

function waitingMinutes(createdAt: string, now: number): number {
  const start = new Date(createdAt).getTime();

  if (Number.isNaN(start)) {
    return 0;
  }

  return Math.max(0, Math.floor((now - start) / 60000));
}

function formatHistoryTimestamp(value: string, language: AuthLanguage): string {
  const locale = language === "zh" ? "zh-CN" : language === "fr" ? "fr-FR" : "en-US";
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function sortHistoryEntries(entries: WaitingQueueEntry[]): WaitingQueueEntry[] {
  return [...entries].sort(
    (first, second) =>
      new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime(),
  );
}

export function WaitingQueueModuleScreen({
  language,
}: WaitingQueueModuleScreenProps) {
  useScreenName("waiting-queue");
  const copy = WAITING_QUEUE_COPY[language];
  const [entries, setEntries] = useState<WaitingQueueEntry[]>([]);
  const [listMode, setListMode] = useState<QueueListMode>("waiting");
  const [now, setNow] = useState(() => Date.now());
  const [name, setName] = useState("");
  const [partySize, setPartySize] = useState("1");
  const [specialCases, setSpecialCases] = useState<Record<SpecialCaseKey, boolean>>({
    hasDisabled: false,
    hasPregnant: false,
    hasElderly: false,
  });
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seatingId, setSeatingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function load(): Promise<void> {
      setIsLoading(true);

      try {
        const nextEntries =
          listMode === "waiting"
            ? await fetchWaitingQueue("waiting")
            : sortHistoryEntries(
                (
                  await Promise.all([
                    fetchWaitingQueue("seated"),
                    fetchWaitingQueue("cancelled"),
                  ])
                ).flat(),
              );

        if (!isCancelled) {
          setEntries(nextEntries);
          setNow(Date.now());
          setErrorMessage("");
        }
      } catch {
        if (!isCancelled) {
          setErrorMessage(copy.loadError);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();
    const interval =
      listMode === "waiting"
        ? setInterval(() => void load(), POLL_INTERVAL_MS)
        : null;

    return () => {
      isCancelled = true;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [copy.loadError, listMode]);

  function resetMessages(): void {
    setMessage("");
    setErrorMessage("");
  }

  function toggleSpecialCase(key: SpecialCaseKey): void {
    resetMessages();
    setSpecialCases((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(): Promise<void> {
    resetMessages();

    const trimmedName = name.trim();
    const size = Number(partySize);

    if (!trimmedName || !Number.isInteger(size) || size < 1) {
      setErrorMessage(copy.requiredError);
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await addWaitingQueueEntry({
        customerName: trimmedName,
        partySize: size,
        hasDisabled: specialCases.hasDisabled,
        hasPregnant: specialCases.hasPregnant,
        hasElderly: specialCases.hasElderly,
        note: note.trim() || undefined,
      });

      if (listMode === "waiting") {
        setEntries((current) => [...current, created]);
      }
      setName("");
      setPartySize("1");
      setSpecialCases({
        hasDisabled: false,
        hasPregnant: false,
        hasElderly: false,
      });
      setNote("");
      setMessage(copy.submitSuccess);
    } catch {
      setErrorMessage(copy.submitError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSeat(id: number): Promise<void> {
    resetMessages();
    setSeatingId(id);
    try {
      await seatWaitingQueueEntry(id);
      setEntries((current) => current.filter((entry) => entry.id !== id));
    } catch {
      setErrorMessage(copy.seatError);
    } finally {
      setSeatingId(null);
    }
  }

  const specialCasePills: { key: SpecialCaseKey; label: string }[] = [
    { key: "hasDisabled", label: copy.disabled },
    { key: "hasPregnant", label: copy.pregnant },
    { key: "hasElderly", label: copy.elderly },
  ];

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

        <Text style={styles.statLabel}>{copy.nameLabel}</Text>
        <TextInput
          placeholder={copy.namePlaceholder}
          placeholderTextColor={authControlStyles.colors.ink40}
          style={styles.searchInput}
          value={name}
          onChangeText={(value) => {
            resetMessages();
            setName(value);
          }}
        />

        <Text style={styles.statLabel}>{copy.partySizeLabel}</Text>
        <TextInput
          keyboardType="number-pad"
          placeholder="1"
          placeholderTextColor={authControlStyles.colors.ink40}
          style={styles.searchInput}
          value={partySize}
          onChangeText={(value) => {
            resetMessages();
            setPartySize(value.replace(/[^\d]/g, ""));
          }}
        />

        <Text style={styles.statLabel}>{copy.specialCasesLabel}</Text>
        <View style={styles.roleGrid}>
          {specialCasePills.map(({ key, label }) => {
            const active = specialCases[key];

            return (
              <Pressable
                key={key}
                style={[styles.rolePill, active ? styles.rolePillActive : null]}
                onPress={() => toggleSpecialCase(key)}
              >
                <Text
                  style={[
                    styles.rolePillText,
                    active ? styles.rolePillTextActive : null,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.statLabel}>{copy.noteLabel}</Text>
        <TextInput
          multiline
          placeholder={copy.notePlaceholder}
          placeholderTextColor={authControlStyles.colors.ink40}
          style={[styles.searchInput, { minHeight: 72, paddingTop: 12 }]}
          textAlignVertical="top"
          value={note}
          onChangeText={(value) => {
            resetMessages();
            setNote(value);
          }}
        />

        {message ? (
          <Text style={[styles.message, { color: "#1a7f3d" }]}>{message}</Text>
        ) : null}
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
          <Text style={styles.sectionTitle}>
            {listMode === "waiting" ? copy.listTitle : copy.historyTitle}
          </Text>
        </View>

        <View style={styles.roleGrid}>
          <Pressable
            style={[styles.rolePill, listMode === "waiting" ? styles.rolePillActive : null]}
            onPress={() => setListMode("waiting")}
          >
            <Text
              style={[
                styles.rolePillText,
                listMode === "waiting" ? styles.rolePillTextActive : null,
              ]}
            >
              {copy.currentTab}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.rolePill, listMode === "history" ? styles.rolePillActive : null]}
            onPress={() => setListMode("history")}
          >
            <Text
              style={[
                styles.rolePillText,
                listMode === "history" ? styles.rolePillTextActive : null,
              ]}
            >
              {copy.historyTab}
            </Text>
          </Pressable>
        </View>

        {isLoading ? <ZhaoLoadingIndicator label={copy.loading} /> : null}

        {!isLoading && entries.length === 0 && !errorMessage ? (
          <Text style={styles.emptyText}>
            {listMode === "waiting" ? copy.empty : copy.historyEmpty}
          </Text>
        ) : null}

        {!isLoading && entries.length > 0 ? (
          <View style={styles.list}>
            {entries.map((entry, index) => {
              const tags = [
                entry.hasDisabled ? copy.disabled : null,
                entry.hasPregnant ? copy.pregnant : null,
                entry.hasElderly ? copy.elderly : null,
              ].filter(Boolean);

              return (
                <View key={entry.id} style={styles.card}>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardName}>
                      {listMode === "waiting" ? `${index + 1}. ` : ""}
                      {entry.customerName} · {entry.partySize}{" "}
                      {copy.peopleUnit}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {listMode === "waiting"
                        ? `${copy.waitingFor}: ${waitingMinutes(entry.createdAt, now)} ${copy.minutesUnit}`
                        : `${entry.status === "seated" ? copy.seatedStatus : copy.cancelledStatus} · ${copy.historyUpdatedAt}: ${formatHistoryTimestamp(entry.seatedAt ?? entry.updatedAt, language)}`}
                    </Text>
                    {tags.length > 0 ? (
                      <Text style={styles.cardMeta}>{tags.join(" · ")}</Text>
                    ) : null}
                    {entry.note ? (
                      <Text style={styles.emptyText}>{entry.note}</Text>
                    ) : null}
                  </View>
                  {listMode === "waiting" ? (
                    <Pressable
                      disabled={seatingId === entry.id}
                      style={[styles.actionButton, styles.actionButtonPrimary]}
                      onPress={() => void handleSeat(entry.id)}
                    >
                      <Text
                        style={[
                          styles.actionButtonText,
                          styles.actionButtonTextPrimary,
                        ]}
                      >
                        {seatingId === entry.id ? copy.seating : copy.seat}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}
