import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { scaleStyles } from "@/lib/responsive";
import type { ImageSourcePropType } from "react-native";
import type { RestaurantSummary } from "@zhao/types";
import {
  AuthTextField,
  CheckboxRow,
  TrackingText,
  authControlStyles,
} from "@/features/auth/AuthFormControls";
import type { AuthCopy, RoleOption } from "@/features/auth/authCopy";
import zhaoLogo from "@/features/auth/assets/zhao-logo.png";
import { MOBILE_API_URL } from "@/lib/env";

const ZHAO_GROUPE_ORIGIN = "https://www.zhaogroupe.com";
const BIRTHDAY_START_YEAR = 1950;

function resolveApiOrigin(): string {
  try {
    return new URL(MOBILE_API_URL).origin;
  } catch {
    return "";
  }
}

const API_ORIGIN = resolveApiOrigin();

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function padDatePart(value: number): string {
  return String(value).padStart(2, "0");
}

function getBirthdayParts(value: string): { day: number; month: number; year: number } {
  const [year, month, day] = value.split("-").map((part) => Number(part));

  if (!year || !month || !day) {
    return { day: 1, month: 1, year: 2000 };
  }

  return { day, month, year };
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function buildBirthdayValue(year: number, month: number, day: number): string {
  const safeDay = Math.min(day, getDaysInMonth(year, month));

  return `${year}-${padDatePart(month)}-${padDatePart(safeDay)}`;
}

function resolveRestaurantPhotoUrl(photoUrl: string | null): string | null {
  if (!photoUrl) {
    return null;
  }

  if (/^(https?:)?\/\//i.test(photoUrl) || photoUrl.startsWith("data:")) {
    return photoUrl;
  }

  if (!API_ORIGIN) {
    return photoUrl;
  }

  if (photoUrl.startsWith("/")) {
    return `${API_ORIGIN}${photoUrl}`;
  }

  return `${API_ORIGIN}/${photoUrl.replace(/^\/+/, "")}`;
}

function buildRestaurantImageSource(photoUrl: string | null): ImageSourcePropType {
  const resolvedPhotoUrl = resolveRestaurantPhotoUrl(photoUrl);

  if (!resolvedPhotoUrl) {
    return zhaoLogo;
  }

  if (resolvedPhotoUrl.startsWith(ZHAO_GROUPE_ORIGIN)) {
    return {
      uri: resolvedPhotoUrl,
      headers: {
        Referer: `${ZHAO_GROUPE_ORIGIN}/`,
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
      },
    };
  }

  return { uri: resolvedPhotoUrl };
}

function buildImagePickerDataUrl(asset: ImagePicker.ImagePickerAsset): string | null {
  if (!asset.base64) {
    return null;
  }

  const mimeType = asset.mimeType || "image/jpeg";
  return `data:${mimeType};base64,${asset.base64}`;
}

function resolveAvatarPickerErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("Camera not available")) {
    return "模拟器没有摄像头，请用相册选择头像。";
  }

  return "头像读取失败。";
}

export type RegisterFormState = {
  familyName: string;
  givenName: string;
  email: string;
  password: string;
  birthday: string;
  profilePhotoDataUrl: string;
  restaurantId: number | null;
  roles: string[];
  acceptedTerms: boolean;
};

type RegisterFormProps = {
  copy: AuthCopy;
  form: RegisterFormState;
  isLoadingRestaurants: boolean;
  restaurants: RestaurantSummary[];
  selectedRestaurantName?: string;
  onChange: <Key extends keyof RegisterFormState>(
    key: Key,
    value: RegisterFormState[Key],
  ) => void;
  onReloadRestaurants: () => void;
  onToggleRole: (role: string) => void;
};

