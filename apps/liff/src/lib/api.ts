const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tp_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

// ============================================================
// AUTH
// ============================================================

export async function lineAuth(accessToken: string) {
  const data = await request<{
    token: string;
    member: Member;
  }>("/api/line/auth", {
    method: "POST",
    body: JSON.stringify({ accessToken }),
  });
  if (data.token) {
    localStorage.setItem("tp_token", data.token);
  }
  return data;
}

// ============================================================
// MEMBER
// ============================================================

export async function getMe(): Promise<{ member: Member }> {
  return request("/api/members/me");
}

export async function updateProfile(data: Partial<Member>) {
  return request<{ member: Member }>("/api/members/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ============================================================
// CAMPAIGNS
// ============================================================

export async function getCampaigns() {
  return request<{ campaigns: Campaign[] }>("/api/campaigns?public=true");
}

// ============================================================
// ORDERS
// ============================================================

export async function submitOrder(data: {
  campaignId?: string;
  channel: string;
  orderNumber: string;
  purchaseAmount: number;
  purchaseDate?: string;
}) {
  return request<{
    submission: OrderSubmission;
    pointsEarned: number;
    lotteryTickets: number;
    newBalance: number;
  }>("/api/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function uploadReceipt(formData: FormData) {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/orders/receipt`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Upload failed");
  }
  return res.json();
}

export async function getOrders(page = 1) {
  return request<{
    orders: OrderSubmission[];
    pagination: Pagination;
  }>(`/api/orders?page=${page}`);
}

// ============================================================
// POINTS
// ============================================================

export async function getPointHistory(page = 1) {
  return request<{
    history: PointEntry[];
    pagination: Pagination;
  }>(`/api/points?page=${page}`);
}

// ============================================================
// REWARDS
// ============================================================

export async function getRewards() {
  return request<{ rewards: Reward[] }>("/api/rewards?public=true");
}

export async function redeemReward(rewardId: string) {
  return request<{
    redemption: Redemption;
    pointsUsed: number;
  }>("/api/redemptions", {
    method: "POST",
    body: JSON.stringify({ rewardId }),
  });
}

export async function getRedemptions() {
  return request<{ redemptions: Redemption[] }>("/api/redemptions");
}

// ============================================================
// TYPES
// ============================================================

export interface Member {
  id: string;
  lineDisplayName: string | null;
  linePictureUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  currentPoints: number;
  lifetimePoints: number;
  tier: Tier;
  nextTier?: Tier | null;
  pointsToNextTier?: number | null;
  registeredAt: string;
  stats?: { orderSubmissions: number; redemptions: number };
}

export interface Tier {
  id: string;
  name: string;
  nameTh: string;
  color: string;
  pointMultiplier: number;
  minLifetimePoints: number;
  benefits: string[];
}

export interface Campaign {
  id: string;
  nameTh: string;
  description: string | null;
  imageUrl: string | null;
  type: string;
  startDate: string;
  endDate: string;
  pointsPerBaht: number;
  pointMultiplier: number;
  channels: string[];
  hasLottery: boolean;
}

export interface OrderSubmission {
  id: string;
  channel: string;
  orderNumber: string | null;
  purchaseAmount: number | null;
  status: string;
  pointsEarned: number | null;
  submittedAt: string;
  campaign?: { nameTh: string } | null;
}

export interface PointEntry {
  id: string;
  type: string;
  points: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

export interface Reward {
  id: string;
  nameTh: string;
  description: string | null;
  imageUrl: string | null;
  type: string;
  pointsCost: number;
  stock: number | null;
  stockUsed: number;
  expiryDays: number | null;
  couponValue: number | null;
  couponType: string | null;
}

export interface Redemption {
  id: string;
  rewardName: string;
  couponCode: string | null;
  expiresAt: string | null;
  redeemedAt: string;
  reward?: {
    nameTh: string;
    type: string;
    imageUrl: string | null;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}
