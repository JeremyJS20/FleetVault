# Reglas de Negocio y Algoritmos de Facturación

El sistema **FleetVault Enterprise** aplica un conjunto estricto de reglas de negocio operativas y financieras directamente programadas en la capa de servicios del backend (`rental.service.ts`), las cuales interactúan con la configuración dinámica almacenada en la tabla `FeeConfig`.

---

## 1. Algoritmo de Precios Dinámicos (Seasonal Pricing)
El precio diario de un alquiler se calcula de la siguiente manera:

1. **Obtención del Multiplicador Estacional:**
   * El sistema busca un registro activo en la tabla `SeasonalRate` que solape con el periodo reservado:
     $$\text{Multiplicador} = \text{SeasonalRate.multiplier} \quad \text{donde } (\text{startDate} \le \text{scheduledReturnDate} \text{ y } \text{endDate} \ge \text{rentalDate})$$
   * Si no se encuentra ningún registro activo, el multiplicador es `1.0`. Si existen varios, se toma el de mayor impacto (ordenando descendentemente por `multiplier`).
2. **Cálculo de la Tarifa Diaria:**
   $$\text{Tarifa Diaria Efectiva} = \text{VehicleType.baseDailyRate} \times \text{Multiplicador}$$
3. **Costo Total Estimado del Alquiler:**
   $$\text{Total Cost} = \text{Tarifa Diaria Efectiva} \times \text{Días de Alquiler}$$
   *(Los días de alquiler se redondean al entero superior en base a la diferencia horaria, con un mínimo de 1 día).*

---

## 2. Devoluciones Tardías (Late Returns)
El sistema calcula los cargos por demora basándose en la configuración de la base de datos:

* **Monto por Demora:** Se obtiene de `FeeConfig` con la clave `LATE_FEE_PER_HOUR` (con un valor por defecto de **RD$ 1,500** por hora).
* **Umbral de Tolerancia (Gracia):** El sistema implementa un umbral de tolerancia de **1 hora** (`lateHours > 1.0`).
* **Algoritmo de Penalización:**
  * Si la devolución se realiza después de la fecha y hora programadas (`actualReturnDate > scheduledReturnDate`):
    $$\text{Diferencia en Horas} = \frac{\text{actualReturnDate} - \text{scheduledReturnDate}}{1 \text{ hora en ms}}$$
    * Si la diferencia es menor o igual a 1.0 horas, la penalidad es **RD$ 0**.
    * Si la diferencia es mayor a 1.0 horas, se cobra el total de horas de retraso por la tarifa de hora tardía:
      $$\text{Late Fee} = \text{Diferencia en Horas} \times \text{LATE\_FEE\_PER\_HOUR}$$
      *(Por ejemplo, un retraso de 1.5 horas resultará en un cargo de: $1.5 \times \text{RD\$ 1,500} = \text{RD\$ 2,250}$).*

---

## 3. Algoritmo de Reabastecimiento de Combustible (Refueling Fees)
El nivel de combustible se mapea internamente a valores numéricos enteros para calcular diferencias objetivas:
$$\text{EMPTY} = 0, \quad \text{QUARTER} = 1, \quad \text{HALF} = 2, \quad \text{THREE\_QUARTERS} = 3, \quad \text{FULL} = 4$$

Si el vehículo se devuelve con un nivel inferior al de entrega (`returnVal < checkoutVal`), se aplican dos componentes configurados en la tabla `FeeConfig`:
1. **Cargo Fijo por Servicio de Combustible (`FUEL_FLAT_FEE`):** Valor base de **RD$ 2,000** por incurrir en el reabastecimiento.
2. **Costo por Nivel Faltante (`FUEL_PER_STEP`):** **RD$ 1,000** por cada paso o cuarto de tanque faltante.

### Fórmula:
$$\text{Diferencia de Combustible} = \max(0, \text{Valor Combustible Salida} - \text{Valor Combustible Entrada})$$

$$\text{Fuel Fee} = \begin{cases} 
\text{FUEL\_FLAT\_FEE} + (\text{Diferencia de Combustible} \times \text{FUEL\_PER\_STEP}) & \text{si Diferencia} > 0 \\
0 & \text{si Diferencia} \le 0 
\end{cases}$$

*(Ejemplo: Si un carro se entrega con tanque lleno (4) y se recibe a la mitad (2), la diferencia es de 2 cuartos. El cargo de reabastecimiento será: $\text{RD\$ 2,000} + (2 \times \text{RD\$ 1,000}) = \text{RD\$ 4,000}$).*

---

## 4. Cargos Dinámicos por Daños (Damage Penalties)
En lugar de manejar cargos fijos estáticos en el código, el sistema consulta dinámicamente la tabla `FeeConfig` para verificar los montos de penalidad asociados a cada `DamageType` activo en el sistema.

### Daños de Neumáticos (Clave: `TIRE`)
* El inspector de patio puede asociar daños en neumáticos especificando la posición de la llanta (`tirePosition`: e.g., `FRONT_LEFT`, `FRONT_RIGHT`, `REAR_LEFT`, `REAR_RIGHT`).
* El sistema calcula las llantas dañadas durante el viaje comparando la inspección de retorno con la de salida:
  $$\text{Nuevos Neumáticos Dañados} = \text{Daños Neumáticos Retorno} - \text{Daños Neumáticos Salida}$$
