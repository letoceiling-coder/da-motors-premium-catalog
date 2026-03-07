import { useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle, Trash2, AlertCircle } from "lucide-react";

interface Application {
  id: string;
  type: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  car_id?: string;
  car_brand?: string;
  car_model?: string;
  status: "new" | "in_progress" | "completed" | "cancelled" | "deleted";
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  new: { label: "Новая", icon: <Clock className="h-4 w-4" />, color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "В работе", icon: <Clock className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Завершена", icon: <CheckCircle2 className="h-4 w-4" />, color: "bg-green-100 text-green-700" },
  cancelled: { label: "Отменена", icon: <XCircle className="h-4 w-4" />, color: "bg-gray-100 text-gray-700" },
  deleted: { label: "Удалена", icon: <Trash2 className="h-4 w-4" />, color: "bg-red-100 text-red-700" },
};

export function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadApplications = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/applications.php");
      const data = await response.json();
      if (data.ok) {
        setApplications(data.applications || []);
      } else {
        setError(data.error || "Ошибка загрузки заявок");
      }
    } catch (err) {
      setError("Ошибка сети при загрузке заявок");
      console.error("Applications load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApplications();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch("/api/applications.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_status", id, status }),
      });
      const data = await response.json();
      if (data.ok) {
        await loadApplications();
      } else {
        alert("Ошибка обновления статуса: " + (data.error || "Неизвестная ошибка"));
      }
    } catch (err) {
      alert("Ошибка сети при обновлении статуса");
      console.error("Status update error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }

    try {
      const response = await fetch("/api/applications.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await response.json();
      if (data.ok) {
        setDeleteConfirm(null);
        await loadApplications();
      } else {
        alert("Ошибка удаления: " + (data.error || "Неизвестная ошибка"));
      }
    } catch (err) {
      alert("Ошибка сети при удалении");
      console.error("Delete error:", err);
    }
  };

  const filteredApplications = showDeleted
    ? applications
    : applications.filter((app) => app.status !== "deleted" && !app.deleted_at);

  const typeLabels: Record<string, string> = {
    trade_in: "Trade-In",
    test_drive: "Тест-драйв",
    consultation: "Консультация",
    contact: "Обратная связь",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Заявки</h2>
          <p className="mt-1 text-sm text-gray-600">Все заявки из MiniApp и бота</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            />
            Показать удаленные
          </label>
          <button
            onClick={loadApplications}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
          >
            Обновить
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-600">
          Заявки пока не поступали
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((app) => {
            const status = statusConfig[app.status] || statusConfig.new;
            const typeLabel = typeLabels[app.type] || app.type;

            return (
              <div
                key={app.id}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </span>
                      <span className="text-xs text-gray-500">{typeLabel}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(app.created_at).toLocaleString("ru-RU")}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Имя:</span>{" "}
                        <span className="text-gray-900">{app.name || "Не указано"}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Телефон:</span>{" "}
                        <span className="text-gray-900">{app.phone || "Не указан"}</span>
                      </div>
                      {app.email && (
                        <div>
                          <span className="font-medium text-gray-700">Email:</span>{" "}
                          <span className="text-gray-900">{app.email}</span>
                        </div>
                      )}
                      {(app.car_brand || app.car_model) && (
                        <div>
                          <span className="font-medium text-gray-700">Автомобиль:</span>{" "}
                          <span className="text-gray-900">
                            {app.car_brand} {app.car_model}
                          </span>
                        </div>
                      )}
                      {app.message && (
                        <div>
                          <span className="font-medium text-gray-700">Сообщение:</span>{" "}
                          <span className="text-gray-900">{app.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  {app.status !== "deleted" && (
                    <>
                      <select
                        value={app.status}
                        onChange={(e) => updateStatus(app.id, e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 outline-none ring-blue-500 focus:ring-2"
                      >
                        <option value="new">Новая</option>
                        <option value="in_progress">В работе</option>
                        <option value="completed">Завершена</option>
                        <option value="cancelled">Отменена</option>
                      </select>
                      <button
                        onClick={() => handleDelete(app.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
                          deleteConfirm === app.id
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "border border-red-300 text-red-700 hover:bg-red-50"
                        }`}
                      >
                        {deleteConfirm === app.id ? (
                          <>
                            <AlertCircle className="h-4 w-4" />
                            Подтвердить удаление
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4" />
                            Удалить
                          </>
                        )}
                      </button>
                      {deleteConfirm === app.id && (
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Отмена
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
