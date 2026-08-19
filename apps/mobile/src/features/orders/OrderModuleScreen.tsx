import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import type { ShareAction } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ordersQueryKeys } from "@zhao/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Sharing from "expo-sharing";
import { useScreenName } from "@/lib/useScreenName";
import { authControlStyles } from "@/features/auth/AuthFormControls";
import type { AuthLanguage } from "@/features/auth/authCopy";
import {
  buildCreateOrderItems,
  createPurchaseReturn,
  createPurchaseOrder,
  deletePurchaseOrder,
  downloadOrderPdfToCache,
  fetchOrderDetail,
  fetchOrderHistory,
  fetchOrderInventory,
  fetchOrderProducts,
  fetchOrderReturnDraft,
  fetchOrderSuppliers,
  resolveOrderPdfUrl,
  supplierEnforcesStock,
  updatePurchaseOrder,
} from "@/features/orders/orderApi";
import { translateOrderCategory } from "@/features/orders/orderCategories";
import { ORDER_COPY } from "@/features/orders/orderCopy";
import {
  PrimaryButton,
  ProductQuantityRow,
  SecondaryButton,
  SectionTitle,
  SelectedLinesList,
  StateRow,
  SummaryRows,
} from "@/features/orders/OrderModuleParts";
import { orderStyles as styles } from "@/features/orders/orderStyles";
import { isTablet } from "@/lib/responsive";
import {
  filterProducts,
  getDateAfterDays,
  getDeliveryDate,
  getSelectedLines,
  getStockViolation,
  isValidDate,
  type DeliveryMode,
  type OrderStep,
} from "@/features/orders/orderFlow";
import type {
  OrderProduct,
  OrderDetail,
  OrderHistoryItem,
  OrderReturnDraft,
  OrderStockMap,
  OrderSupplier,
  PurchaseOrder,
  QuantityMap,
  ReturnQuantityMap,
} from "@/features/orders/orderTypes";

type OrderModuleScreenProps = {
  isActive?: boolean;
  language: AuthLanguage;
  storeName?: string;
  onProductViewChange?: (visible: boolean) => void;
};

type OrderModuleMode = "new" | "history";
type SupplierIconName = ComponentProps<typeof Ionicons>["name"];

type SupplierListItemProps = {
  index: number;
  noticeLabel: string;
  reduceMotion: boolean;
  supplier: OrderSupplier;
  language: AuthLanguage;
  onSelect: (supplierId: string) => void;
};

function getSupplierIconName(supplierName: string): SupplierIconName {
  const normalizedName = supplierName.toLowerCase();

  if (normalizedName.includes("labo")) return "cube-outline";
  if (normalizedName.includes("boisson")) return "wine-outline";
  if (normalizedName.includes("verger")) return "nutrition-outline";
  if (normalizedName.includes("emballage") || normalizedName.includes("pack")) {
    return "cube-outline";
  }
  if (normalizedName.includes("bureau")) return "shirt-outline";
  if (normalizedName.includes("jfc")) return "restaurant-outline";
  if (normalizedName.includes("store")) return "cart-outline";

  return "storefront-outline";
}

