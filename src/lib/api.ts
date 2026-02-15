const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const TOKEN_KEY = "scp_session_token";
const USER_KEY = "scp_session_user";
const TYPE_KEY = "scp_session_type";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): any | null {
  const u = localStorage.getItem(USER_KEY);
  return u ? JSON.parse(u) : null;
}

export function getUserType(): string | null {
  return localStorage.getItem(TYPE_KEY);
}

export function setSession(token: string, user: any, userType: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(TYPE_KEY, userType);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TYPE_KEY);
}

async function callFunction(fnName: string, body: any) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Error del servidor");
  }
  return data;
}

export async function memberLogin(memberNumber: string, idCard: string) {
  const data = await callFunction("auth", {
    action: "member-login",
    member_number: memberNumber,
    id_card: idCard,
  });
  setSession(data.token, data.user, "member");
  return data;
}

export async function adminLogin(username: string, password: string) {
  const data = await callFunction("auth", {
    action: "admin-login",
    username,
    password,
  });
  setSession(data.token, data.user, "admin");
  return data;
}

export async function validateSession() {
  const token = getToken();
  if (!token) return null;
  try {
    const data = await callFunction("auth", { action: "validate-session", token });
    setSession(token, data.user, data.user_type);
    return data;
  } catch {
    clearSession();
    return null;
  }
}

export async function logout() {
  const token = getToken();
  try {
    await callFunction("auth", { action: "logout", token });
  } catch {}
  clearSession();
}

export async function submitVote(presidentId: string, memberIds: string[], ethicsAccepted: boolean) {
  return callFunction("vote", {
    token: getToken(),
    president_id: presidentId,
    member_ids: memberIds,
    ethics_accepted: ethicsAccepted,
  });
}

export async function adminAction(action: string, params: any = {}) {
  return callFunction("admin", {
    action,
    token: getToken(),
    ...params,
  });
}