export function RegisterForm({
  copy,
  form,
  isLoadingRestaurants,
  restaurants,
  selectedRestaurantName,
  onChange,
  onReloadRestaurants,
  onToggleRole,
}: RegisterFormProps) {
  return (
    <View>
      <AvatarPicker
        hint={copy.avatarHint}
        label={copy.labelAvatar}
        value={form.profilePhotoDataUrl}
        onChange={(value) => onChange("profilePhotoDataUrl", value)}
      />

      <View style={styles.nameRow}>
        <View style={styles.nameCol}>
          <AuthTextField
            autoComplete="name"
            label={copy.labelFamilyName}
            onChangeText={(value) => onChange("familyName", value)}
            placeholder={copy.phFamilyName}
            value={form.familyName}
            withTopBorder
          />
        </View>
        <View style={styles.nameCol}>
          <AuthTextField
            autoComplete="name"
            label={copy.labelGivenName}
            onChangeText={(value) => onChange("givenName", value)}
            placeholder={copy.phGivenName}
            value={form.givenName}
            withTopBorder
          />
        </View>
      </View>

      <AuthTextField
        autoComplete="email"
        keyboardType="email-address"
        label={copy.labelAccount}
        onChangeText={(value) => onChange("email", value)}
        placeholder={copy.phEmail}
        value={form.email}
      />
      <AuthTextField
        autoComplete="password"
        label={copy.labelPassword}
        mono
        onChangeText={(value) => onChange("password", value)}
        placeholder={copy.phPassword}
        secureTextEntry
        value={form.password}
      />
      <BirthdayPicker
        hint={copy.birthdayHint}
        label={copy.labelBirthday}
        placeholder={copy.phBirthday}
        value={form.birthday}
        onChange={(value) => onChange("birthday", value)}
      />
      <StorePicker
        copy={copy}
        isLoadingRestaurants={isLoadingRestaurants}
        restaurants={restaurants}
        selectedRestaurantId={form.restaurantId}
        selectedRestaurantName={selectedRestaurantName}
        onReloadRestaurants={onReloadRestaurants}
        onSelectRestaurant={(restaurantId) => onChange("restaurantId", restaurantId)}
      />

      <RolePicker
        label={copy.labelJobRole}
        roles={copy.roleOptions}
        selectedRoles={form.roles}
        onToggleRole={onToggleRole}
      />

      <View style={styles.termsRow}>
        <CheckboxRow
          checked={form.acceptedTerms}
          label={copy.termsText}
          onToggle={() => onChange("acceptedTerms", !form.acceptedTerms)}
        />
      </View>
    </View>
  );
}

type BirthdayPickerProps = {
  hint: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

function BirthdayPicker({ hint, label, placeholder, value, onChange }: BirthdayPickerProps) {
  const selectedParts = getBirthdayParts(value);
  const years = Array.from(
    { length: getCurrentYear() - BIRTHDAY_START_YEAR + 1 },
    (_, index) => getCurrentYear() - index,
  );
  const months = Array.from({ length: 12 }, (_, index) => index + 1);
  const days = Array.from(
    { length: getDaysInMonth(selectedParts.year, selectedParts.month) },
    (_, index) => index + 1,
  );

  function updateBirthday(nextPart: Partial<typeof selectedParts>): void {
    const nextYear = nextPart.year ?? selectedParts.year;
    const nextMonth = nextPart.month ?? selectedParts.month;
    const nextDay = nextPart.day ?? selectedParts.day;

    onChange(buildBirthdayValue(nextYear, nextMonth, nextDay));
  }

  return (
    <View style={styles.birthdaySection}>
      <TrackingText size={10.5}>{label}</TrackingText>
      <Text style={styles.birthdayValue}>{value || placeholder}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.dateOptionRow}>
          {years.map((year) => (
            <DateOption
              key={year}
              isSelected={selectedParts.year === year}
              label={String(year)}
              onPress={() => updateBirthday({ year })}
            />
          ))}
        </View>
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.dateOptionRow}>
          {months.map((month) => (
            <DateOption
              key={month}
              isSelected={selectedParts.month === month}
              label={padDatePart(month)}
              onPress={() => updateBirthday({ month })}
            />
          ))}
        </View>
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.dateOptionRow}>
          {days.map((day) => (
            <DateOption
              key={day}
              isSelected={selectedParts.day === day}
              label={padDatePart(day)}
              onPress={() => updateBirthday({ day })}
            />
          ))}
        </View>
      </ScrollView>
      <TrackingText color={authControlStyles.colors.ink60} size={10.5}>
        {hint}
      </TrackingText>
    </View>
  );
}

type DateOptionProps = {
  isSelected: boolean;
  label: string;
  onPress: () => void;
};

