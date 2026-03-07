import { useEffect, useMemo, useState } from "react";

type MessageType = "text" | "photo" | "video";
type MediaSource = "file" | "url";

interface BotUser {
  chat_id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
  last_seen_at?: string;
}

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
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState("");
  const [mediaSource, setMediaSource] = useState<MediaSource>("file");
  const [parseMode, setParseMode] = useState<"HTML" | "MarkdownV2" | "None">("HTML");
  const [disableNotification, setDisableNotification] = useState(false);
  const [protectContent, setProtectContent] = useState(false);
  const [disableWebPagePreview, setDisableWebPagePreview] = useState(false);
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [submitInfo, setSubmitInfo] = useState("");
  const [users, setUsers] = useState<BotUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState("");

  const errors = useMemo(() => {
    const next: Record<string, string> = {};

    if (type === "text") {
      const len = text.trim().length;
      if (len < 1 || len > 4096) {
        next.text = "Текст сообщения должен быть от 1 до 4096 символов (Telegram Bot API)";
      }
    } else {
      if (mediaSource === "file") {
        if (!mediaFile) {
          next.media = "Добавьте файл для фото/видео";
        }
      } else {
        if (!mediaUrl.trim()) {
          next.media = "Укажите URL для фото/видео";
        } else if (!isUrl(mediaUrl.trim())) {
          next.media = "Некорректный URL медиа";
        }
      }

      if (mediaSource === "file" && mediaFile) {
        const isPhoto = type === "photo";
        const expectedMime = isPhoto ? "image/" : "video/";
        if (!mediaFile.type.startsWith(expectedMime)) {
          next.media = isPhoto ? "Для фото нужен image-файл" : "Для видео нужен video-файл";
        }

        const maxBytes = isPhoto ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
        if (mediaFile.size > maxBytes) {
          next.media = isPhoto ? "Размер фото превышает 10MB" : "Размер видео превышает 50MB";
        }
      }
      if (text.length > 1024) {
        next.caption = "Подпись к медиа: максимум 1024 символа";
      }
    }

    if (!sendToAll && selectedUsers.length === 0) {
      next.recipients = "Выберите хотя бы одного получателя";
    }

    return next;
  }, [mediaFile, mediaSource, mediaUrl, selectedUsers.length, sendToAll, text, type]);

  const hasErrors = Object.keys(errors).length > 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasErrors) return;
    setSubmitInfo(
      `Шаблон: рассылка валидна и готова к отправке через Telegram Bot API (source=${mediaSource}, parse_mode=${parseMode}, disable_notification=${disableNotification}, protect_content=${protectContent}, disable_web_page_preview=${disableWebPagePreview}, recipients=${sendToAll ? "all" : selectedUsers.length}).`
    );
  };

  const toggleUser = (id: string) => {
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setSubmitInfo("");
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    setUsersError("");
    try {
      const response = await fetch("/api/bot-users.php", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        setUsersError(payload?.error || "Не удалось загрузить пользователей бота");
        setUsers([]);
        return;
      }
      setUsers(Array.isArray(payload.users) ? payload.users : []);
    } catch {
      setUsersError("Ошибка сети при загрузке пользователей бота");
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!mediaFile) {
      setMediaPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(mediaFile);
    setMediaPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [mediaFile]);

  useEffect(() => {
    setMediaFile(null);
    setMediaPreviewUrl("");
    setMediaUrl("");
    setMediaSource("file");
  }, [type]);

  useEffect(() => {
    void loadUsers();
  }, []);

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
              <div className="space-y-3">
                <label className="mb-1 block text-sm font-medium text-gray-700">Источник медиа</label>
                <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      checked={mediaSource === "file"}
                      onChange={() => {
                        setMediaSource("file");
                        setSubmitInfo("");
                      }}
                    />
                    Файл
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      checked={mediaSource === "url"}
                      onChange={() => {
                        setMediaSource("url");
                        setSubmitInfo("");
                      }}
                    />
                    URL
                  </label>
                </div>

                {mediaSource === "file" ? (
                  <>
                    <input
                      type="file"
                      accept={type === "photo" ? "image/*" : "video/*"}
                      onChange={(e) => {
                        const selected = e.target.files?.[0] || null;
                        setMediaFile(selected);
                        setSubmitInfo("");
                      }}
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {mediaFile ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                        <p>
                          Файл: <span className="font-medium">{mediaFile.name}</span>
                        </p>
                        <p>Размер: {(mediaFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        {type === "photo" && mediaPreviewUrl ? (
                          <img
                            src={mediaPreviewUrl}
                            alt="preview"
                            className="mt-2 max-h-40 rounded-md border border-gray-200 object-contain"
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setMediaFile(null)}
                          className="mt-2 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100"
                        >
                          Удалить файл
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <input
                    value={mediaUrl}
                    onChange={(e) => {
                      setMediaUrl(e.target.value);
                      setSubmitInfo("");
                    }}
                    placeholder="https://example.com/file.jpg"
                    className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
                  />
                )}

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
              Всем пользователям ({users.length})
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
                {users.map((user) => {
                  const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || user.chat_id;
                  return (
                  <label key={user.chat_id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.chat_id)}
                      onChange={() => toggleUser(user.chat_id)}
                    />
                    <span className="text-sm text-gray-800">
                      {name}{" "}
                      {user.username ? <span className="text-gray-500">@{user.username}</span> : null}
                    </span>
                  </label>
                )})}
                {users.length === 0 ? <p className="text-sm text-gray-500">Нет пользователей бота. Пользователь появляется после команды /start.</p> : null}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadUsers}
                className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-100"
              >
                {loadingUsers ? "Обновление..." : "Обновить список"}
              </button>
              {usersError ? <span className="text-xs text-red-600">{usersError}</span> : null}
            </div>

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

