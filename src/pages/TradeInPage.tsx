import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUserStore, TradeInApplication } from '@/stores/userStore';
import { useTelegram } from '@/hooks/useTelegram';

const TradeInPage = () => {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const addTradeIn = useUserStore((s) => s.addTradeIn);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState({
    brand: '', model: '', year: '', mileage: '', vin: '', phone: '', comment: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    const app: TradeInApplication = {
      id: Date.now().toString(),
      brand: form.brand,
      model: form.model,
      year: parseInt(form.year) || 0,
      mileage: parseInt(form.mileage) || 0,
      vin: form.vin,
      phone: form.phone,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    addTradeIn(app);
    haptic('medium');
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 pb-20">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">Заявка отправлена</h2>
        <p className="text-sm text-muted-foreground text-center">Наш менеджер свяжется с вами в ближайшее время</p>
        <button onClick={() => navigate('/')} className="mt-6 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          В каталог
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="h-14 flex items-center gap-2 px-4 max-w-lg mx-auto">
          <button onClick={() => step === 1 ? navigate(-1) : setStep((s) => (s - 1) as 1 | 2)} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Trade-In</h1>
          <span className="ml-auto text-sm text-muted-foreground">{step}/3</span>
        </div>
      </div>

      <div className="pt-16 max-w-lg mx-auto px-4 py-4">
        {/* Progress */}
        <div className="flex gap-1 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`flex-1 h-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-secondary'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Данные автомобиля</h2>
            <Input placeholder="Марка" value={form.brand} onChange={(e) => update('brand', e.target.value)} />
            <Input placeholder="Модель" value={form.model} onChange={(e) => update('model', e.target.value)} />
            <Input placeholder="Год выпуска" type="number" value={form.year} onChange={(e) => update('year', e.target.value)} />
            <button
              onClick={() => setStep(2)}
              disabled={!form.brand || !form.model || !form.year}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              Далее
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Дополнительная информация</h2>
            <Input placeholder="Пробег (км)" type="number" value={form.mileage} onChange={(e) => update('mileage', e.target.value)} />
            <Input placeholder="VIN (необязательно)" value={form.vin} onChange={(e) => update('vin', e.target.value)} />
            <Textarea placeholder="Комментарий" value={form.comment} onChange={(e) => update('comment', e.target.value)} rows={3} />
            <button
              onClick={() => setStep(3)}
              disabled={!form.mileage}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              Далее
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Контактные данные</h2>
            <Input placeholder="Телефон" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
            <button
              onClick={handleSubmit}
              disabled={!form.phone}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              Отправить заявку
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeInPage;
