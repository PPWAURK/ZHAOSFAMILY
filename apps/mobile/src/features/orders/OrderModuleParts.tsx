import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import type { ImageSourcePropType } from "react-native";
import { TrackingText, authControlStyles } from "@/features/auth/AuthFormControls";
import type { AuthLanguage } from "@/features/auth/authCopy";
import {
  getOrderProductName,
  getOrderProductVariants,
} from "@/features/orders/orderApi";
import { translateOrderCategory } from "@/features/orders/orderCategories";
import type { OrderCopy } from "@/features/orders/orderCopy";
import { orderStyles as styles } from "@/features/orders/orderStyles";
import type { SelectedOrderLine } from "@/features/orders/orderFlow";
import type {
  OrderProduct,
  OrderStockMap,
  QuantityMap,
} from "@/features/orders/orderTypes";
import { MOBILE_API_URL } from "@/lib/env";

const API_ORIGIN = resolveApiOrigin();

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

function buildProductImageSource(image: string | null | undefined): ImageSourcePropType | null {
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
      <ActivityIndicator color={authControlStyles.colors.red} />
      <Text style={styles.stateText}>{label}</Text>
    </View>
  );
}

export function ProductQuantityRow({
  language,
  product,
  quantities,
  showStock,
  stockLabel,
  stockMap,
  onChangeQuantity,
}: {
  language: AuthLanguage;
  product: OrderProduct;
  quantities: QuantityMap;
  showStock: boolean;
  stockLabel: string;
  stockMap: OrderStockMap;
  onChangeQuantity: (variantId: string, value: string) => void;
}) {
  const productName = getOrderProductName(product, language);
  const imageSource = buildProductImageSource(product.image);
  const variants = getOrderProductVariants(product);

  return (
    <View style={styles.productCard}>
      <View style={styles.productHeader}>
        <View style={styles.productImageFrame}>
          {imageSource ? (
            <Image source={imageSource} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={[styles.productImage, styles.imagePlaceholder]}>
              <Text style={styles.imagePlaceholderText}>{productName.slice(0, 1)}</Text>
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{productName}</Text>
          {variants.map((variant) => (
            <Text key={variant.id} style={styles.variantText}>
              {variant.specification || product.specification || product.reference || "-"}
            </Text>
          ))}
          {product.reference ? <Text style={styles.productMeta}>{product.reference}</Text> : null}
          {product.category ? (
            <Text style={styles.productMeta}>
              {translateOrderCategory(product.category, language)}
            </Text>
          ) : null}
          {showStock ? (
            <Text style={styles.productMeta}>
              {stockLabel}: {stockMap[product.id] ?? 0}
            </Text>
          ) : null}
        </View>
      </View>
      {variants.map((variant) => (
        <View key={variant.id} style={styles.variantRow}>
          <TextInput
            keyboardType="number-pad"
            maxLength={4}
            style={styles.quantityInput}
            value={quantities[variant.id] || ""}
            onChangeText={(value) => onChangeQuantity(variant.id, value)}
          />
          <Text style={styles.unitText}>{variant.unit || product.unit || "-"}</Text>
        </View>
      ))}
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
            {line.variant.specification || line.product.reference || "-"} x {line.quantity}
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