function DateOption({ isSelected, label, onPress }: DateOptionProps) {
  return (
    <Pressable
      style={[styles.dateOption, isSelected ? styles.dateOptionSelected : null]}
      onPress={onPress}
    >
      <Text style={[styles.dateOptionText, isSelected ? styles.dateOptionTextSelected : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

type AvatarPickerProps = {
  hint: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function AvatarPicker({ hint, label, value, onChange }: AvatarPickerProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const imageSource = value && !hasImageError ? buildRestaurantImageSource(value) : zhaoLogo;

  function updateAvatar(nextValue: string): void {
    setErrorMessage("");
    setHasImageError(false);
    onChange(nextValue);
  }

  async function pickAvatarFromLibrary(): Promise<void> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setErrorMessage("需要相册权限。");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
        mediaTypes: ["images"],
        quality: 0.75,
      });

      if (result.canceled) {
        return;
      }

      const dataUrl = buildImagePickerDataUrl(result.assets[0]);

      if (!dataUrl) {
        setErrorMessage("头像读取失败。");
        return;
      }

      updateAvatar(dataUrl);
    } catch (error) {
      setErrorMessage(resolveAvatarPickerErrorMessage(error));
    }
  }

  async function takeAvatarPhoto(): Promise<void> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      setErrorMessage("需要相机权限。");
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
        mediaTypes: ["images"],
        quality: 0.75,
      });

      if (result.canceled) {
        return;
      }

      const dataUrl = buildImagePickerDataUrl(result.assets[0]);

      if (!dataUrl) {
        setErrorMessage("头像读取失败。");
        return;
      }

      updateAvatar(dataUrl);
    } catch (error) {
      setErrorMessage(resolveAvatarPickerErrorMessage(error));
    }
  }

  return (
    <View style={styles.avatarSection}>
      <TrackingText size={10.5}>{label}</TrackingText>
      <View style={styles.avatarPreviewFrame}>
        <Image
          source={imageSource}
          style={styles.avatarPreviewImage}
          resizeMode="cover"
          onError={() => setHasImageError(true)}
        />
      </View>
      <View style={styles.avatarActions}>
        <Pressable style={styles.avatarAction} onPress={takeAvatarPhoto}>
          <TrackingText color={authControlStyles.colors.red} size={10.5}>
            拍照
          </TrackingText>
        </Pressable>
        <Pressable style={styles.avatarAction} onPress={pickAvatarFromLibrary}>
          <TrackingText color={authControlStyles.colors.red} size={10.5}>
            相册
          </TrackingText>
        </Pressable>
        {value ? (
          <Pressable style={styles.avatarAction} onPress={() => updateAvatar("")}>
            <TrackingText color={authControlStyles.colors.ink40} size={10.5}>
              移除
            </TrackingText>
          </Pressable>
        ) : null}
      </View>
      <View>
        <Text style={styles.avatarHint}>{hint}</Text>
        {errorMessage ? <Text style={styles.avatarError}>{errorMessage}</Text> : null}
      </View>
    </View>
  );
}

type StorePickerProps = {
  copy: AuthCopy;
  isLoadingRestaurants: boolean;
  restaurants: RestaurantSummary[];
  selectedRestaurantId: number | null;
  selectedRestaurantName?: string;
  onReloadRestaurants: () => void;
  onSelectRestaurant: (restaurantId: number) => void;
};

