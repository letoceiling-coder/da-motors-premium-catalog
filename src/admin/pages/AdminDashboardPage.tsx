import { Link } from "react-router-dom";
import { Bot, Megaphone, Users } from "lucide-react";

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
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-gray-900">Добро пожаловать в admin</h2>
        <p className="mt-2 text-sm text-gray-600">
          Раздел создан как отдельная панель на `/admin` с авторизацией и шаблонными страницами без backend-логики.
        </p>
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

