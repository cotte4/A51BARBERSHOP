type AlienTone = "green" | "red" | "white";

const alienStyles: Record<
  AlienTone,
  {
    head: string;
    antenna: string;
    suit: string;
    label: string;
  }
> = {
  green: {
    head: "bg-[#65ff2f]",
    antenna: "bg-[#65ff2f]",
    suit: "bg-white",
    label: "Tripu verde",
  },
  red: {
    head: "bg-[#ff3b4d]",
    antenna: "bg-[#ff3b4d]",
    suit: "bg-white",
    label: "Modo rojo",
  },
  white: {
    head: "bg-[#f6f6f6]",
    antenna: "bg-[#f6f6f6]",
    suit: "bg-white",
    label: "Ghost lane",
  },
};

function AlienAvatar({
  tone,
  tiltClass,
}: {
  tone: AlienTone;
  tiltClass?: string;
}) {
  const style = alienStyles[tone];

  return (
    <div className={`flex flex-col items-center ${tiltClass ?? ""}`}>
      <div className="relative h-24 w-24 sm:h-28 sm:w-28">
        <div
          className={`absolute inset-x-4 top-2 h-16 rounded-full border-[3px] border-black/80 ${style.head} sm:h-20`}
        />
        <div
          className={`absolute left-8 top-0 h-5 w-1.5 rounded-full ${style.antenna} sm:left-9`}
        />
        <div
          className={`absolute right-8 top-0 h-5 w-1.5 rounded-full ${style.antenna} sm:right-9`}
        />
        <div
          className={`absolute left-[26px] top-0 h-3 w-3 rounded-full border-2 border-black/80 ${style.antenna}`}
        />
        <div
          className={`absolute right-[26px] top-0 h-3 w-3 rounded-full border-2 border-black/80 ${style.antenna}`}
        />
        <div className="absolute left-[26px] top-8 h-8 w-5 rounded-full bg-black sm:left-[30px] sm:top-10 sm:h-9 sm:w-6" />
        <div className="absolute right-[26px] top-8 h-8 w-5 rounded-full bg-black sm:right-[30px] sm:top-10 sm:h-9 sm:w-6" />
        <div className="absolute inset-x-7 bottom-0 h-10 rounded-t-[24px] border-[3px] border-black/80 bg-white sm:inset-x-8 sm:h-12" />
        <div className="absolute left-1/2 top-[55px] h-5 w-7 -translate-x-1/2 rounded-b-[16px] border-[3px] border-t-0 border-black/80 bg-white sm:top-[66px]" />
        <div className="absolute left-1/2 top-[68px] h-3 w-8 -translate-x-1/2 rounded-full border-[3px] border-black/80 bg-transparent sm:top-[82px]" />
      </div>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
        {style.label}
      </p>
    </div>
  );
}

export default function AlienCrewCard({
  title = "Tripulacion A51",
  detail = "Cabina marciana en ronda, lista para levantar senal.",
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(94,39,64,0.95)_0%,rgba(42,25,38,0.95)_100%)] p-4 shadow-[0_20px_55px_rgba(0,0,0,0.28)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-5 top-3 h-3 rounded-t-[18px] bg-[#7a2e50]" />
        <div className="absolute left-5 right-5 top-6 h-[1px] bg-white/20" />
        <div className="absolute left-6 right-6 top-8 bottom-16 rounded-[26px] bg-[linear-gradient(180deg,#90d7ff_0%,#90d7ff_34%,#5d6772_34%,#5d6772_100%)]" />
        <div className="absolute left-7 top-10 h-10 w-20 rounded-br-[26px] bg-[#75cf4f]" />
        <div className="absolute right-7 top-10 h-10 w-24 rounded-bl-[26px] bg-[#5fc652]" />
        <div className="absolute inset-x-7 bottom-16 h-5 bg-[#3a3a3a]" />
        <div className="absolute left-10 right-10 bottom-20 h-[2px] bg-white/30" />
      </div>

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d6ffbf]">
              Crew Signal
            </p>
            <p className="mt-2 font-display text-2xl font-semibold text-white">{title}</p>
          </div>
          <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-300">
            Alien lane
          </div>
        </div>

        <div className="mt-5 flex items-end justify-center gap-1 sm:gap-3">
          <AlienAvatar tone="green" tiltClass="-rotate-2" />
          <AlienAvatar tone="red" />
          <AlienAvatar tone="white" tiltClass="rotate-2" />
        </div>

        <p className="mt-4 max-w-md text-sm leading-6 text-zinc-200">{detail}</p>
      </div>
    </div>
  );
}
