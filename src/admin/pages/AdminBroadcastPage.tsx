import { useMemo, useState } from "react";

type MessageType = "text" | "photo" | "video";

const MOCK_RECIPIENTS = [
  { id: "u-1", name: "John Wick", username: "@johnwick" },
  { id: "u-2", name: "Alex Mercer", username: "@alexm" },
  { id: "u-3", name: "Roman Ivanov", username: "@roman" },
];

function isUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function AdminBroadcastPage() {
  const [type, setType] = useState<MessageType>("text");
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [parseMode, setParseMode] = useState<"HTML" | "MarkdownV2" | "None">("HTML");
  const [disableNotification, setDisableNotification] = useState(false);
  const [protectContent, setProtectContent] = useState(false);
  const [disableWebPagePreview, setDisableWebPagePreview] = useState(false);
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [submitInfo, setSubmitInfo] = useState("");

  const errors = useMemo(() => {
    const next: Record<string, string> = {};

    if (type === "text") {
      const len = text.trim().length;
      if (len < 1 || len > 4096) {
        next.text = "Текст сообщения должен быть от 1 до 4096 символов (Telegram Bot API)";
      }
    } else {
      if (!mediaUrl.trim()) {
        next.media = "Для фото/видео укажите URL файла";
      } else if (!isUrl(mediaUrl.trim())) {
        next.media = "Некорректный URL медиа";
      }
      if (text.length > 1024) {
        next.caption = "Подпись к медиа: максимум 1024 символа";
      }
    }

    if (!sendToAll && selectedUsers.length === 0) {
      next.recipients = "Выберите хотя бы одного получателя";
    }

    return next;
  }, [mediaUrl, selectedUsers.length, sendToAll, text, type]);

  const hasErrors = Object.keys(errors).length > 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasErrors) return;
    setSubmitInfo(
      `Шаблон: рассылка валидна и готова к отправке через Telegram Bot API (parse_mode=${parseMode}, disable_notification=${disableNotification}, protect_content=${protectContent}, disable_web_page_preview=${disableWebPagePreview}).`
    );
  };

  const toggleUser = (id: string) => {
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setSubmitInfo("");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-gray-900">Рассылка</h2>
        <p className="mt-1 text-sm text-gray-600">
          Отправка пользователям текста, фото или видео с валидацией полей по Telegram Bot API.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900">Содержимое</h3>
          <div className="mt-4 grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Тип сообщения</label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as MessageType);
                  setSubmitInfo("");
                }}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
              >
                <option value="text">Текст</option>
                <option value="photo">Фото</option>
                <option value="video">Видео</option>
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Parse mode</label>
                <select
                  value={parseMode}
                  onChange={(e) => {
                    setParseMode(e.target.value as "HTML" | "MarkdownV2" | "None");
                    setSubmitInfo("");
                  }}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
                >
                  <option value="HTML">HTML</option>
                  <option value="MarkdownV2">MarkdownV2</option>
                  <option value="None">Без форматирования</option>
                </select>
              </div>
              <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={disableNotification}
                    onChange={(e) => {
                      setDisableNotification(e.target.checked);
                      setSubmitInfo("");
                    }}
                  />
                  disable_notification
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={protectContent}
                    onChange={(e) => {
                      setProtectContent(e.target.checked);
                      setSubmitInfo("");
                    }}
                  />
                  protect_content
                </label>
                {type === "text" ? (
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={disableWebPagePreview}
                      onChange={(e) => {
                        setDisableWebPagePreview(e.target.checked);
                        setSubmitInfo("");
                      }}
                    />
                    disable_web_page_preview
                  </label>
                ) : null}
              </div>
            </div>

            {(type === "photo" || type === "video") && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">URL медиа</label>
                <input
                  value={mediaUrl}
                  onChange={(e) => {
                    setMediaUrl(e.target.value);
                    setSubmitInfo("");
                  }}
                  placeholder="https://example.com/file.jpg"
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
                />
                {errors.media ? <p className="mt-1 text-xs text-red-600">{errors.media}</p> : null}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {type === "text" ? "Текст сообщения" : "Подпись к медиа"}
              </label>
              <textarea
                rows={4}
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setSubmitInfo("");
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
                placeholder={type === "text" ? "Введите текст..." : "Подпись (необязательно)"}
              />
              <p className="mt-1 text-xs text-gray-500">
                {type === "text" ? `${text.length}/4096` : `${text.length}/1024`}
              </p>
              {errors.text ? <p className="mt-1 text-xs text-red-600">{errors.text}</p> : null}
              {errors.caption ? <p className="mt-1 text-xs text-red-600">{errors.caption}</p> : null}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900">Получатели</h3>
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                checked={sendToAll}
                onChange={() => {
                  setSendToAll(true);
                  setSubmitInfo("");
                }}
              />
              Всем пользователям ({MOCK_RECIPIENTS.length})
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                checked={!sendToAll}
                onChange={() => {
                  setSendToAll(false);
                  setSubmitInfo("");
                }}
              />
              Выбранным пользователям
            </label>

            {!sendToAll && (
              <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3">
                {MOCK_RECIPIENTS.map((user) => (
                  <label key={user.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50">
                    <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => toggleUser(user.id)} />
                    <span className="text-sm text-gray-800">
                      {user.name} <span className="text-gray-500">{user.username}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            {errors.recipients ? <p className="text-xs text-red-600">{errors.recipients}</p> : null}
          </div>
        </section>

        <button
          type="submit"
          disabled={hasErrors}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Отправить рассылку
        </button>

        {submitInfo ? <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{submitInfo}</div> : null}
      </form>
    </div>
  );
}

