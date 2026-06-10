declare module "react-native-pdf" {
  import type { ComponentType } from "react";
  import type { StyleProp, ViewStyle } from "react-native";

  type PdfSource = {
    uri: string;
  };

  type PdfProps = {
    onError?: (error: Error) => void;
    onLoadComplete?: (numberOfPages: number, filePath?: string) => void;
    source: PdfSource;
    style?: StyleProp<ViewStyle>;
  };

  const Pdf: ComponentType<PdfProps>;

  export default Pdf;
}