* Penalidad: **RD$ 5,000** por cada neumático dañado registrado en la devolución que no estuviera previamente reportado en el checkout.

### Otros Daños Directos (Ejemplos Seeded)
* **Vidrios Rotos (`GLASS`):** **RD$ 12,000** por rotura de cristales reportada en la devolución si no existía al salir.
* **Rayones en Carrocería (`SCRATCH`):** **RD$ 8,000** por paneles con rayones nuevos detectados.
* **Neumático de Repuesto Faltante (`SPARE_TIRE`):** **RD$ 3,000** si falta en la devolución.
* **Gato Hidráulico Faltante (`JACK`):** **RD$ 2,000** si falta en la devolución.

### Transición de Estado del Vehículo
Al registrarse la devolución:
* Si se identifica **cualquier daño nuevo** que no estaba en la inspección de salida, el vehículo se bloquea automáticamente en estado **`MAINTENANCE`** para inspección técnica.
* Si el vehículo regresa sin daños nuevos, se le asigna el estado **`UNDER_INSPECTION`** y su limpieza se marca como **`DIRTY`**, obligando a pasar por el patio de lavado antes de volver a estar disponible.

---

## 5. Depósitos de Garantía y Stripe Holds
El dinero preventivo bloqueado para tarjetas de crédito se obtiene de `FeeConfig.SECURITY_DEPOSIT` (con un valor por defecto de **RD$ 15,000**).

* **Fórmula de Retención Pre-Auth:**
  $$\text{Monto Retenido} = \text{Total Costo Alquiler} + \text{SECURITY\_DEPOSIT (RD\$ 15,000)}$$
* **Captura y Ajuste en la Devolución:**
  * Al completarse la devolución, el sistema calcula el costo total real (Alquiler + Demoras + Combustible + Daños).
  * El sistema ejecuta `stripeService.capturePayment` por un monto igual al menor valor entre el costo total real y la pre-autorización.
  * Si el costo final supera el monto pre-autorizado, se realiza un cargo adicional por la diferencia restante en la tarjeta registrada.

---

## 6. Límite de Crédito Corporativo y Órdenes de Compra (PO)
Para clientes corporativos, el sistema aplica las siguientes reglas de validación en la base de datos:

* **Orden de Compra Obligatoria:** No se permite activar un alquiler corporativo si no se especifica el campo `purchaseOrderNumber`.
* **Cálculo del Límite de Crédito:**
  Se evalúa la suma de los costos totales de todos los alquileres del cliente corporativo que se encuentren activos, completados o pendientes:
  $$\text{Suma Costos Outstanding} = \sum \text{totalCost} \quad (\text{de alquileres PENDING, ACTIVE o COMPLETED})$$
  Si el costo del nuevo alquiler más el balance pendiente excede el límite de crédito del cliente, la transacción se aborta:
  $$\text{Suma Costos Outstanding} + \text{Costo Nuevo Alquiler} > \text{Customer.creditLimit}$$

---

## 7. Caching de Credenciales de Conducción en el Contrato
El sistema permite que un cliente registre conductores adicionales o alternativos para el alquiler. En lugar de leer la licencia directamente del cliente en cada validación posterior, el sistema copia y congela las credenciales de conducir en la tabla `Rental` al momento de activarse la reserva:
* `driverName`, `driverLicenseNumber`, `driverLicenseCountry`, `driverLicenseExpDate`, y `driverLicensePhotoUrl`.
Esto garantiza un registro histórico inmutable del conductor real que retiró las llaves del vehículo, protegiendo a la empresa ante incidentes viales.

---

## 8. Comisiones del Personal
* Al procesarse la devolución (`processReturn`) y completarse el alquiler (`COMPLETED`), el sistema calcula la comisión para el empleado que realizó la entrega original (`checkoutEmployeeId`).
* **Fórmula:**
  $$\text{Comisión} = \text{Costo Final Total} \times \left( \frac{\text{commissionPercentage}}{100} \right)$$
* La comisión se calcula sobre la facturación total (incluyendo las penalidades agregadas de morosidad, combustible y daños) y se almacena en el campo `commissionAmount` del modelo `Rental` para auditoría y reportes.

---

## 9. Reglas de Cancelación y Cláusula "No-Show"
* **Cancelación con Aviso (más de 24h):**
  * La reserva pendiente pasa a `CANCELLED`.
  * Se libera la totalidad del depósito pre-autorizado en Stripe.
  * No se genera ningún cargo contable (monto de RD$ 0).
* **Cancelación Tardía (menos de 24h aviso):**
  * Se cobra una penalización fija equivalente a **1 día de alquiler** (`pricePerDay`).
  * En clientes individuales, se captura dicho monto de la retención pre-autorizada en Stripe.
  * Se registra un movimiento de tipo `CHARGE` o `PO_INVOICE` en el libro contable.
* **Inasistencia (No-Show - 2 Horas):**
  * Si un alquiler en estado `PENDING` supera por más de 2 horas la fecha y hora programada de recogida (`rentalDate`), se considera "No-Show".
  * El sistema cambia el estado del alquiler a `CANCELLED` y libera el vehículo a `AVAILABLE`.
  * Se factura y cobra automáticamente la penalización equivalente a **1 día de alquiler** (`pricePerDay`).
