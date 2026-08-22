import assert from "node:assert/strict";

async function main() {
  const {
    canViewPresupuestoMemas,
    getPresupuestoTotals,
    normalizeFotoPos,
    normalizeFotoZoom,
    getFotoCropStyle,
  } = await import("../src/lib/presupuesto");

  // Solo el asesor (lado Memas) ve el presupuesto.
  assert.equal(canViewPresupuestoMemas("asesor"), true);
  assert.equal(canViewPresupuestoMemas("admin"), false);
  assert.equal(canViewPresupuestoMemas("barbero"), false);
  assert.equal(canViewPresupuestoMemas("marciano"), false);
  assert.equal(canViewPresupuestoMemas(undefined), false);
  assert.equal(canViewPresupuestoMemas(null), false);
  assert.equal(canViewPresupuestoMemas(""), false);

  // Totales: suma y subtotales por categoria.
  const totals = getPresupuestoTotals([
    { categoria: "Inmueble", montoEstimado: "1000000" },
    { categoria: "Obra", montoEstimado: "500000.50" },
    { categoria: "Obra", montoEstimado: 250000 },
    { categoria: "Otros", montoEstimado: null },
  ]);
  assert.equal(totals.total, 1750000.5);
  assert.equal(totals.count, 4);
  assert.equal(totals.grupos.find((g) => g.categoria === "Obra")?.subtotal, 750000.5);
  assert.equal(totals.grupos.find((g) => g.categoria === "Inmueble")?.subtotal, 1000000);
  // Una categoria sin items no aparece.
  assert.equal(totals.grupos.some((g) => g.categoria === "Equipamiento"), false);
  // Monto nulo cuenta como linea con subtotal 0.
  assert.equal(totals.grupos.find((g) => g.categoria === "Otros")?.subtotal, 0);

  // Presupuesto vacio.
  const vacio = getPresupuestoTotals([]);
  assert.equal(vacio.total, 0);
  assert.equal(vacio.grupos.length, 0);

  // Encuadre de foto: el valor va a un style inline, no puede entrar texto libre.
  assert.equal(normalizeFotoPos("25% 75%"), "25% 75%");
  assert.equal(normalizeFotoPos("0% 0%"), "0% 0%");
  assert.equal(normalizeFotoPos("100% 100%"), "100% 100%");
  assert.equal(normalizeFotoPos("33.5% 66.5%"), "33.5% 66.5%");
  // Fuera de rango, formatos raros y payloads -> default.
  assert.equal(normalizeFotoPos("120% 50%"), "50% 50%");
  assert.equal(normalizeFotoPos("-10% 50%"), "50% 50%");
  assert.equal(normalizeFotoPos("50%"), "50% 50%");
  assert.equal(normalizeFotoPos("center top"), "50% 50%");
  assert.equal(normalizeFotoPos("50% 50%; background: url(x)"), "50% 50%");
  assert.equal(normalizeFotoPos("</style><script>alert(1)</script>"), "50% 50%");
  assert.equal(normalizeFotoPos(null), "50% 50%");
  assert.equal(normalizeFotoPos(undefined), "50% 50%");
  assert.equal(normalizeFotoPos(""), "50% 50%");

  // Zoom del recorte: acotado a [1, 4], basura cae en 1.
  assert.equal(normalizeFotoZoom(2.5), 2.5);
  assert.equal(normalizeFotoZoom("1.75"), 1.75);
  assert.equal(normalizeFotoZoom(0.2), 1);      // por debajo del minimo
  assert.equal(normalizeFotoZoom(99), 4);       // por encima del maximo
  assert.equal(normalizeFotoZoom(-3), 1);
  assert.equal(normalizeFotoZoom("scale(9)"), 1);
  assert.equal(normalizeFotoZoom(null), 1);
  assert.equal(normalizeFotoZoom(undefined), 1);
  assert.equal(normalizeFotoZoom(NaN), 1);

  // El origen del transform sigue a la posicion: al hacer zoom, el punto
  // elegido queda quieto en vez de irse de cuadro.
  const crop = getFotoCropStyle("30% 70%", 2);
  assert.equal(crop.objectPosition, "30% 70%");
  assert.equal(crop.transformOrigin, "30% 70%");
  assert.equal(crop.transform, "scale(2)");

  // El hover multiplica sobre el recorte guardado, no lo reemplaza.
  assert.equal(getFotoCropStyle("50% 50%", 2, 1.5).transform, "scale(3)");
  // Sin nada guardado, sin recorte.
  assert.equal(getFotoCropStyle(null, null).transform, "scale(1)");

  console.log("Presupuesto access + totals + fotoPos + zoom passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
