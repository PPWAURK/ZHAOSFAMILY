import { mobileApiClient } from "@/lib/api";

export type DashboardNewsPost = {
  id: string;
  title: string;
  summary: string;
  category: string;
  visibility: string;
  authorName: string;
  restaurantName: string;
  createdAt: string;
};

type DashboardNewsPostApiRecord = {
  id?: string | number;
  title?: string | null;
  summary?: string | null;
  category?: string | null;
  visibility?: string | null;
  restaurantName?: string | null;
  createdAt?: string | null;
  author?: {
    name?: string | null;
    email?: string | null;
  } | null;
};

function normalizeNewsPost(raw: DashboardNewsPostApiRecord): DashboardNewsPost {
  return {
    id: String(raw.id ?? ""),
    title: raw.title ?? "",
    summary: raw.summary ?? "",
    category: raw.category ?? "operations",
    visibility: raw.visibility ?? "team",
    authorName: raw.author?.name ?? raw.author?.email ?? "",
    restaurantName: raw.restaurantName ?? "",
    createdAt: raw.createdAt ?? "",
  };
}

export async function fetchDashboardNewsPosts(): Promise<DashboardNewsPost[]> {
  const posts = await mobileApiClient.get<DashboardNewsPostApiRecord[]>(
    "/dashboard-news",
  );

  return Array.isArray(posts)
    ? posts.map(normalizeNewsPost).filter((post) => post.id && post.title)
    : [];
}