function SupplierListItem({
  index,
  noticeLabel,
  reduceMotion,
  supplier,
  language,
  onSelect,
}: SupplierListItemProps) {
  const entryProgress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const pressProgress = useRef(new Animated.Value(0)).current;
  const [isPressed, setIsPressed] = useState(false);
  const orderNotice =
    language === "fr"
      ? supplier.orderNoticeFr || supplier.orderNotice || ""
      : supplier.orderNotice || supplier.orderNoticeFr || "";

  useEffect(() => {
    entryProgress.stopAnimation();
    entryProgress.setValue(reduceMotion ? 1 : 0);

    if (reduceMotion) return;

    const animation = Animated.timing(entryProgress, {
      delay: Math.min(index * 45, 315),
      duration: 280,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    });

    animation.start();

    return () => animation.stop();
  }, [entryProgress, index, reduceMotion]);

  function updatePressedState(pressed: boolean): void {
    setIsPressed(pressed);

    if (reduceMotion) return;

    Animated.timing(pressProgress, {
      duration: pressed ? 90 : 150,
      easing: Easing.out(Easing.cubic),
      toValue: pressed ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Pressable
      accessibilityLabel={supplier.name}
      accessibilityRole="button"
      style={styles.supplierPressable}
      onPress={() => onSelect(supplier.id)}
      onPressIn={() => updatePressedState(true)}
      onPressOut={() => updatePressedState(false)}
    >
      <Animated.View
        style={[
          styles.supplierCard,
          isPressed ? styles.supplierCardPressed : null,
          {
            opacity: entryProgress,
            transform: [
              {
                translateY: entryProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [reduceMotion ? 0 : 10, 0],
                }),
              },
              {
                scale: pressProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.99],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.supplierCardHeader}>
          <View style={styles.supplierIconBadge}>
            <Ionicons
              color={authControlStyles.colors.paper}
              name={getSupplierIconName(supplier.name)}
              size={20}
            />
          </View>
          <Text
            numberOfLines={1}
            style={[styles.supplierCardTitle, isPressed ? styles.supplierCardTitlePressed : null]}
          >
            {supplier.name}
          </Text>
        </View>
        <View style={styles.supplierNotice}>
          {orderNotice ? (
            <>
              <Text style={styles.supplierNoticeLabel}>{noticeLabel}</Text>
              <Text ellipsizeMode="tail" numberOfLines={2} style={styles.supplierNoticeText}>
                {orderNotice}
              </Text>
            </>
          ) : null}
        </View>
        <View style={styles.supplierCardChevron}>
          <Ionicons
            color={authControlStyles.colors.red}
            name="chevron-forward"
            size={16}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function OrderModuleScreen({
  isActive = true,
  language,
  storeName,
  onProductViewChange,
}: OrderModuleScreenProps) {
  useScreenName("orders");
  const copy = ORDER_COPY[language];
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<OrderModuleMode>("new");
  const [originalStockMap, setOriginalStockMap] = useState<OrderStockMap>({});
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedHistorySupplierId, setSelectedHistorySupplierId] = useState("");
  const [editingOrder, setEditingOrder] = useState<OrderDetail | null>(null);
  const [activeReturnOrder, setActiveReturnOrder] =
    useState<OrderHistoryItem | null>(null);
  const [returnDraft, setReturnDraft] = useState<OrderReturnDraft | null>(null);
  const [returnErrorMessage, setReturnErrorMessage] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<ReturnQuantityMap>({});
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("tomorrow");
  const [customDate, setCustomDate] = useState(getDateAfterDays(1));
  const [quantities, setQuantities] = useState<QuantityMap>({});
  const [step, setStep] = useState<OrderStep>("edit");
  const [createdOrder, setCreatedOrder] = useState<PurchaseOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [isLoadingOrderDetail, setIsLoadingOrderDetail] = useState(false);
  const [isLoadingReturnDraft, setIsLoadingReturnDraft] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [sharingHistoryOrderId, setSharingHistoryOrderId] = useState<string | null>(
    null,
  );
  const [reduceMotion, setReduceMotion] = useState(false);

  const suppliersQuery = useQuery({
    enabled: isActive,
    meta: { persist: true },
    placeholderData: (previousData) => previousData,
    queryFn: fetchOrderSuppliers,
    queryKey: ordersQueryKeys.suppliers(),
  });
  const orderHistoryQuery = useQuery({
    enabled: isActive && mode === "history",
    meta: { persist: true },
    placeholderData: (previousData) => previousData,
    queryFn: fetchOrderHistory,
    queryKey: ordersQueryKeys.history(),
  });
  const orderProductsQuery = useQuery({
    enabled: isActive && Boolean(selectedSupplierId),
    meta: { persist: true },
    placeholderData: (previousData) => previousData,
    queryFn: async (): Promise<{ products: OrderProduct[]; stockMap: OrderStockMap }> => {
      const [products, stockMap] = await Promise.all([
        fetchOrderProducts(selectedSupplierId),
        fetchOrderInventory(selectedSupplierId),
      ]);

      return { products, stockMap };
    },
    queryKey: ordersQueryKeys.products(selectedSupplierId),
  });
  const suppliers = suppliersQuery.data ?? [];
  const orderHistory = orderHistoryQuery.data ?? [];
  const products = orderProductsQuery.data?.products ?? [];
  const stockMap = orderProductsQuery.data?.stockMap ?? {};
  const isLoadingSuppliers = suppliersQuery.isPending;
  const isLoadingHistory = orderHistoryQuery.isPending;
  const isLoadingProducts = isLoadingOrderDetail || orderProductsQuery.isPending;
  const queryLoadError =
    suppliersQuery.isError || orderHistoryQuery.isError || orderProductsQuery.isError
      ? copy.loadError
      : "";
  const visibleErrorMessage = errorMessage || queryLoadError;

  const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedSupplierId);
  const orderNotice =
    language === "fr"
      ? selectedSupplier?.orderNoticeFr || selectedSupplier?.orderNotice || ""
      : selectedSupplier?.orderNotice || selectedSupplier?.orderNoticeFr || "";
  // The product-selection page (supplier chosen, editing a new order) is the
  // only long-scrolling view — let the host show its scroll-to helpers there.
  const isProductView =
    mode === "new" && step === "edit" && Boolean(selectedSupplierId);

  useEffect(() => {
    onProductViewChange?.(isProductView);
  }, [isProductView, onProductViewChange]);

  useEffect(() => () => onProductViewChange?.(false), [onProductViewChange]);

  useEffect(() => {
    let isMounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const historySupplierOptions = useMemo(
    () => buildHistorySupplierOptions(orderHistory),
    [orderHistory],
  );
  const filteredOrderHistory = useMemo(
    () =>
      selectedHistorySupplierId
        ? orderHistory.filter(
            (order) => String(order.supplierId) === selectedHistorySupplierId,
          )
        : orderHistory,
    [orderHistory, selectedHistorySupplierId],
  );
  const productCategories = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => product.category?.trim() ?? "")
            .filter((category) => category.length > 0),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [products],
  );
  const filteredProducts = useMemo(
    () => filterProducts(products, productSearch, selectedCategory, language),
    [language, productSearch, products, selectedCategory],
  );
  const selectedLines = useMemo(
    () => getSelectedLines(products, quantities),
    [products, quantities],
  );
  const availableStockMap = useMemo(
    () => mergeStockMaps(stockMap, originalStockMap),
    [originalStockMap, stockMap],
  );
  const deliveryDate = getDeliveryDate(deliveryMode, customDate);
  const orderItems = useMemo(() => buildCreateOrderItems(quantities), [quantities]);
  const totalItems = selectedLines.reduce((sum, line) => sum + line.orderedQuantity, 0);
  const estimatedTotal = selectedLines.reduce(
    (sum, line) => sum + line.orderedQuantity * (line.variant.price ?? 0),
    0,
  );
  const isStockEnforced = supplierEnforcesStock(selectedSupplierId);
  const stockViolation = isStockEnforced
    ? getStockViolation(products, quantities, availableStockMap, language)
    : null;
  function updateQuantity(variantId: string, value: string): void {
    const sanitizedValue = value.replace(/[^0-9]/g, "");
    setQuantities((current) => ({ ...current, [variantId]: sanitizedValue }));
    setErrorMessage("");
  }

  function validateOrderDraft(): boolean {
    if (!selectedSupplierId) {
      setErrorMessage(copy.selectSupplierError);
      return false;
    }

    if (!isValidDate(deliveryDate)) {
      setErrorMessage(copy.dateError);
      return false;
    }

    if (orderItems.length === 0) {
      setErrorMessage(copy.quantityError);
      return false;
    }

    if (stockViolation) {
      setErrorMessage(
        `${copy.stockErrorPrefix}: ${stockViolation.productName} ${stockViolation.requestedQuantity}/${stockViolation.availableQuantity}`,
      );
      return false;
    }

    setErrorMessage("");
    return true;
  }

  function handleGoToConfirm(): void {
    if (validateOrderDraft()) {
      setStep("confirm");
    }
  }

  async function handleSubmitOrder(): Promise<void> {
    if (!validateOrderDraft()) return;

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      const order = editingOrder
        ? await updatePurchaseOrder(editingOrder.id, deliveryDate, quantities)
        : await createPurchaseOrder(deliveryDate, quantities);
      setCreatedOrder(order);
      await queryClient.invalidateQueries({ queryKey: ordersQueryKeys.history() });
      setStep("complete");
    } catch {
      setErrorMessage(editingOrder ? copy.updateError : copy.submitError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSharePdf(): Promise<void> {
    const pdfUrl = createdOrder?.commandeUrl || createdOrder?.bonUrl;
    const pdfFileName = buildSharedOrderPdfName(
      createdOrder?.restaurantName || storeName,
      createdOrder?.deliveryDate || deliveryDate,
    );

    if (!pdfUrl) {
      setShareMessage(copy.noPdf);
      return;
    }

    try {
      setIsSharingPdf(true);
      setShareMessage("");
      const result = await shareOrderPdf(pdfUrl, pdfFileName);

      setStep("share");
      setShareMessage(result.action === Share.dismissedAction ? copy.shareCancelled : copy.shareDone);
    } catch {
      setShareMessage(copy.shareError);
    } finally {
      setIsSharingPdf(false);
    }
  }

  function handleSelectSupplier(supplierId: string): void {
    setSelectedSupplierId(supplierId);
    setEditingOrder(null);
    setOriginalStockMap({});
    setQuantities({});
    setProductSearch("");
    setSelectedCategory("");
    setStep("edit");
    setCreatedOrder(null);
    setShareMessage("");
  }

  function handleBackToSuppliers(): void {
    if (editingOrder) {
      setMode("history");
      setSelectedSupplierId("");
      setEditingOrder(null);
      setOriginalStockMap({});
      setQuantities({});
      setStep("edit");
      setErrorMessage("");
      return;
    }

    setSelectedSupplierId("");
    setOriginalStockMap({});
    setQuantities({});
    setProductSearch("");
    setSelectedCategory("");
    setErrorMessage("");
  }

  function handleStartNewOrder(): void {
    setMode("new");
    setQuantities({});
    setSelectedSupplierId("");
    setEditingOrder(null);
    setOriginalStockMap({});
    setProductSearch("");
    setSelectedCategory("");
    setStep("edit");
    setCreatedOrder(null);
    setShareMessage("");
    setErrorMessage("");
  }

  function handleChangeMode(nextMode: OrderModuleMode): void {
    setMode(nextMode);
    setSelectedSupplierId("");
    setEditingOrder(null);
    clearReturnPanel();
    setOriginalStockMap({});
    setQuantities({});
    setProductSearch("");
    setSelectedCategory("");
    setStep("edit");
    setCreatedOrder(null);
    setShareMessage("");
    setErrorMessage("");
    setSelectedHistorySupplierId("");
  }

  function clearReturnPanel(): void {
    setActiveReturnOrder(null);
    setReturnDraft(null);
    setReturnErrorMessage("");
    setReturnReason("");
    setReturnNotes("");
    setReturnQuantities({});
  }

  async function refreshOrderHistory(): Promise<void> {
    await queryClient.refetchQueries({ queryKey: ordersQueryKeys.history() });
  }

  async function handleDeleteHistoryOrder(order: OrderHistoryItem): Promise<void> {
    if (order.canDelete === false || (order.returnCount && order.returnCount > 0)) {
      return;
    }

    const orderNumber = order.number || String(order.id);

    Alert.alert(
      copy.confirmDeleteTitle,
      copy.confirmDeleteMessage.replace("{number}", orderNumber),
      [
        { text: copy.confirmDeleteCancel, style: "cancel" },
        {
          text: copy.confirmDeleteConfirm,
          style: "destructive",
          onPress: () => {
            void deleteHistoryOrder(order.id);
          },
        },
      ],
    );
  }

  async function deleteHistoryOrder(orderId: number | string): Promise<void> {
    try {
      setDeletingOrderId(String(orderId));
      setErrorMessage("");
      await deletePurchaseOrder(orderId);
      await refreshOrderHistory();
      clearReturnPanel();
      setShareMessage(copy.deletedOrder);
    } catch {
      setErrorMessage(copy.deleteError);
    } finally {
      setDeletingOrderId(null);
    }
  }

  async function handleShareHistoryOrder(order: OrderHistoryItem): Promise<void> {
    const pdfUrl = order.commandeUrl || order.bonUrl;
    const pdfFileName = buildSharedOrderPdfName(
      order.restaurantName || storeName,
      order.deliveryDate,
    );

    if (!pdfUrl) {
      setShareMessage(copy.noPdf);
      return;
    }

    try {
      setSharingHistoryOrderId(String(order.id));
      setErrorMessage("");
      setShareMessage("");
      const result = await shareOrderPdf(pdfUrl, pdfFileName);

      setShareMessage(
        result.action === Share.dismissedAction ? copy.shareCancelled : copy.shareDone,
      );
    } catch {
      setErrorMessage(copy.shareError);
    } finally {
      setSharingHistoryOrderId(null);
    }
  }

  async function handleOpenReturn(order: OrderHistoryItem): Promise<void> {
    if (order.canReturn === false) {
      return;
    }

    try {
      clearReturnPanel();
      setActiveReturnOrder(order);
      setIsLoadingReturnDraft(true);
      setErrorMessage("");
      const draft = await fetchOrderReturnDraft(order.id);
      setReturnDraft(draft);
    } catch {
      setReturnErrorMessage(copy.returnSubmitError);
    } finally {
      setIsLoadingReturnDraft(false);
    }
  }

  function updateReturnQuantity(
    purchaseOrderItemId: number,
    value: string,
    maxQuantity: number,
  ): void {
    const parsedValue = Number(value.replace(/[^0-9]/g, "")) || 0;
    const nextQuantity = Math.min(Math.max(parsedValue, 0), maxQuantity);

    setReturnQuantities((current) => ({
      ...current,
      [String(purchaseOrderItemId)]: nextQuantity > 0 ? String(nextQuantity) : "",
    }));
    setReturnErrorMessage("");
  }

  async function handleSubmitReturn(): Promise<void> {
    if (!returnDraft || isSubmittingReturn) {
      return;
    }

    const reason = returnReason.trim();
    const selectedItems = Object.values(returnQuantities).filter(
      (quantity) => Number(quantity) > 0,
    );

    if (!reason) {
      setReturnErrorMessage(copy.returnReasonRequired);
      return;
    }

    if (selectedItems.length === 0) {
      setReturnErrorMessage(copy.returnItemRequired);
      return;
    }

    try {
      setIsSubmittingReturn(true);
      setReturnErrorMessage("");
      await createPurchaseReturn({
        orderId: returnDraft.orderId,
        reason,
        notes: returnNotes.trim() || undefined,
        quantities: returnQuantities,
      });
      await refreshOrderHistory();
      clearReturnPanel();
      setShareMessage(copy.returnCreated);
    } catch {
      setReturnErrorMessage(copy.returnSubmitError);
    } finally {
      setIsSubmittingReturn(false);
    }
  }

  async function handleSelectHistoryOrder(order: OrderHistoryItem): Promise<void> {
    if (order.canEdit === false) {
      setErrorMessage(copy.returnedOrderLocked);
      return;
    }

    if (order.returnCount && order.returnCount > 0) {
      setErrorMessage(copy.returnedOrderLocked);
      return;
    }

    try {
      setIsLoadingOrderDetail(true);
      setErrorMessage("");
      const detail = await fetchOrderDetail(order.id);

      if (!detail.canEdit || (detail.returnCount && detail.returnCount > 0)) {
        setErrorMessage(copy.returnedOrderLocked);
        return;
      }

      setEditingOrder(detail);
      clearReturnPanel();
      setSelectedSupplierId(String(detail.supplierId));
      setDeliveryMode("other");
      setCustomDate(detail.deliveryDate);
      setQuantities(buildQuantitiesFromOrderDetail(detail));
      setOriginalStockMap(buildOriginalStockMap(detail));
      setProductSearch("");
      setSelectedCategory("");
      setCreatedOrder(null);
      setShareMessage("");
      setStep("edit");
      setMode("new");
    } catch {
      setErrorMessage(copy.loadError);
    } finally {
      setIsLoadingOrderDetail(false);
    }
  }

  return (
    <View style={styles.module}>
      <View style={styles.modeRow}>
        {[
          { id: "new", label: copy.newTab },
          { id: "history", label: copy.historyTab },
        ].map((item) => (
          <Pressable
            key={item.id}
            style={[
              styles.modeButton,
              mode === item.id ? styles.modeButtonActive : null,
            ]}
            onPress={() => handleChangeMode(item.id as OrderModuleMode)}
          >
            <Text
              style={[
                styles.modeText,
                mode === item.id ? styles.modeTextActive : null,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === "history" ? (
        <View style={styles.section}>
          <SectionTitle label={copy.orderHistory} />
          {isLoadingHistory ? <StateRow label={copy.loadingOrders} /> : null}
          {!isLoadingHistory && orderHistory.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.historySupplierScroller}
              contentContainerStyle={styles.historySupplierRow}
            >
              <Pressable
                style={[
                  styles.historySupplierButton,
                  selectedHistorySupplierId === ""
                    ? styles.historySupplierButtonActive
                    : null,
                ]}
                onPress={() => setSelectedHistorySupplierId("")}
              >
                <Text
                  style={[
                    styles.historySupplierText,
                    selectedHistorySupplierId === ""
                      ? styles.historySupplierTextActive
                      : null,
                  ]}
                >
                  {copy.allSuppliers}
                </Text>
              </Pressable>
              {historySupplierOptions.map((supplier) => (
                <Pressable
                  key={supplier.id}
                  style={[
                    styles.historySupplierButton,
                    selectedHistorySupplierId === supplier.id
                      ? styles.historySupplierButtonActive
                      : null,
                  ]}
                  onPress={() => setSelectedHistorySupplierId(supplier.id)}
                >
                  <Text
                    style={[
                      styles.historySupplierText,
                      selectedHistorySupplierId === supplier.id
                        ? styles.historySupplierTextActive
                        : null,
                    ]}
                  >
                    {supplier.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          {!isLoadingHistory && filteredOrderHistory.length === 0 ? (
            <Text style={styles.stateText}>{copy.emptyOrders}</Text>
          ) : null}
          <View style={styles.orderHistoryList}>
            {filteredOrderHistory.map((order) => {
              const isLocked = Boolean(order.returnCount && order.returnCount > 0);
              const isDeletingOrder = deletingOrderId === String(order.id);
              const isSharingOrder = sharingHistoryOrderId === String(order.id);
              const canEditOrder = order.canEdit !== false && !isLocked;
              const canReturnOrder = order.canReturn !== false;
              const canDeleteOrder = order.canDelete !== false && !isLocked;
              const isActiveReturnOrder = activeReturnOrder?.id === order.id;

              return (
                <View key={order.id} style={styles.orderHistoryItem}>
                  <View style={[styles.orderCard, isLocked ? styles.orderCardLocked : null]}>
                    <Text style={styles.orderCardTitle}>{order.number}</Text>
                    <Text style={styles.orderCardMeta}>
                      {order.supplierName || "-"} · {order.deliveryDate || "-"}
                    </Text>
                    <Text style={styles.orderCardMeta}>
                      {copy.totalItems}: {order.totalItems ?? 0} · {copy.estimatedTotal}:{" "}
                      {(order.totalAmount ?? 0).toFixed(2)} EUR
                    </Text>
                    {isLocked ? (
                      <Text style={styles.errorText}>{copy.returnedOrderLocked}</Text>
                    ) : null}
                    <View style={styles.orderCardActions}>
                      <Pressable
                        disabled={!canEditOrder || isDeletingOrder}
                        style={[
                          styles.orderCardAction,
                          styles.orderCardActionPrimary,
                          !canEditOrder || isDeletingOrder ? styles.disabledButton : null,
                        ]}
                        onPress={() => void handleSelectHistoryOrder(order)}
                      >
                        <Text
                          style={[styles.orderCardActionText, styles.orderCardActionTextPrimary]}
                        >
                          {copy.editOrder}
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={isSharingOrder || isDeletingOrder}
                        style={[
                          styles.orderCardAction,
                          isSharingOrder || isDeletingOrder ? styles.disabledButton : null,
                        ]}
                        onPress={() => void handleShareHistoryOrder(order)}
                      >
                        <Text style={styles.orderCardActionText}>
                          {isSharingOrder ? copy.preparingPdf : copy.sharePdf}
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={!canReturnOrder || isDeletingOrder}
                        style={[
                          styles.orderCardAction,
                          !canReturnOrder || isDeletingOrder ? styles.disabledButton : null,
                        ]}
                        onPress={() => void handleOpenReturn(order)}
                      >
                        <Text style={styles.orderCardActionText}>{copy.returnOrder}</Text>
                      </Pressable>
                      <Pressable
                        disabled={!canDeleteOrder || isDeletingOrder}
                        style={[
                          styles.orderCardAction,
                          styles.orderCardActionDanger,
                          !canDeleteOrder || isDeletingOrder ? styles.disabledButton : null,
                        ]}
                        onPress={() => void handleDeleteHistoryOrder(order)}
                      >
                        <Text style={styles.orderCardActionText}>
                          {isDeletingOrder ? copy.deletingOrder : copy.deleteOrder}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  {isActiveReturnOrder ? (
                    <View style={styles.returnPanel}>
                      <SectionTitle label={`${copy.returnTitle}: ${order.number}`} />
                      {isLoadingReturnDraft ? (
                        <StateRow label={copy.loadingReturnDraft} />
                      ) : returnErrorMessage ? (
                        <Text style={styles.errorText}>{returnErrorMessage}</Text>
                      ) : returnDraft?.items.some((item) => item.remainingQuantity > 0) ? (
                        <>
                          <View style={styles.returnField}>
                            <Text style={styles.returnFieldLabel}>{copy.returnReason}</Text>
                            <TextInput
                              style={styles.returnInput}
                              value={returnReason}
                              onChangeText={(value) => {
                                setReturnReason(value);
                                setReturnErrorMessage("");
                              }}
                            />
                          </View>
                          <View style={styles.returnField}>
                            <Text style={styles.returnFieldLabel}>{copy.returnNotes}</Text>
                            <TextInput
                              multiline
                              style={[styles.returnInput, styles.returnNotesInput]}
                              value={returnNotes}
                              onChangeText={setReturnNotes}
                            />
                          </View>
                          <View style={styles.returnItemList}>
                            {returnDraft.items
                              .filter((item) => item.remainingQuantity > 0)
                              .map((item) => (
                                <View key={item.purchaseOrderItemId} style={styles.returnItem}>
                                  <View style={styles.returnItemInfo}>
                                    <Text style={styles.selectedName}>
                                      {language === "zh"
                                        ? item.nameZh || item.nameFr || "-"
                                        : item.nameFr || item.nameZh || "-"}
                                    </Text>
                                    <Text style={styles.returnItemMeta}>
                                      {item.specification || "-"} · {item.unit || "-"}
                                    </Text>
                                    <Text style={styles.returnItemMeta}>
                                      {copy.returnRemaining}: {item.remainingQuantity}
                                    </Text>
                                  </View>
                                  <TextInput
                                    keyboardType="number-pad"
                                    maxLength={4}
                                    style={styles.quantityInput}
                                    value={returnQuantities[String(item.purchaseOrderItemId)] || ""}
                                    placeholder="0"
                                    onChangeText={(value) =>
                                      updateReturnQuantity(
                                        item.purchaseOrderItemId,
                                        value,
                                        item.remainingQuantity,
                                      )
                                    }
                                    accessibilityLabel={copy.returnQuantity}
                                  />
                                </View>
                              ))}
                          </View>
                          <PrimaryButton
                            disabled={isSubmittingReturn}
                            label={isSubmittingReturn ? copy.submittingReturn : copy.submitReturn}
                            onPress={handleSubmitReturn}
                          />
                        </>
                      ) : (
                        <Text style={styles.stateText}>{copy.returnEmpty}</Text>
                      )}
                      <SecondaryButton label={copy.cancelReturn} onPress={clearReturnPanel} />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
          {shareMessage ? <Text style={styles.stateText}>{shareMessage}</Text> : null}
          {visibleErrorMessage ? <Text style={styles.errorText}>{visibleErrorMessage}</Text> : null}
        </View>
      ) : null}

      {mode === "new" && step === "edit" && !selectedSupplierId ? (
        <View style={styles.section}>
          <SectionTitle label={copy.supplier} />
          {isLoadingSuppliers ? (
            <StateRow label={copy.loadingSuppliers} />
          ) : (
            <View style={styles.supplierGrid}>
              {suppliers.map((supplier, index) => (
                <SupplierListItem
                  key={supplier.id}
                  index={index}
                  language={language}
                  noticeLabel={copy.orderNotice}
                  reduceMotion={reduceMotion}
                  supplier={supplier}
                  onSelect={handleSelectSupplier}
                />
              ))}
            </View>
          )}
          {visibleErrorMessage ? <Text style={styles.errorText}>{visibleErrorMessage}</Text> : null}
        </View>
      ) : null}

      {mode === "new" && step === "edit" && selectedSupplierId ? (
        <View style={styles.section}>
          <Pressable
            accessibilityLabel={editingOrder ? copy.backToHistory : copy.backToSuppliers}
            accessibilityRole="button"
            style={styles.backNavigation}
            onPress={handleBackToSuppliers}
          >
            <Ionicons
              color={authControlStyles.colors.red}
              name="arrow-back"
              size={20}
            />
            <Text style={styles.backNavigationText}>
              {editingOrder ? copy.backToHistory : copy.backToSuppliers}
            </Text>
          </Pressable>
          {editingOrder ? (
            <Text style={styles.stateText}>
              {copy.editingOrder}: {editingOrder.number}
            </Text>
          ) : null}
          <SummaryRows
            copy={copy}
            deliveryDate={deliveryDate}
            estimatedTotal={estimatedTotal}
            supplierName={selectedSupplier?.name || editingOrder?.supplierName || "-"}
            totalItems={totalItems}
          />
          <SectionTitle label={copy.deliveryDate} />
          <View style={styles.segmentRow}>
            {[
              { id: "today", label: copy.today },
              { id: "tomorrow", label: copy.tomorrow },
              { id: "other", label: copy.otherDate },
            ].map((item) => (
              <Pressable
                key={item.id}
                style={[
                  styles.segmentButton,
                  deliveryMode === item.id ? styles.segmentButtonActive : null,
                ]}
                onPress={() => setDeliveryMode(item.id as DeliveryMode)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    deliveryMode === item.id ? styles.segmentTextActive : null,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {deliveryMode === "other" ? (
            <TextInput
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              placeholder={copy.customDatePlaceholder}
              placeholderTextColor={authControlStyles.colors.ink40}
              style={styles.dateInput}
              value={customDate}
              onChangeText={setCustomDate}
            />
          ) : (
            <Text style={styles.datePreview}>{deliveryDate}</Text>
          )}

          <SectionTitle label={copy.productFilter} />
          <TextInput
            autoCapitalize="none"
            placeholder={copy.filterPlaceholder}
            placeholderTextColor={authControlStyles.colors.ink40}
            style={styles.searchInput}
            value={productSearch}
            onChangeText={setProductSearch}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipList}
            style={styles.categoryChipScroller}
          >
            <Pressable
              style={[
                styles.categoryChip,
                selectedCategory === "" ? styles.categoryChipActive : null,
              ]}
              onPress={() => setSelectedCategory("")}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === "" ? styles.categoryChipTextActive : null,
                ]}
              >
                {copy.allCategories}
              </Text>
            </Pressable>
            {productCategories.map((category) => (
              <Pressable
                key={category}
                style={[
                  styles.categoryChip,
                  selectedCategory === category ? styles.categoryChipActive : null,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === category ? styles.categoryChipTextActive : null,
                  ]}
                >
                  {translateOrderCategory(category, language)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {orderNotice ? (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>{copy.orderNotice}</Text>
              <Text style={styles.summaryValue}>{orderNotice}</Text>
            </View>
          ) : null}
          <SectionTitle label={copy.products} />
          {isLoadingProducts ? <StateRow label={copy.loadingProducts} /> : null}
          {!isLoadingProducts && selectedSupplierId && products.length === 0 ? (
            <Text style={styles.stateText}>{copy.emptyProducts}</Text>
          ) : null}
          {!isLoadingProducts && products.length > 0 && filteredProducts.length === 0 ? (
            <Text style={styles.stateText}>{copy.emptyFilteredProducts}</Text>
          ) : null}
          <View
            style={[
              styles.productList,
              isTablet ? { justifyContent: "flex-start" } : null,
            ]}
          >
            {filteredProducts.map((product, index) => (
              <ProductQuantityRow
                key={product.id}
                imageLoadPriority={index < 3 ? "critical" : "lazy"}
                language={language}
                product={product}
                quantities={quantities}
                showStock={isStockEnforced}
                stockMap={availableStockMap}
                inStockLabel={copy.inStock}
                outOfStockLabel={copy.outOfStock}
                onChangeQuantity={updateQuantity}
              />
            ))}
          </View>
          {visibleErrorMessage ? <Text style={styles.errorText}>{visibleErrorMessage}</Text> : null}
          <PrimaryButton label={copy.confirm} onPress={handleGoToConfirm} />
        </View>
      ) : null}

      {mode === "new" && step === "confirm" ? (
        <View style={styles.section}>
          <SummaryRows
            copy={copy}
            deliveryDate={deliveryDate}
            estimatedTotal={estimatedTotal}
            supplierName={selectedSupplier?.name || editingOrder?.supplierName || "-"}
            totalItems={totalItems}
          />
          <SelectedLinesList language={language} lines={selectedLines} />
          {visibleErrorMessage ? <Text style={styles.errorText}>{visibleErrorMessage}</Text> : null}
          <PrimaryButton
            disabled={isSubmitting}
            label={isSubmitting ? "..." : editingOrder ? copy.update : copy.submit}
            onPress={() => void handleSubmitOrder()}
          />
          <SecondaryButton label={copy.back} onPress={() => setStep("edit")} />
        </View>
      ) : null}

      {mode === "new" && (step === "complete" || step === "share") ? (
        <View style={styles.section}>
          <SummaryRows
            copy={copy}
            deliveryDate={createdOrder?.deliveryDate || deliveryDate}
            estimatedTotal={createdOrder?.totalAmount ?? estimatedTotal}
            supplierName={
              createdOrder?.supplierName ||
              selectedSupplier?.name ||
              editingOrder?.supplierName ||
              "-"
            }
            totalItems={createdOrder?.totalItems ?? totalItems}
          />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{copy.orderNumber}</Text>
            <Text style={styles.summaryValue}>{createdOrder?.number || "-"}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{copy.pdfStatus}</Text>
            <Text style={styles.summaryValue}>
              {createdOrder?.commandeUrl || createdOrder?.bonUrl ? copy.shareReady : copy.noPdf}
            </Text>
          </View>
          {shareMessage ? <Text style={styles.stateText}>{shareMessage}</Text> : null}
          <PrimaryButton
            disabled={isSharingPdf}
            label={
              isSharingPdf
                ? copy.preparingPdf
                : step === "share"
                  ? copy.shareAgain
                  : copy.sharePdf
            }
            onPress={() => void handleSharePdf()}
          />
          <SecondaryButton label={copy.newOrder} onPress={handleStartNewOrder} />
        </View>
      ) : null}
    </View>
  );
}

async function shareOrderPdf(pdfUrl: string, pdfFileName: string): Promise<ShareAction> {
  const normalizedPdfUrl = resolveOrderPdfUrl(pdfUrl);

  try {
    const localPdfUri = await downloadOrderPdfToCache(pdfUrl, pdfFileName);
    const canShareFiles = await Sharing.isAvailableAsync();

    if (canShareFiles) {
      await Sharing.shareAsync(localPdfUri, {
        dialogTitle: pdfFileName,
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
      });

      return { action: Share.sharedAction };
    }
  } catch {
    return shareOrderPdfLink(normalizedPdfUrl, pdfFileName);
  }

  return shareOrderPdfLink(normalizedPdfUrl, pdfFileName);
}

async function shareOrderPdfLink(
  normalizedPdfUrl: string,
  pdfFileName: string,
): Promise<ShareAction> {
  try {
    return await Share.share({
      title: pdfFileName,
      message: normalizedPdfUrl,
      url: normalizedPdfUrl,
    });
  } catch {
    try {
      await Linking.openURL(normalizedPdfUrl);
    } catch {
      return { action: Share.dismissedAction };
    }

    return { action: Share.sharedAction };
  }
}

function buildSharedOrderPdfName(
  restaurantName: string | null | undefined,
  deliveryDate: string | null | undefined,
): string {
  const safeRestaurantName = restaurantName?.trim() || "restaurant";
  const safeDeliveryDate = deliveryDate?.trim() || "date";

  return `${safeRestaurantName}-${safeDeliveryDate}`;
}

function buildHistorySupplierOptions(
  orders: OrderHistoryItem[],
): Array<{ id: string; name: string }> {
  const supplierById = new Map<string, string>();

  orders.forEach((order) => {
    if (order.supplierId === undefined || !order.supplierName) return;
    supplierById.set(String(order.supplierId), order.supplierName);
  });

  return Array.from(supplierById.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function buildQuantitiesFromOrderDetail(order: OrderDetail): QuantityMap {
  return order.items.reduce<QuantityMap>((nextQuantities, item) => {
    const slot = item.specificationSlot ?? 1;
    nextQuantities[`${item.productId}:${slot}`] = String(item.quantity);
    return nextQuantities;
  }, {});
}

function buildOriginalStockMap(order: OrderDetail): OrderStockMap {
  return order.items.reduce<OrderStockMap>((nextStockMap, item) => {
    nextStockMap[item.productId] = (nextStockMap[item.productId] ?? 0) + item.quantity;
    return nextStockMap;
  }, {});
}

function mergeStockMaps(
  stockMap: OrderStockMap,
  originalStockMap: OrderStockMap,
): OrderStockMap {
  return Object.entries(originalStockMap).reduce<OrderStockMap>(
    (nextStockMap, [productId, quantity]) => {
      nextStockMap[productId] = (nextStockMap[productId] ?? 0) + quantity;
      return nextStockMap;
    },
    { ...stockMap },
  );
}
