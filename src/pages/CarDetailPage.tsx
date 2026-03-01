import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Phone, MessageCircle, Send, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useCarsStore } from '@/stores/carsStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useUserStore, ContactRequest } from '@/stores/userStore';
import { useTelegram } from '@/hooks/useTelegram';
import { formatPrice, formatMileage, statusLabels, fuelTypeLabels, transmissionLabels, drivetrainLabels } from '@/data/cars';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const CarDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const car = useCarsStore((s) => s.cars.find((c) => c.id === id));
  const { toggle, isFavorite } = useFavoritesStore();
  const { haptic } = useTelegram();
  const addContactRequest = useUserStore((s) => s.addContactRequest);

  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', message: '' });

  if (!car) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Автомобиль не найден
      </div>
    );
  }

  const fav = isFavorite(car.id);

  const statusColor: Record<string, string> = {
    in_stock: 'bg-green-600/90 text-white',
    in_transit: 'bg-yellow-600/90 text-white',
    on_order: 'bg-muted-foreground/80 text-white',
  };

  const prevPhoto = () => setCurrentPhoto((p) => (p - 1 + car.photos.length) % car.photos.length);
  const nextPhoto = () => setCurrentPhoto((p) => (p + 1) % car.photos.length);

  const handleSubmitContact = () => {
    if (!contactForm.name || !contactForm.phone) return;
    const req: ContactRequest = {
      id: Date.now().toString(),
      carId: car.id,
      name: contactForm.name,
      phone: contactForm.phone,
      message: contactForm.message,
      createdAt: new Date().toISOString(),
    };
    addContactRequest(req);
    setContactOpen(false);
    setContactForm({ name: '', phone: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Gallery */}
      <div className="relative">
        <div className="aspect-[16/10] overflow-hidden bg-muted" onClick={() => setFullscreen(true)}>
          <img
            src={car.photos[currentPhoto]}
            alt={`${car.brand} ${car.model}`}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Nav buttons */}
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => { haptic('light'); toggle(car.id); }}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
        >
          <Heart className={cn('w-4 h-4', fav ? 'fill-primary text-primary' : '')} />
        </button>

        {/* Photo navigation */}
        {car.photos.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center">
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Counter */}
        <span className="absolute bottom-2 right-3 bg-background/70 backdrop-blur-sm rounded px-2 py-0.5 text-xs font-medium">
          {currentPhoto + 1} / {car.photos.length}
        </span>

        {/* Status */}
        <span className={cn('absolute bottom-2 left-3 px-2 py-0.5 rounded text-[10px] font-semibold', statusColor[car.status])}>
          {statusLabels[car.status]}
        </span>
      </div>

      {/* Info */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <h1 className="text-xl font-bold">{car.brand} {car.model}</h1>
        <p className="text-sm text-muted-foreground">{car.trim}</p>
        <p className="text-2xl font-bold mt-2">{formatPrice(car.price)}</p>

        <p className="text-xs text-muted-foreground mt-1">VIN: {car.vin}</p>

        {/* Specs grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {[
            { label: 'Год', value: car.year.toString() },
            { label: 'Пробег', value: formatMileage(car.mileage) },
            { label: 'Цвет', value: car.color },
            { label: 'Двигатель', value: `${car.engineVolume > 0 ? car.engineVolume + ' л / ' : ''}${car.power} л.с.` },
            { label: 'Коробка', value: transmissionLabels[car.transmission] },
            { label: 'Привод', value: drivetrainLabels[car.drivetrain] },
          ].map(({ label, value }) => (
            <div key={label} className="bg-secondary rounded-lg p-2.5">
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="text-sm font-medium mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Full specs accordion */}
        <Accordion type="multiple" className="mt-6">
          {Object.entries({
            'Двигатель': car.specs.engine,
            'Трансмиссия': car.specs.transmission,
            'Подвеска': car.specs.suspension,
          }).map(([title, specs]) => (
            <AccordionItem key={title} value={title}>
              <AccordionTrigger className="text-sm">{title}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-1.5">
                  {Object.entries(specs).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
          {Object.entries({
            'Безопасность': car.specs.safety,
            'Комфорт': car.specs.comfort,
            'Мультимедиа': car.specs.multimedia,
            'Доп. оборудование': car.specs.additional,
          }).map(([title, items]) => (
            <AccordionItem key={title} value={title}>
              <AccordionTrigger className="text-sm">{title}</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-1">
                  {items.map((item: string) => (
                    <li key={item} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Actions */}
        <div className="mt-6 space-y-2">
          <button
            onClick={() => setContactOpen(true)}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all active:scale-[0.98]"
          >
            Оставить заявку
          </button>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`https://t.me/damotors_bot?start=car_${car.id}`}
              target="_blank"
              rel="noopener"
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors hover:bg-accent"
            >
              <MessageCircle className="w-4 h-4" />
              Написать
            </a>
            <a
              href="tel:+74951234567"
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors hover:bg-accent"
            >
              <Phone className="w-4 h-4" />
              Позвонить
            </a>
          </div>
        </div>
      </div>

      {/* Fullscreen gallery */}
      {fullscreen && (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 h-12">
            <span className="text-sm font-medium">{currentPhoto + 1} / {car.photos.length}</span>
            <button onClick={() => setFullscreen(false)}><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 flex items-center justify-center relative">
            <img src={car.photos[currentPhoto]} alt="" className="max-w-full max-h-full object-contain" />
            {car.photos.length > 1 && (
              <>
                <button onClick={prevPhoto} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/60 flex items-center justify-center">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={nextPhoto} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/60 flex items-center justify-center">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Contact form */}
      <Sheet open={contactOpen} onOpenChange={(o) => !o && setContactOpen(false)}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader><SheetTitle>Оставить заявку</SheetTitle></SheetHeader>
          <div className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">{car.brand} {car.model} {car.trim}</p>
            <Input placeholder="Ваше имя" value={contactForm.name} onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))} />
            <Input placeholder="Телефон" type="tel" value={contactForm.phone} onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))} />
            <Textarea placeholder="Сообщение (необязательно)" value={contactForm.message} onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))} rows={3} />
            <button
              onClick={handleSubmitContact}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50"
              disabled={!contactForm.name || !contactForm.phone}
            >
              Отправить
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CarDetailPage;
