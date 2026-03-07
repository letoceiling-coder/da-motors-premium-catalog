import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface AdminUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
}

interface AdminAuthContextValue {
  users: AdminUser[];
  currentUser: AdminUser | null;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  createUser: (payload: Omit<AdminUser, "id">) => { ok: boolean; error?: string };
}

const USERS_STORAGE_KEY = "da-motors-admin-users";
const SESSION_STORAGE_KEY = "da-motors-admin-session";

const seededUser: AdminUser = {
  id: "admin-seed-1",
  email: "dsc-23@yandex.ru",
  password: "123123123",
  fullName: "Джон Уик",
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

function loadInitialUsers(): AdminUser[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([seededUser]));
      return [seededUser];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [seededUser];

    const users = parsed.filter(
      (item) =>
        typeof item?.id === "string" &&
        typeof item?.email === "string" &&
        typeof item?.password === "string" &&
        typeof item?.fullName === "string"
    ) as AdminUser[];

    const hasSeed = users.some((u) => u.email.toLowerCase() === seededUser.email.toLowerCase());
    if (!hasSeed) {
      const merged = [seededUser, ...users];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }

    return users;
  } catch {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([seededUser]));
    return [seededUser];
  }
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    const loadedUsers = loadInitialUsers();
    setUsers(loadedUsers);

    try {
      const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!rawSession) return;
      const session = JSON.parse(rawSession) as { email?: string };
      if (!session.email) return;
      const matched = loadedUsers.find((u) => u.email.toLowerCase() === session.email.toLowerCase()) ?? null;
      setCurrentUser(matched);
    } catch {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      users,
      currentUser,
      login: (email, password) => {
        const normalized = email.trim().toLowerCase();
        const matched = users.find((u) => u.email.toLowerCase() === normalized);
        if (!matched || matched.password !== password) {
          return { ok: false, error: "Неверный email или пароль" };
        }

        setCurrentUser(matched);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ email: matched.email }));
        return { ok: true };
      },
      logout: () => {
        setCurrentUser(null);
        localStorage.removeItem(SESSION_STORAGE_KEY);
      },
      createUser: (payload) => {
        const normalizedEmail = payload.email.trim().toLowerCase();
        if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
          return { ok: false, error: "Пользователь с таким email уже существует" };
        }

        const next: AdminUser = {
          id: `admin-${Date.now()}`,
          email: normalizedEmail,
          password: payload.password,
          fullName: payload.fullName.trim(),
        };
        const merged = [next, ...users];
        setUsers(merged);
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged));
        return { ok: true };
      },
    }),
    [currentUser, users]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  }
  return ctx;
}

