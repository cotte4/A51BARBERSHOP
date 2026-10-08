/** Una sola línea, inerte: lo que viene después del torneo. Sin botones ni links. */
export default function Proximamente() {
  return (
    <section aria-label="Lo que viene en la app A51" className="torneo-soon-compacto">
      <p className="torneo-soon-titulo torneo-hud">
        <span>Después: tu cuenta A51</span>
        <span className="torneo-soon-sep" aria-hidden="true" />
        <span className="text-[#8cff59]">Próximamente</span>
      </p>
      <p className="mt-3 max-w-sm text-center text-sm leading-6 text-[#8d998a]">
        Tu perfil, modo alien, juegos y ruleta.
      </p>
    </section>
  );
}
