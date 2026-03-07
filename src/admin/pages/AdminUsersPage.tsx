import { useMemo, useState } from "react";
import { useAdminAuth } from "@/admin/auth";

export function AdminUsersPage() {
  const { users, createUser } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [formError, setFormError] = useState("");
  const [submitInfo, setSubmitInfo] = useState("");

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
    </div>
  );
}