function StorePicker({
  copy,
  isLoadingRestaurants,
  restaurants,
  selectedRestaurantId,
  selectedRestaurantName,
  onReloadRestaurants,
  onSelectRestaurant,
}: StorePickerProps) {
  const [failedRestaurantImageIds, setFailedRestaurantImageIds] = useState<Set<number>>(
    () => new Set(),
  );

  function markRestaurantImageFailed(restaurantId: number): void {
    setFailedRestaurantImageIds((current) => {
      if (current.has(restaurantId)) {
        return current;
      }

      const next = new Set(current);
      next.add(restaurantId);
      return next;
    });
  }

  return (
    <View style={styles.pickerSection}>
      <View style={styles.pickerHeader}>
        <TrackingText size={10.5}>{copy.labelStore}</TrackingText>
        <Pressable onPress={onReloadRestaurants}>
          <TrackingText color={authControlStyles.colors.red} size={10.5}>
            {isLoadingRestaurants ? copy.storeRefreshing : copy.storeRefresh}
          </TrackingText>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.storeRow}>
          {restaurants.map((restaurant, index) => {
            const isSelected = selectedRestaurantId === restaurant.id;
            const imageSource = failedRestaurantImageIds.has(restaurant.id)
              ? zhaoLogo
              : buildRestaurantImageSource(restaurant.photoUrl);

            return (
              <Pressable
                key={restaurant.id}
                style={[
                  styles.storeCard,
                  index > 0 ? styles.storeCardSpacing : null,
                  isSelected ? styles.storeCardSelected : null,
                ]}
                onPress={() => onSelectRestaurant(restaurant.id)}
              >
                <View style={styles.storeImageFrame}>
                  <Image
                    source={imageSource}
                    style={styles.storeImage}
                    resizeMode="cover"
                    onError={() => markRestaurantImageFailed(restaurant.id)}
                  />
                </View>
                <Text numberOfLines={1} style={styles.storeName}>
                  {restaurant.name}
                </Text>
                <Text numberOfLines={2} style={styles.storeAddress}>
                  {restaurant.address}
                </Text>
                <TrackingText
                  color={isSelected ? authControlStyles.colors.red : authControlStyles.colors.ink40}
                  size={10.5}
                >
                  {isSelected ? copy.storeSelectedLabel : copy.storePickLabel}
                </TrackingText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {selectedRestaurantName ? (
        <Text style={styles.selectedStore}>
          {copy.storeSelectedPrefix}
          {selectedRestaurantName}
        </Text>
      ) : null}
    </View>
  );
}

type RolePickerProps = {
  label: string;
  roles: RoleOption[];
  selectedRoles: string[];
  onToggleRole: (role: string) => void;
};

function RolePicker({ label, roles, selectedRoles, onToggleRole }: RolePickerProps) {
  return (
    <View style={styles.pickerSection}>
      <TrackingText size={10.5}>{label}</TrackingText>
      <View style={styles.roleGrid}>
        {roles.map((role) => {
          const isSelected = selectedRoles.includes(role.value);

          return (
            <Pressable
              key={role.value}
              style={[styles.roleOption, isSelected ? styles.roleOptionSelected : null]}
              onPress={() => onToggleRole(role.value)}
            >
              <Text style={styles.roleLabel}>{role.label}</Text>
              <Text style={styles.roleDescription}>{role.description}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create(scaleStyles({
  avatarAction: {
    borderColor: authControlStyles.colors.ink10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  avatarActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 12,
  },
  avatarError: {
    color: authControlStyles.colors.red,
    fontFamily: "serif",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
    textAlign: "center",
  },
  avatarHint: {
    color: authControlStyles.colors.ink40,
    fontFamily: "serif",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 10,
    textAlign: "center",
  },
  avatarPreviewFrame: {
    backgroundColor: authControlStyles.colors.ink10,
    borderColor: authControlStyles.colors.ink10,
    borderWidth: 1,
    height: 112,
    marginTop: 12,
    overflow: "hidden",
    width: 112,
  },
  avatarPreviewImage: {
    height: "100%",
    width: "100%",
  },
  avatarSection: {
    alignItems: "center",
    borderBottomColor: authControlStyles.colors.ink,
    borderBottomWidth: 1,
    paddingBottom: 16,
    paddingTop: 0,
  },
  birthdaySection: {
    borderBottomColor: authControlStyles.colors.ink,
    borderBottomWidth: 1,
    paddingBottom: 16,
    paddingTop: 22,
  },
  birthdayValue: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 22,
    lineHeight: 30,
    marginBottom: 12,
    marginTop: 4,
  },
  dateOption: {
    borderColor: authControlStyles.colors.ink10,
    borderWidth: 1,
    minWidth: 54,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateOptionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  dateOptionSelected: {
    backgroundColor: authControlStyles.colors.red,
    borderColor: authControlStyles.colors.red,
  },
  dateOptionText: {
    color: authControlStyles.colors.ink60,
    fontFamily: "monospace",
    fontSize: 12,
    textAlign: "center",
  },
  dateOptionTextSelected: {
    color: authControlStyles.colors.paper,
  },
  nameCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    gap: 16,
  },
  pickerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  pickerSection: {
    marginTop: 26,
  },
  roleDescription: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 7,
  },
  roleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  roleLabel: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 17,
    lineHeight: 21,
  },
  roleOption: {
    backgroundColor: authControlStyles.colors.paper,
    borderColor: authControlStyles.colors.ink10,
    borderWidth: 1,
    minHeight: 86,
    paddingHorizontal: 14,
    paddingVertical: 14,
    width: "47%",
  },
  roleOptionSelected: {
    backgroundColor: "rgba(193, 22, 22, 0.06)",
    borderColor: authControlStyles.colors.red,
  },
  selectedStore: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 14,
    marginTop: 12,
  },
  storeAddress: {
    color: authControlStyles.colors.ink60,
    fontFamily: "serif",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
    marginTop: 8,
  },
  storeCard: {
    backgroundColor: authControlStyles.colors.paper,
    borderColor: authControlStyles.colors.ink10,
    borderWidth: 1,
    minHeight: 218,
    padding: 12,
    width: 196,
  },
  storeCardSelected: {
    backgroundColor: "rgba(193, 22, 22, 0.06)",
    borderColor: authControlStyles.colors.red,
  },
  storeCardSpacing: {
    marginLeft: 12,
  },
  storeImage: {
    height: "100%",
    width: "100%",
  },
  storeImageFrame: {
    backgroundColor: authControlStyles.colors.ink10,
    height: 104,
    marginBottom: 12,
    overflow: "hidden",
    width: "100%",
  },
  storeName: {
    color: authControlStyles.colors.ink,
    fontFamily: "serif",
    fontSize: 17,
    fontWeight: "500",
  },
  storeRow: {
    flexDirection: "row",
  },
  termsRow: {
    marginTop: 24,
  },
}));
