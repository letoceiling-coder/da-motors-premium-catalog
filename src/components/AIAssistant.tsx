import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  text: string;
  from: 'user' | 'bot';
}

const initialMessages: Message[] = [
  { id: '1', text: 'Здравствуйте! Я виртуальный помощник DA Motors. Чем могу помочь?', from: 'bot' },
];

const responses: Record<string, string> = {
  'бюджет': 'Подскажите ваш бюджет, и я подберу подходящие варианты. У нас есть автомобили от 3 800 000 до 27 500 000 рублей.',
  'седан': 'Рекомендую обратить внимание на Mercedes-Benz S-Class, BMW 7 Series или Audi A8. Все в отличном состоянии.',
  'внедорожник': 'У нас отличный выбор SUV: Porsche Cayenne, Mercedes-Benz GLE, BMW X5, Audi SQ8.',
  'порше': 'Porsche представлен моделями: 911 Carrera S, Cayenne Turbo GT, Macan GTS и Panamera Turbo S.',
  'мерседес': 'Mercedes-Benz: S-Class, GLE, E-Class, AMG GT и G-Class — все доступны в каталоге.',
  'бмв': 'BMW: 7 Series, X5, M4 Competition, iX M60 и 5 Series. Подробности по каждой модели в каталоге.',
  'электро': 'Электрические модели: BMW iX M60 и Audi RS e-tron GT Performance. Высокая мощность и запас хода.',
  'трейд': 'Вы можете оформить Trade-In через раздел Trade-In в нижнем меню. Мы оценим ваш автомобиль.',
  'наличии': 'Воспользуйтесь фильтром "В наличии" в каталоге, чтобы увидеть доступные автомобили.',
};

function getResponse(text: string): string {
  const lower = text.toLowerCase();
  for (const [key, value] of Object.entries(responses)) {
    if (lower.includes(key)) return value;
  }
  return 'Уточните ваш запрос, и я постараюсь помочь. Вы можете спросить про бюджет, тип кузова или конкретную марку.';
}

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), text: input, from: 'user' };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setTimeout(() => {
      const botMsg: Message = { id: (Date.now() + 1).toString(), text: getResponse(input), from: 'bot' };
      setMessages((m) => [...m, botMsg]);
    }, 500);
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'fixed z-[60] w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all active:scale-90',
          'bottom-20 right-4'
        )}
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {/* Chat overlay */}
      {open && (
        <div className="fixed z-[59] bottom-[136px] right-4 w-[calc(100%-2rem)] max-w-sm bg-card border rounded-xl shadow-xl flex flex-col overflow-hidden" style={{ maxHeight: '60vh' }}>
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-semibold">Помощник DA Motors</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'max-w-[85%] px-3 py-2 rounded-xl text-sm',
                  msg.from === 'bot'
                    ? 'bg-secondary text-secondary-foreground self-start'
                    : 'bg-primary text-primary-foreground self-end ml-auto'
                )}
              >
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-2 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Написать..."
              className="flex-1 bg-transparent text-sm outline-none px-2"
            />
            <button onClick={send} className="p-2 text-primary" disabled={!input.trim()}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
