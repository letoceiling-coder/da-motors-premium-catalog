import { useEffect, useMemo, useState } from "react";
import { useAdminAuth } from "@/admin/auth";

interface BotUser {
  chat_id: string;
  user_id?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
  last_seen_at?: string;
}

export function AdminUsersPage() {
  const { users, createUser } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [formError, setFormError] = useState("");
  const [submitInfo, setSubmitInfo] = useState("");
  const [botUsers, setBotUsers] = useState<BotUser[]>([]);
  const [botUsersError, setBotUsersError] = useState("");
  const [loadingBotUsers, setLoadingBotUsers] = useState(false);

  const validationError = useMemo(() => {
    if (!email.trim()) return "Email обязателен";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Некорректный email";
    if (password.length < 8) return "Пароль минимум 8 символов";
    if (!fullName.trim()) return "ФИО обязательно";
    return "";
  }, [email, fullName, password]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitInfo("");

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const result = createUser({
      email,
      password,
      fullName,
    });
    if (!result.ok) {
      setFormError(result.error || "Не удалось создать пользователя");
      return;
    }

    setEmail("");
    setPassword("");
    setFullName("");
    setSubmitInfo("Пользователь успешно создан");
  };

  const loadBotUsers = async () => {
    setLoadingBotUsers(true);
    setBotUsersError("");
    try {
      const response = await fetch("/api/bot-users.php", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        setBotUsersError(payload?.error || "Не удалось загрузить пользователей бота");
        return;
      }
      setBotUsers(payload.users || []);
    } catch {
      setBotUsersError("Ошибка сети при загрузке пользователей бота");
    } finally {
      setLoadingBotUsers(false);
    }
  };

  const setBotAdmin = async (chatId: string, isAdmin: boolean) => {
    try {
      const response = await fetch("/api/bot-users.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, is_admin: isAdmin }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        setBotUsersError(payload?.error || "Не удалось обновить роль пользователя");
        return;
      }
      setBotUsers(payload.users || []);
    } catch {
      setBotUsersError("Ошибка сети при изменении роли");
    }
  };

  useEffect(() => {
    void loadBotUsers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-gray-900">Пользователи</h2>
        <p className="mt-1 text-sm text-gray-600">
          Управление доступом в админ-панель. Предсозданный пользователь: dsc-23@yandex.ru.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-base font-semibold text-gray-900">Создать пользователя</h3>
        <form onSubmit={onSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">ФИО</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
            />
          </div>

          {formError ? <p className="md:col-span-2 text-sm text-red-600">{formError}</p> : null}
          {submitInfo ? <p className="md:col-span-2 text-sm text-green-700">{submitInfo}</p> : null}

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Создать
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 text-sm font-medium text-gray-700">
          Список пользователей ({users.length})
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wide text-gray-500">ФИО</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wide text-gray-500">Email</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wide text-gray-500">Пароль</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{user.fullName}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{user.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{user.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-3">
          <div className="text-sm font-medium text-gray-700">Пользователи Telegram-бота ({botUsers.length})</div>
          <button
            onClick={loadBotUsers}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-100"
          >
            Обновить
          </button>
        </div>
        {loadingBotUsers ? <div className="px-6 py-4 text-sm text-gray-600">Загрузка...</div> : null}
        {botUsersError ? <div className="px-6 py-3 text-sm text-red-600">{botUsersError}</div> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wide text-gray-500">Пользователь</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wide text-gray-500">Chat ID</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wide text-gray-500">Последняя активность</th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wide text-gray-500">Администратор бота</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {botUsers.map((user) => {
                const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ");
                return (
                  <tr key={user.chat_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {displayName || user.username || "Без имени"}{" "}
                      {user.username ? <span className="text-gray-500">@{user.username}</span> : null}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{user.chat_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {user.last_seen_at ? new Date(user.last_seen_at).toLocaleString("ru-RU") : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(user.is_admin)}
                          onChange={(e) => void setBotAdmin(user.chat_id, e.target.checked)}
                        />
                        Админ
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

