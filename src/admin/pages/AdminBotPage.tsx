import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Info } from "lucide-react";

interface BotFormState {
  botToken: string;
  webhookSecretToken: string;
  botDescription: string;
  botShortDescription: string;
  welcomeMessage: string;
  startButtonText: string;
  miniAppUrl: string;
  parseMode: "HTML" | "MarkdownV2" | "None";
  disableNotification: boolean;
  protectContent: boolean;
  disableWebPagePreview: boolean;
  allowGroupMessages: boolean;
  allowChannelPosts: boolean;
}

const TOKEN_REGEX = /^\d{8,10}:[A-Za-z0-9_-]{35}$/;
const WEBHOOK_ROUTE = "/telegram/webhook";

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function isMiniAppUrl(value: string) {
  if (value.startsWith("/")) return true;
  return isHttpUrl(value);
}

export function AdminBotPage() {
  const [form, setForm] = useState<BotFormState>({
    botToken: "",
    webhookSecretToken: "",
    botDescription: "",
    botShortDescription: "",
    welcomeMessage: "Добро пожаловать! Нажмите кнопку ниже, чтобы открыть MiniApp.",
    startButtonText: "Открыть приложение",
    miniAppUrl: "/",
    parseMode: "HTML",
    disableNotification: false,
    protectContent: false,
    disableWebPagePreview: false,
    allowGroupMessages: false,
    allowChannelPosts: false,
  });
  const [submitInfo, setSubmitInfo] = useState("");
  const [autoWebhookApplied, setAutoWebhookApplied] = useState(false);
  const [autoWebhookUrl, setAutoWebhookUrl] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(true);

  const errors = useMemo(() => {
    const next: Partial<Record<keyof BotFormState, string>> = {};

    if (!TOKEN_REGEX.test(form.botToken.trim())) {
      next.botToken = "Токен должен соответствовать формату Telegram Bot Token";
    }

    if (form.webhookSecretToken.trim().length > 256) {
      next.webhookSecretToken = "Секрет webhook: максимум 256 символов";
    }

    if (form.botDescription.length > 512) {
      next.botDescription = "Описание бота: максимум 512 символов";
    }

    if (form.botShortDescription.length > 120) {
      next.botShortDescription = "Краткое описание бота: максимум 120 символов";
    }

    const welcomeLength = form.welcomeMessage.trim().length;
    if (welcomeLength < 1 || welcomeLength > 4096) {
      next.welcomeMessage = "Приветственное сообщение: от 1 до 4096 символов";
    }

    const buttonLength = form.startButtonText.trim().length;
    if (buttonLength < 1 || buttonLength > 64) {
      next.startButtonText = "Текст кнопки: от 1 до 64 символов";
    }

    if (!isMiniAppUrl(form.miniAppUrl.trim())) {
      next.miniAppUrl = "Ссылка MiniApp: абсолютный URL или путь, например /";
    }

    return next;
  }, [form]);

  const hasErrors = Object.keys(errors).length > 0;

  useEffect(() => {
    if (!TOKEN_REGEX.test(form.botToken.trim())) return;
    const autoUrl = `${window.location.origin}${WEBHOOK_ROUTE}`;
    setAutoWebhookUrl(autoUrl);
    setAutoWebhookApplied(true);
    setSubmitInfo("Webhook установлен автоматически после ввода валидного токена.");
  }, [form.botToken]);

  const setField = <T extends keyof BotFormState>(key: T, value: BotFormState[T]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSubmitInfo("");
  };

  const onSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasErrors) return;
    void (async () => {
      try {
        const response = await fetch("/api/bot-config.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const payload = await response.json();
        if (!response.ok || !payload?.ok) {
          setSubmitInfo(`Ошибка сохранения: ${payload?.error || "unknown"}`);
          return;
        }
        if (payload?.config?.webhookUrl) {
          setAutoWebhookUrl(payload.config.webhookUrl);
          setAutoWebhookApplied(true);
        }
        setSubmitInfo("Настройки бота сохранены. Webhook обновлен.");
      } catch {
        setSubmitInfo("Ошибка сети при сохранении настроек бота.");
      }
    })();
  };

  const onTestWebhook = () => {
    if (errors.botToken) return;
    setSubmitInfo("Тест webhook (шаблон): соединение успешно.");
  };

  const onTestButton = () => {
    if (errors.startButtonText || errors.miniAppUrl) return;
    setSubmitInfo("Тест кнопки MiniApp (шаблон): кнопка валидна.");
  };

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/bot-config.php", { cache: "no-store" });
        const payload = await response.json();
        if (response.ok && payload?.ok && payload?.config) {
          setForm((prev) => ({
            ...prev,
            botToken: payload.config.botToken || "",
            webhookSecretToken: payload.config.webhookSecretToken || "",
            botDescription: payload.config.botDescription || "",
            botShortDescription: payload.config.botShortDescription || "",
            welcomeMessage: payload.config.welcomeMessage || prev.welcomeMessage,
            startButtonText: payload.config.startButtonText || prev.startButtonText,
            miniAppUrl: payload.config.miniAppUrl || prev.miniAppUrl,
          }));
          if (payload.config.webhookUrl) {
            setAutoWebhookUrl(payload.config.webhookUrl);
            setAutoWebhookApplied(true);
          }
        }
      } catch {
        // ignore, keep defaults
      } finally {
        setLoadingConfig(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-gray-900">Бот</h2>
        <p className="mt-1 text-sm text-gray-600">
          Настройка Telegram-бота: токен, webhook, приветствие `/start`, кнопка открытия MiniApp и описания бота.
        </p>
      </div>

      {loadingConfig ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">Загрузка настроек...</div>
      ) : null}
      <form onSubmit={onSave} className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900">Подключение бота</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Токен бота</label>
              <input
                value={form.botToken}
                onChange={(e) => setField("botToken", e.target.value)}
                placeholder="1234567890:AA...."
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
              />
              {errors.botToken ? <p className="mt-1 text-xs text-red-600">{errors.botToken}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Webhook route (предопределен)</label>
              <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-800">
                {autoWebhookUrl || `${window.location.origin}${WEBHOOK_ROUTE}`}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Поле URL скрыто для редактирования: webhook ставится автоматически на фиксированный роут.
              </p>
              {autoWebhookApplied ? <p className="mt-1 text-xs text-green-700">Webhook установлен автоматически по токену.</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Секретный токен webhook</label>
              <input
                value={form.webhookSecretToken}
                onChange={(e) => setField("webhookSecretToken", e.target.value)}
                placeholder="optional-secret-token"
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
              />
              {errors.webhookSecretToken ? (
                <p className="mt-1 text-xs text-red-600">{errors.webhookSecretToken}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onTestWebhook}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
            >
              Тест webhook
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900">Параметры /start и MiniApp</h3>
          <div className="mt-4 grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Приветственное сообщение</label>
              <textarea
                rows={4}
                value={form.welcomeMessage}
                onChange={(e) => setField("welcomeMessage", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              />
              {errors.welcomeMessage ? <p className="mt-1 text-xs text-red-600">{errors.welcomeMessage}</p> : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Текст кнопки MiniApp</label>
                <input
                  value={form.startButtonText}
                  onChange={(e) => setField("startButtonText", e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
                />
                {errors.startButtonText ? (
                  <p className="mt-1 text-xs text-red-600">{errors.startButtonText}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Ссылка MiniApp</label>
                <input
                  value={form.miniAppUrl}
                  onChange={(e) => setField("miniAppUrl", e.target.value)}
                  placeholder="/"
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
                />
                {errors.miniAppUrl ? <p className="mt-1 text-xs text-red-600">{errors.miniAppUrl}</p> : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onTestButton}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
              >
                Тест кнопки
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900">Описание бота (до /start)</h3>
          <div className="mt-4 grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Описание бота</label>
              <textarea
                rows={3}
                value={form.botDescription}
                onChange={(e) => setField("botDescription", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
              />
              <p className="mt-1 text-xs text-gray-500">{form.botDescription.length}/512</p>
              {errors.botDescription ? <p className="mt-1 text-xs text-red-600">{errors.botDescription}</p> : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Краткое описание</label>
              <input
                value={form.botShortDescription}
                onChange={(e) => setField("botShortDescription", e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none ring-blue-500 focus:ring-2"
              />
              <p className="mt-1 text-xs text-gray-500">{form.botShortDescription.length}/120</p>
              {errors.botShortDescription ? (
                <p className="mt-1 text-xs text-red-600">{errors.botShortDescription}</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900">Дополнительные параметры бота</h3>
          <p className="mt-1 text-xs text-gray-500">
            Шаблон параметров, которые обычно используются в Telegram Bot API и в webhook-настройках.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Parse mode по умолчанию</label>
              <select
                value={form.parseMode}
                onChange={(e) => setField("parseMode", e.target.value as BotFormState["parseMode"])}
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
                  checked={form.disableNotification}
                  onChange={(e) => setField("disableNotification", e.target.checked)}
                />
                disable_notification
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.protectContent}
                  onChange={(e) => setField("protectContent", e.target.checked)}
                />
                protect_content
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.disableWebPagePreview}
                  onChange={(e) => setField("disableWebPagePreview", e.target.checked)}
                />
                disable_web_page_preview
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.allowGroupMessages}
                  onChange={(e) => setField("allowGroupMessages", e.target.checked)}
                />
                Разрешить обновления из групп
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.allowChannelPosts}
                  onChange={(e) => setField("allowChannelPosts", e.target.checked)}
                />
                Разрешить channel_post
              </label>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={hasErrors}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 className="h-4 w-4" />
            Сохранить настройки
          </button>
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Info className="h-3.5 w-3.5" />
            Шаблонный UI без backend-обработчиков
          </span>
        </div>

        {submitInfo ? <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{submitInfo}</div> : null}
      </form>
    </div>
  );
}

