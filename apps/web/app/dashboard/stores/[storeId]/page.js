import StoreApprovalPage from "@/features/stores/pages/StoreApprovalPage";

export function generateStaticParams() {
  return Array.from({ length: 500 }, (_, index) => ({
    storeId: String(index + 1),
  }));
}

export default function Page() {
  return <StoreApprovalPage />;
}
