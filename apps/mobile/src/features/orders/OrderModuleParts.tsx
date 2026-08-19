import {
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import type { ImageSource } from "expo-image";
import { convertOrderQuantityToCases } from "@zhao/utils";
import { ZhaoLoadingIndicator } from "@/components/ZhaoLoadingIndicator";
import { AppImage } from "@/components/RemoteImage";
import { TrackingText, authControlStyles } from "@/features/auth/AuthFormControls";
import type { AuthLanguage } from "@/features/auth/authCopy";
import {
  getOrderProductName,
  getOrderProductVariants,
} from "@/features/orders/orderApi";
import type { OrderCopy } from "@/features/orders/orderCopy";
import { orderStyles as styles } from "@/features/orders/orderStyles";
import { isTablet } from "@/lib/responsive";
import type { SelectedOrderLine } from "@/features/orders/orderFlow";
import type {
  OrderProduct,
  OrderStockMap,
  QuantityMap,
} from "@/features/orders/orderTypes";
import { MOBILE_API_URL } from "@/lib/env";
import type { AppImageLoadPriority } from "@/lib/imagePriority";

const API_ORIGIN = resolveApiOrigin();

// On tablets show 3 products per row (47% → 31%) instead of 2; the list switches
// to flex-start so an incomplete last row stays left-aligned.
const productCardTabletStyle = isTablet
  ? ({ width: "31%", minWidth: "31%" } as const)
  : null;

const MAX_QUANTITY = 9999;

// Step the quantity string by ±1, clamped to [0, MAX_QUANTITY]; 0 clears the
// field so it matches the "empty" (unselected) state.
function stepQuantity(current: string | undefined, delta: number): string {
  const parsed = Number.parseInt(current || "0", 10);
  const base = Number.isNaN(parsed) ? 0 : parsed;
  const next = Math.min(MAX_QUANTITY, Math.max(0, base + delta));

  return next === 0 ? "" : String(next);
}

function formatOrderQuantity(
  quantity: number,
  caseSize: number | null,
  unit: string | null | undefined,
  language: AuthLanguage,
): string | null {
  const convertedQuantity = convertOrderQuantityToCases(quantity, caseSize);

  const quantityUnit = getLocalizedUnit(unit, language);
  if (!convertedQuantity) return quantity > 0 ? `${quantity} ${quantityUnit}` : null;

  const caseUnit = language === "zh" ? "箱" : "CTN";

  return `${convertedQuantity.caseQuantity} ${caseUnit}${
    convertedQuantity.remainingQuantity
      ? ` + ${convertedQuantity.remainingQuantity} ${quantityUnit}`
      : ""
  }`;
}

function getLocalizedUnit(
  unit: string | null | undefined,
  language: AuthLanguage,
): string {
  const unitParts = String(unit || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  if (unitParts.length < 2) {
    return unitParts[0] || (language === "zh" ? "个" : "unités");
  }

  return language === "zh" ? unitParts[0] : unitParts[unitParts.length - 1];
}

function getDeliveryMessage(
  quantity: number,
  caseSize: number | null,
  unit: string | null | undefined,
  language: AuthLanguage,
  isConfirmation: boolean,
): string | null {
  const deliveryQuantity = formatOrderQuantity(quantity, caseSize, unit, language);
  if (!deliveryQuantity) return null;

  if (language === "zh") {
    return `${isConfirmation ? "送" : "这次送"}：${deliveryQuantity}`;
  }

  if (language === "fr") {
    return `${isConfirmation ? "Livraison" : "Cette livraison"} : ${deliveryQuantity}`;
  }

  return `${isConfirmation ? "Delivery" : "This delivery"}: ${deliveryQuantity}`;
}

function getTotalMessage(
  quantity: number,
  caseSize: number | null,
  unit: string | null | undefined,
  language: AuthLanguage,
): string | null {
  const totalQuantity = formatOrderQuantity(quantity, caseSize, unit, language);
  if (!totalQuantity) return null;

  if (language === "zh") return `总计：${totalQuantity}`;
  if (language === "fr") return `Total : ${totalQuantity}`;
  return `Total: ${totalQuantity}`;
}

function getQuantityLabel(language: AuthLanguage): string {
  if (language === "zh") return "数量";
  if (language === "fr") return "Quantité";
  return "Quantity";
}

function resolveApiOrigin(): string {
  try {
    return new URL(MOBILE_API_URL).origin;
  } catch {
    return "";
  }
}

function resolveProductImageUrl(image: string | null | undefined): string | null {
  if (!image) return null;

  if (/^(https?:)?\/\//i.test(image) || image.startsWith("data:")) {
    return image;
  }

  if (!API_ORIGIN) {
    return image;
  }

  return image.startsWith("/")
    ? `${API_ORIGIN}${image}`
    : `${API_ORIGIN}/${image.replace(/^\/+/, "")}`;
}

function buildProductImageSource(image: string | null | undefined): ImageSource | null {
  const resolvedImageUrl = resolveProductImageUrl(image);
  return resolvedImageUrl ? { uri: resolvedImageUrl } : null;
}

export function SectionTitle({ label }: { label: string }) {
  return (
    <TrackingText color={authControlStyles.colors.red} size={10}>
      {label}
    </TrackingText>
  );
}

export function StateRow({ label }: { label: string }) {
  return (
    <View style={styles.stateRow}>
      <ZhaoLoadingIndicator label={label} />
    </View>
  );
}

export function ProductQuantityRow({
  language,
  product,
  quantities,
  showStock,
  inStockLabel,
  imageLoadPriority = "important",
  outOfStockLabel,
  stockMap,
  onChangeQuantity,
}: {
  language: AuthLanguage;
  product: OrderProduct;
  quantities: QuantityMap;
  showStock: boolean;
  inStockLabel: string;
  imageLoadPriority?: AppImageLoadPriority;
  outOfStockLabel: string;
  stockMap: OrderStockMap;
  onChangeQuantity: (variantId: string, value: string) => void;
}) {
  const productName = getOrderProductName(product, language);
  const imageSource = buildProductImageSource(product.image);
  const variants = getOrderProductVariants(product);
  const isInStock =
    product.isInStock !== false && (!showStock || (stockMap[product.id] ?? 0) > 0);
  const shouldShowStockStatus = showStock || product.isInStock === false;
  const hasSingleVariant = variants.length === 1;
  const primaryVariant = variants[0];

  return (
    <View style={[styles.productCard, productCardTabletStyle]}>
      <View style={styles.productHeader}>
        <View style={styles.productImageFrame}>
          <AppImage
            fallback={
              <View style={[styles.productImage, styles.imagePlaceholder]}>
                <Text style={styles.imagePlaceholderText}>{productName.slice(0, 1)}</Text>
              </View>
            }
            loadPriority={imageLoadPriority}
            source={imageSource}
            style={styles.productImage}
          />
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {productName}
          </Text>
          {hasSingleVariant ? (
            <Text style={styles.productSpecification} numberOfLines={1}>
              {primaryVariant?.specification || product.specification || product.reference || "-"}
            </Text>
          ) : null}
          {shouldShowStockStatus ? (
            <View
              style={[
                styles.stockStatus,
                isInStock ? styles.stockStatusInStock : styles.stockStatusOutOfStock,
              ]}
            >
              <Text
                style={[
                  styles.stockStatusText,
                  isInStock
                    ? styles.stockStatusTextInStock
                    : styles.stockStatusTextOutOfStock,
                ]}
              >
                {isInStock ? inStockLabel : outOfStockLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      {variants.map((variant) => {
        const totalMessage = getTotalMessage(
          Number(quantities[variant.id]) || 0,
          variant.caseSize,
          variant.unit || product.unit,
          language,
        );

        return (
          <View key={variant.id} style={styles.productOrderArea}>
            {!hasSingleVariant ? (
              <>
                <Text style={styles.variantOrderLabel} numberOfLines={1}>
                  {variant.specification || product.specification || product.reference || "-"}
                </Text>
              </>
            ) : null}
            <View style={styles.quantityRow}>
              <Text style={styles.quantityLabel}>{getQuantityLabel(language)}</Text>
              <View style={styles.quantityStepper}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="-"
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.stepperButton,
                    styles.stepperButtonLeft,
                    pressed ? styles.stepperButtonPressed : null,
                  ]}
                  onPress={() =>
                    onChangeQuantity(variant.id, stepQuantity(quantities[variant.id], -1))
                  }
                  disabled={!isInStock}
                >
                  <Text style={styles.stepperButtonText}>−</Text>
                </Pressable>
                <TextInput
                  keyboardType="number-pad"
                  maxLength={4}
                  style={styles.quantityInput}
                  value={quantities[variant.id] || ""}
                  onChangeText={(value) => onChangeQuantity(variant.id, value)}
                  editable={isInStock}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="+"
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.stepperButton,
                    styles.stepperButtonRight,
                    pressed ? styles.stepperButtonPressed : null,
                  ]}
                  onPress={() =>
                    onChangeQuantity(variant.id, stepQuantity(quantities[variant.id], 1))
                  }
                  disabled={!isInStock}
                >
                  <Text style={styles.stepperButtonText}>+</Text>
                </Pressable>
              </View>
              <Text style={styles.unitText} numberOfLines={1}>
                {getLocalizedUnit(variant.unit || product.unit, language)}
              </Text>
            </View>
            {totalMessage ? (
              <View style={styles.productTotalResult}>
                <Text style={styles.productTotalResultText}>{totalMessage}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function SelectedLinesList({
  language,
  lines,
}: {
  language: AuthLanguage;
  lines: SelectedOrderLine[];
}) {
  return (
    <View style={styles.selectedList}>
      {lines.map((line) => (
        <View key={line.variant.id} style={styles.selectedLine}>
          <Text style={styles.selectedName}>{getOrderProductName(line.product, language)}</Text>
          <Text style={styles.selectedMeta}>
            {line.variant.specification || line.product.reference || "-"} · {getDeliveryMessage(
              line.quantity,
              line.variant.caseSize,
              line.variant.unit || line.product.unit,
              language,
              true,
            )}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function SummaryRows({
  copy,
  deliveryDate,
  estimatedTotal,
  supplierName,
  totalItems,
}: {
  copy: OrderCopy;
  deliveryDate: string;
  estimatedTotal: number;
  supplierName: string;
  totalItems: number;
}) {
  return (
    <View style={styles.summaryBox}>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>{copy.supplier}</Text>
        <Text style={styles.summaryValue}>{supplierName}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>{copy.deliveryDate}</Text>
        <Text style={styles.summaryValue}>{deliveryDate}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>{copy.totalItems}</Text>
        <Text style={styles.summaryValue}>{totalItems}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>{copy.estimatedTotal}</Text>
        <Text style={styles.summaryValue}>{estimatedTotal.toFixed(2)} EUR</Text>
      </View>
    </View>
  );
}

export function PrimaryButton({
  disabled,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      style={[styles.primaryButton, disabled ? styles.disabledButton : null]}
      onPress={onPress}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.secondaryButton} onPress={onPress}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}
