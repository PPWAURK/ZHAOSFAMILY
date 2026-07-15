import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
  language: AuthLanguage;
  storeName?: string;
  onProductViewChange?: (visible: boolean) => void;
};

type OrderModuleMode = "new" | "history";

export function OrderModuleScreen({
  language,
  storeName,
  onProductViewChange,
}: OrderModuleScreenProps) {
  useScreenName("orders");
  const copy = ORDER_COPY[language];
  const [mode, setMode] = useState<OrderModuleMode>("new");
  const [suppliers, setSuppliers] = useState<OrderSupplier[]>([]);
  const [orderHistory, setOrderHistory] = useState<OrderHistoryItem[]>([]);
  const [products, setProducts] = useState<OrderProduct[]>([]);
  const [stockMap, setStockMap] = useState<OrderStockMap>({});
  const [originalStockMap, setOriginalStockMap] = useState<OrderStockMap>({});
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [selectedHistorySupplierId, setSelectedHistorySupplierId] = useState("");
  const [editingOrder, setEditingOrder] = useState<OrderDetail | null>(null);
  const [activeReturnOrder, setActiveReturnOrder] =
    useState<OrderHistoryItem | null>(null);
  const [returnDraft, setReturnDraft] = useState<OrderReturnDraft | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<ReturnQuantityMap>({});
  const [areFiltersVisible, setAreFiltersVisible] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("tomorrow");
  const [customDate, setCustomDate] = useState(getDateAfterDays(1));
  const [quantities, setQuantities] = useState<QuantityMap>({});
  const [step, setStep] = useState<OrderStep>("edit");
  const [createdOrder, setCreatedOrder] = useState<PurchaseOrder | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingReturnDraft, setIsLoadingReturnDraft] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedSupplierId);
  // The product-selection page (supplier chosen, editing a new order) is the
  // only long-scrolling view — let the host show its scroll-to helpers there.
  const isProductView =
    mode === "new" && step === "edit" && Boolean(selectedSupplierId);

  useEffect(() => {
    onProductViewChange?.(isProductView);
  }, [isProductView, onProductViewChange]);

  useEffect(() => () => onProductViewChange?.(false), [onProductViewChange]);
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
  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const estimatedTotal = selectedLines.reduce(
    (sum, line) => sum + line.quantity * (line.variant.price ?? 0),
    0,
  );
  const isStockEnforced = supplierEnforcesStock(selectedSupplierId);
  const stockViolation = isStockEnforced
    ? getStockViolation(products, quantities, availableStockMap, language)
    : null;
  useEffect(() => {
    let isCancelled = false;

    async function loadSuppliers(): Promise<void> {
      try {
        setIsLoadingSuppliers(true);
        setErrorMessage("");
        const nextSuppliers = await fetchOrderSuppliers();

        if (!isCancelled) {
          setSuppliers(nextSuppliers);
        }
      } catch {
        if (!isCancelled) {
          setErrorMessage(copy.loadError);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingSuppliers(false);
        }
      }
    }

    void loadSuppliers();

    return () => {
      isCancelled = true;
    };
  }, [copy.loadError]);

  useEffect(() => {
    let isCancelled = false;

    async function loadHistory(): Promise<void> {
      if (mode !== "history") return;

      try {
        setIsLoadingHistory(true);
        setErrorMessage("");
        const orders = await fetchOrderHistory();

        if (!isCancelled) {
          setOrderHistory(orders);
        }
      } catch {
        if (!isCancelled) {
          setOrderHistory([]);
          setErrorMessage(copy.loadError);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingHistory(false);
        }
      }
    }

    void loadHistory();

    return () => {
      isCancelled = true;
    };
  }, [copy.loadError, mode]);

  useEffect(() => {
    let isCancelled = false;

    async function loadProducts(): Promise<void> {
      if (!selectedSupplierId) {
        setProducts([]);
        setStockMap({});
        return;
      }

      try {
        setIsLoadingProducts(true);
        setErrorMessage("");
        const [nextProducts, nextStockMap] = await Promise.all([
          fetchOrderProducts(selectedSupplierId),
          fetchOrderInventory(selectedSupplierId),
        ]);

        if (!isCancelled) {
          setProducts(nextProducts);
          setStockMap(nextStockMap);
        }
      } catch {
        if (!isCancelled) {
          setProducts([]);
          setStockMap({});
          setErrorMessage(copy.loadError);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProducts(false);
        }
      }
    }

    void loadProducts();

    return () => {
      isCancelled = true;
    };
  }, [copy.loadError, selectedSupplierId]);

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
      setOrderHistory([]);
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
    setAreFiltersVisible(false);
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
    setAreFiltersVisible(false);
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
    setAreFiltersVisible(false);
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
    setAreFiltersVisible(false);
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
    setReturnReason("");
    setReturnNotes("");
    setReturnQuantities({});
  }

  async function refreshOrderHistory(): Promise<void> {
    const orders = await fetchOrderHistory();
    setOrderHistory(orders);
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

  async function handleOpenReturn(order: OrderHistoryItem): Promise<void> {
    if (order.canReturn === false) {
      return;
    }

    try {
      setActiveReturnOrder(order);
      setReturnDraft(null);
      setReturnReason("");
      setReturnNotes("");
      setReturnQuantities({});
      setIsLoadingReturnDraft(true);
      setErrorMessage("");
      const draft = await fetchOrderReturnDraft(order.id);
      setReturnDraft(draft);
    } catch {
      setErrorMessage(copy.returnSubmitError);
      clearReturnPanel();
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
    setErrorMessage("");
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
      setErrorMessage(copy.returnReasonRequired);
      return;
    }

    if (selectedItems.length === 0) {
      setErrorMessage(copy.returnItemRequired);
      return;
    }

    try {
      setIsSubmittingReturn(true);
      setErrorMessage("");
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
      setErrorMessage(copy.returnSubmitError);
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
      setIsLoadingProducts(true);
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
      setAreFiltersVisible(false);
      setProductSearch("");
      setSelectedCategory("");
      setCreatedOrder(null);
      setShareMessage("");
      setStep("edit");
      setMode("new");
    } catch {
      setErrorMessage(copy.loadError);
    } finally {
      setIsLoadingProducts(false);
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
              const canEditOrder = order.canEdit !== false && !isLocked;
              const canReturnOrder = order.canReturn !== false;
              const canDeleteOrder = order.canDelete !== false && !isLocked;

              return (
                <View
                  key={order.id}
                  style={[styles.orderCard, isLocked ? styles.orderCardLocked : null]}
                >
                  <Text style={styles.orderCardTitle}>{order.number}</Text>
                  <Text style={styles.orderCardMeta}>
                    {order.supplierName || "-"} · {order.deliveryDate || "-"}
                  </Text>
                  <Text style={styles.orderCardMeta}>
                    {copy.totalItems}: {order.totalItems ?? 0} ·{" "}
                    {copy.estimatedTotal}: {(order.totalAmount ?? 0).toFixed(2)} EUR
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
                        style={[
                          styles.orderCardActionText,
                          styles.orderCardActionTextPrimary,
                        ]}
                      >
                        {copy.editOrder}
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
              );
            })}
          </View>
          {activeReturnOrder ? (
            <View style={styles.returnPanel}>
              <SectionTitle label={`${copy.returnTitle}: ${activeReturnOrder.number}`} />
              {isLoadingReturnDraft ? (
                <StateRow label={copy.loadingReturnDraft} />
              ) : returnDraft?.items.some((item) => item.remainingQuantity > 0) ? (
                <>
                  <View style={styles.returnField}>
                    <Text style={styles.returnFieldLabel}>{copy.returnReason}</Text>
                    <TextInput
                      style={styles.returnInput}
                      value={returnReason}
                      onChangeText={(value) => {
                        setReturnReason(value);
                        setErrorMessage("");
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
          {shareMessage ? <Text style={styles.stateText}>{shareMessage}</Text> : null}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>
      ) : null}

      {mode === "new" && step === "edit" && !selectedSupplierId ? (
        <View style={styles.section}>
          <SectionTitle label={copy.supplier} />
          {isLoadingSuppliers ? (
            <StateRow label={copy.loadingSuppliers} />
          ) : (
            <View style={styles.optionGrid}>
              {suppliers.map((supplier) => {
                const isActive = selectedSupplierId === supplier.id;

                return (
                  <Pressable
                    key={supplier.id}
                    style={[styles.supplierRow, isActive ? styles.supplierRowActive : null]}
                    onPress={() => handleSelectSupplier(supplier.id)}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.supplierRowText,
                        isActive ? styles.supplierRowTextActive : null,
                      ]}
                    >
                      {supplier.name}
                    </Text>
                    <Ionicons
                      color={
                        isActive
                          ? authControlStyles.colors.red
                          : authControlStyles.colors.ink40
                      }
                      name="chevron-forward"
                      size={18}
                    />
                  </Pressable>
                );
              })}
            </View>
          )}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>
      ) : null}

      {mode === "new" && step === "edit" && selectedSupplierId ? (
        <View style={styles.section}>
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
          <SecondaryButton
            label={editingOrder ? copy.backToHistory : copy.backToSuppliers}
            onPress={handleBackToSuppliers}
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

          <Pressable
            style={styles.filterToggle}
            onPress={() => setAreFiltersVisible((current) => !current)}
          >
            <Ionicons
              color={authControlStyles.colors.red}
              name="options-outline"
              size={18}
            />
            <Text style={styles.filterToggleText}>
              {areFiltersVisible ? copy.hideFilters : copy.showFilters}
            </Text>
            <Ionicons
              color={authControlStyles.colors.red}
              name={areFiltersVisible ? "chevron-up-outline" : "chevron-down-outline"}
              size={16}
            />
          </Pressable>

          {areFiltersVisible ? (
            <>
              <SectionTitle label={copy.productFilter} />
              <TextInput
                autoCapitalize="none"
                placeholder={copy.filterPlaceholder}
                placeholderTextColor={authControlStyles.colors.ink40}
                style={styles.searchInput}
                value={productSearch}
                onChangeText={setProductSearch}
              />
              <View style={styles.optionGrid}>
                <Pressable
                  style={[
                    styles.optionButton,
                    selectedCategory === "" ? styles.optionButtonActive : null,
                  ]}
                  onPress={() => setSelectedCategory("")}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedCategory === "" ? styles.optionTextActive : null,
                    ]}
                  >
                    {copy.allCategories}
                  </Text>
                </Pressable>
                {productCategories.map((category) => (
                  <Pressable
                    key={category}
                    style={[
                      styles.optionButton,
                      selectedCategory === category ? styles.optionButtonActive : null,
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedCategory === category ? styles.optionTextActive : null,
                      ]}
                    >
                      {translateOrderCategory(category, language)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
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
            {filteredProducts.map((product) => (
              <ProductQuantityRow
                key={product.id}
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
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
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
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
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
