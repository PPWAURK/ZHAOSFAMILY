import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { authControlStyles } from "@/features/auth/AuthFormControls";
import { TRAINING_COPY } from "@/features/training/trainingCopy";
import {
  buildTrainingMaterialSearchResults,
  type TrainingMaterialSearchResult,
} from "@/features/training/trainingMaterialSearch";
import { trainingStyles as styles } from "@/features/training/trainingStyles";
import type {
  TrainingMapData,
  TrainingMapLayer,
  TrainingPlanMaterial,
} from "@/features/training/trainingTypes";

type TrainingCopySet = (typeof TRAINING_COPY)["zh"];

type TrainingMaterialIndexProps = {
  copy: TrainingCopySet;
  mapData: TrainingMapData;
  onOpenMaterial: (material: TrainingPlanMaterial) => void;
  onQueryChange: (query: string) => void;
  query: string;
};

function getLayerLabel(layer: TrainingMapLayer, copy: TrainingCopySet): string {
  if (layer === "shared") return copy.mapLayerShared;
  if (layer === "required") return copy.mapLayerRequired;

  return copy.mapLayerAdvanced;
}

function formatResultCount(template: string, count: number): string {
  return template.replace("{count}", String(count));
}

function MaterialSearchResult({
  copy,
  onOpenMaterial,
  result,
}: {
  copy: TrainingCopySet;
  onOpenMaterial: (material: TrainingPlanMaterial) => void;
  result: TrainingMaterialSearchResult;
}) {
  const { material } = result.node;
  const typeLabel = copy.materialTypes[material.type] || material.type;
  const layerLabel = getLayerLabel(result.layer, copy);
  const statusLabel = result.unlocked
    ? copy.statuses[material.progress.status] || material.progress.status
    : copy.mapLocked;
  const accessibilityLabel = `${material.title}, ${material.originalName}, ${statusLabel}`;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: !result.unlocked }}
      disabled={!result.unlocked}
      style={({ pressed }) => [
        styles.materialIndexResult,
        !result.unlocked ? styles.materialIndexResultLocked : null,
        pressed && result.unlocked ? styles.materialIndexResultPressed : null,
      ]}
      onPress={() => onOpenMaterial(material)}
    >
      <View style={styles.materialIndexResultHeader}>
        <Text style={styles.materialIndexResultTitle}>{material.title}</Text>
        <View
          style={[
            styles.materialIndexStatus,
            !result.unlocked ? styles.materialIndexStatusLocked : null,
            material.progress.status === "completed" && result.unlocked
              ? styles.materialIndexStatusCompleted
              : null,
          ]}
        >
          <Text
            style={[
              styles.materialIndexStatusText,
              !result.unlocked ? styles.materialIndexStatusTextLocked : null,
              material.progress.status === "completed" && result.unlocked
                ? styles.materialIndexStatusTextCompleted
                : null,
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      <Text style={styles.materialIndexFileName}>
        {copy.searchFileName} · {material.originalName}
      </Text>

      <View style={styles.materialIndexMetaRow}>
        <Text style={styles.materialIndexMeta}>{layerLabel}</Text>
        {result.positionLabel ? (
          <Text style={styles.materialIndexMeta}>{result.positionLabel}</Text>
        ) : null}
        <Text style={styles.materialIndexMeta}>{typeLabel}</Text>
      </View>

      <Text
        style={[
          styles.materialIndexAction,
          !result.unlocked ? styles.materialIndexActionLocked : null,
        ]}
      >
        {result.unlocked ? copy.open : copy.mapLocked}
      </Text>
    </Pressable>
  );
}

export function TrainingMaterialIndex({
  copy,
  mapData,
  onOpenMaterial,
  onQueryChange,
  query,
}: TrainingMaterialIndexProps) {
  const hasQuery = Boolean(query.trim());
  const results = useMemo(
    () => buildTrainingMaterialSearchResults(mapData, query),
    [mapData, query],
  );

  return (
    <View style={styles.materialIndex}>
      <View style={styles.materialIndexHeader}>
        <View style={styles.materialIndexTitleGroup}>
          <Text style={styles.materialIndexTitle}>{copy.searchIndexTitle}</Text>
          <Text style={styles.materialIndexHint}>{copy.searchIndexHint}</Text>
        </View>
        {hasQuery ? (
          <Text accessibilityLiveRegion="polite" style={styles.materialIndexCount}>
            {formatResultCount(copy.searchResultCount, results.length)}
          </Text>
        ) : null}
      </View>

      <View style={styles.materialIndexSearchField}>
        <Ionicons color={authControlStyles.colors.ink60} name="search-outline" size={19} />
        <TextInput
          accessibilityLabel={copy.searchIndexTitle}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="never"
          placeholder={copy.searchPlaceholder}
          placeholderTextColor={authControlStyles.colors.ink60}
          returnKeyType="search"
          style={styles.materialIndexSearchInput}
          value={query}
          onChangeText={onQueryChange}
        />
        {hasQuery ? (
          <Pressable
            accessibilityLabel={copy.searchClear}
            accessibilityRole="button"
            hitSlop={8}
            style={styles.materialIndexClearButton}
            onPress={() => onQueryChange("")}
          >
            <Ionicons color={authControlStyles.colors.ink60} name="close-circle" size={20} />
          </Pressable>
        ) : null}
      </View>

      {hasQuery ? (
        results.length > 0 ? (
          <View style={styles.materialIndexResults}>
            {results.map((result) => (
              <MaterialSearchResult
                key={`${result.layer}-${result.node.material.id}`}
                copy={copy}
                result={result}
                onOpenMaterial={onOpenMaterial}
              />
            ))}
          </View>
        ) : (
          <View accessibilityLiveRegion="polite" style={styles.materialIndexEmpty}>
            <Ionicons color={authControlStyles.colors.red} name="search-outline" size={22} />
            <Text style={styles.materialIndexEmptyText}>{copy.searchNoResults}</Text>
          </View>
        )
      ) : null}
    </View>
  );
}
