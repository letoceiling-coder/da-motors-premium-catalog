import { useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Megaphone, Users } from "lucide-react";
import { useCarsStore } from "@/stores/carsStore";

const cards = [
  {
    title: "Бот",
    text: "Настройка токена, webhook, приветствия и кнопки MiniApp.",
    to: "/admin/bot",
    icon: Bot,
  },
  {
    title: "Рассылка",
    text: "Отправка текста/фото/видео пользователям с валидацией Telegram Bot API.",
    to: "/admin/broadcast",
    icon: Megaphone,
  },
  {
    title: "Пользователи",
    text: "Создание пользователей для доступа к админ-панели.",
    to: "/admin/users",
    icon: Users,
  },
];

export function AdminDashboardPage() {
  const loadCars = useCarsStore((s) => s.loadCars);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<null | {
    updatedAt?: string;
    summary?: { total?: number; added?: number; updated?: number; removed?: number };
    details?: { added?: string[]; removed?: string[]; updated?: Array<{ brand?: string; model?: string; oldPrice?: number; newPrice?: number }> };
  }>(null);
  const [error, setError] = useState("");

  const runCatalogRefresh = async () => {
    setRunning(true);
    setError("");
    try {
      const response = await fetch("/api/catalog-refresh.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        setError(payload?.error || "Не удалось обновить каталог");
        return;
      }
      setReport(payload);
      await loadCars();
    } catch {
      setError("Ошибка сети при запуске парсера");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-gray-900">Добро пожаловать в admin</h2>
        <p className="mt-2 text-sm text-gray-600">
          Раздел создан как отдельная панель на `/admin` с авторизацией и шаблонными страницами без backend-логики.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Принудительное обновление каталога</h3>
            <p className="mt-1 text-sm text-gray-600">
              Запускает парсер автомобилей и показывает отчет: что добавлено, обновлено и удалено.
            </p>
          </div>
          <button
            onClick={runCatalogRefresh}
            disabled={running}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? "Обновление..." : "Обновить каталог"}
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        {report ? (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-900">
              Обновлено: {report.updatedAt ? new Date(report.updatedAt).toLocaleString("ru-RU") : "—"}
            </p>
            <div className="mt-2 grid gap-2 text-sm text-gray-700 sm:grid-cols-4">
              <div>Всего: {report.summary?.total ?? 0}</div>
              <div>Добавлено: {report.summary?.added ?? 0}</div>
              <div>Обновлено: {report.summary?.updated ?? 0}</div>
              <div>Удалено: {report.summary?.removed ?? 0}</div>
            </div>
            {report.details?.updated && report.details.updated.length > 0 ? (
              <div className="mt-3 text-xs text-gray-600">
                Обновления цены:{" "}
                {report.details.updated
                  .slice(0, 5)
                  .map((u) => `${u.brand} ${u.model} (${u.oldPrice} -> ${u.newPrice})`)
                  .join("; ")}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.to}
              to={card.to}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-3 inline-flex rounded-lg bg-gray-900 p-2 text-white">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-gray-900">{card.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{card.text}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

