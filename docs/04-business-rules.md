# Business Rules and Billing Algorithms

**FleetVault Enterprise** applies a strict set of operational and financial business rules directly programmed in the backend service layer (`rental.service.ts`), which interact with the dynamic configuration stored in the `FeeConfig` table.

---

## 1. Dynamic Pricing Algorithm (Seasonal Pricing)
The daily rental price is calculated as follows:

1. **Obtaining the Seasonal Multiplier:**
   * The system looks for an active record in the `SeasonalRate` table that overlaps with the reserved period:
     $$\text{Multiplier} = \text{SeasonalRate.multiplier} \quad \text{where } (\text{startDate} \le \text{scheduledReturnDate} \text{ and } \text{endDate} \ge \text{rentalDate})$$
   * If no active record is found, the multiplier is `1.0`. If multiple exist, the one with the highest impact is used (sorted descending by `multiplier`).
2. **Calculating the Daily Rate:**
   $$\text{Effective Daily Rate} = \text{VehicleType.baseDailyRate} \times \text{Multiplier}$$
3. **Total Estimated Rental Cost:**
   $$\text{Total Cost} = \text{Effective Daily Rate} \times \text{Rental Days}$$
   *(Rental days are rounded up to the nearest integer based on the hourly difference, with a minimum of 1 day).*

---

## 2. Late Returns
The system calculates late fees based on database configuration:

* **Late Fee Amount:** Obtained from `FeeConfig` with key `LATE_FEE_PER_HOUR` (default value of **RD$ 1,500** per hour).
* **Grace Threshold:** The system implements a **1 hour** tolerance threshold (`lateHours > 1.0`).
* **Penalty Algorithm:**
  * If the return occurs after the scheduled date and time (`actualReturnDate > scheduledReturnDate`):
    $$\text{Difference in Hours} = \frac{\text{actualReturnDate} - \text{scheduledReturnDate}}{1 \text{ hour in ms}}$$
    * If the difference is less than or equal to 1.0 hours, the penalty is **RD$ 0**.
    * If the difference is greater than 1.0 hours, the total delay hours are charged at the late fee rate:
      $$\text{Late Fee} = \text{Difference in Hours} \times \text{LATE\_FEE\_PER\_HOUR}$$
      *(For example, a 1.5 hour delay will result in a charge of: $1.5 \times \text{RD\$ 1,500} = \text{RD\$ 2,250}$).*

---

## 3. Refueling Fee Algorithm
Fuel levels are internally mapped to integer numeric values to calculate objective differences:
$$\text{EMPTY} = 0, \quad \text{QUARTER} = 1, \quad \text{HALF} = 2, \quad \text{THREE\_QUARTERS} = 3, \quad \text{FULL} = 4$$

If the vehicle is returned with a lower level than delivered (`returnVal < checkoutVal`), two components configured in the `FeeConfig` table are applied:
1. **Flat Refueling Service Fee (`FUEL_FLAT_FEE`):** Base value of **RD$ 2,000** for incurring refueling.
2. **Per-Step Missing Fuel Cost (`FUEL_PER_STEP`):** **RD$ 1,000** for each step or quarter tank missing.

### Formula:
$$\text{Fuel Difference} = \max(0, \text{Checkout Fuel Value} - \text{Return Fuel Value})$$

$$\text{Fuel Fee} = \begin{cases} 
\text{FUEL\_FLAT\_FEE} + (\text{Fuel Difference} \times \text{FUEL\_PER\_STEP}) & \text{if Difference} > 0 \\
0 & \text{if Difference} \le 0 
\end{cases}$$

*(Example: If a car is delivered with a full tank (4) and returned at half (2), the difference is 2 quarters. The refueling charge will be: $\text{RD\$ 2,000} + (2 \times \text{RD\$ 1,000}) = \text{RD\$ 4,000}$).*

---

## 4. Dynamic Damage Penalties
Instead of handling static fixed charges in code, the system dynamically queries the `FeeConfig` table to check the penalty amounts associated with each active `DamageType` in the system.

### Tire Damages (Key: `TIRE`)
* The yard inspector can associate tire damages by specifying the tire position (`tirePosition`: e.g., `FRONT_LEFT`, `FRONT_RIGHT`, `REAR_LEFT`, `REAR_RIGHT`).
* The system calculates tires damaged during the trip by comparing return and checkout inspections:
  $$\text{New Damaged Tires} = \text{Return Tire Damages} - \text{Checkout Tire Damages}$$
* Penalty: **RD$ 5,000** per damaged tire recorded at return that was not previously reported at checkout.

### Other Direct Damages (Seeded Examples)
* **Broken Glass (`GLASS`):** **RD$ 12,000** per glass break reported at return if it did not exist at checkout.
* **Body Scratches (`SCRATCH`):** **RD$ 8,000** per panel with new scratches detected.
* **Missing Spare Tire (`SPARE_TIRE`):** **RD$ 3,000** if missing at return.
* **Missing Hydraulic Jack (`JACK`):** **RD$ 2,000** if missing at return.

### Vehicle Status Transition
When return is processed:
* If **any new damage** is identified that was not in the checkout inspection, the vehicle is automatically locked in **`MAINTENANCE`** status for technical inspection.
* If the vehicle returns without new damages, it is assigned **`UNDER_INSPECTION`** status and its cleaning is marked as **`DIRTY`**, requiring it to go through the wash yard before becoming available again.

---

## 5. Security Deposits and Stripe Holds
The preventive amount blocked for credit cards is obtained from `FeeConfig.SECURITY_DEPOSIT` (default value of **RD$ 15,000**).

* **Pre-Auth Hold Formula:**
  $$\text{Held Amount} = \text{Total Rental Cost} + \text{SECURITY\_DEPOSIT (RD\$ 15,000)}$$
* **Capture and Adjustment at Return:**
  * Upon completing the return, the system calculates the actual total cost (Rental + Late Fees + Fuel + Damages).
  * The system executes `stripeService.capturePayment` for an amount equal to the lesser of the actual total cost and the pre-authorization.
  * If the final cost exceeds the pre-authorized amount, an additional charge is made for the remaining difference on the registered card.

---

## 6. Corporate Credit Limit and Purchase Orders (PO)
For corporate customers, the system applies the following validation rules:

* **Mandatory Purchase Order:** A corporate rental cannot be activated without specifying the `purchaseOrderNumber` field.
* **Credit Limit Calculation:**
  The system evaluates the sum of total costs of all the corporate customer's rentals that are active, completed, or pending:
  $$\text{Outstanding Cost Sum} = \sum \text{totalCost} \quad (\text{of PENDING, ACTIVE, or COMPLETED rentals})$$
  If the cost of the new rental plus the outstanding balance exceeds the customer's credit limit, the transaction is aborted:
  $$\text{Outstanding Cost Sum} + \text{New Rental Cost} > \text{Customer.creditLimit}$$

---

## 7. Driver License Caching in Contracts
The system allows a customer to register additional or alternative drivers for the rental. Instead of reading the license directly from the customer on each subsequent validation, the system copies and freezes the driving credentials in the `Rental` table at the time the reservation is activated:
* `driverName`, `driverLicenseNumber`, `driverLicenseCountry`, `driverLicenseExpDate`, and `driverLicensePhotoUrl`.
This guarantees an immutable historical record of the actual driver who picked up the vehicle keys, protecting the company in case of traffic incidents.

---

## 8. Staff Commissions
* When processing a return (`processReturn`) and completing the rental (`COMPLETED`), the system calculates the commission for the employee who performed the original checkout (`checkoutEmployeeId`).
* **Formula:**
  $$\text{Commission} = \text{Total Final Cost} \times \left( \frac{\text{commissionPercentage}}{100} \right)$$
* The commission is calculated on the total billing (including added late fees, fuel, and damage penalties) and stored in the `commissionAmount` field of the `Rental` model for auditing and reporting.

---

## 9. Cancellation Rules and No-Show Clause
* **Advance Cancellation (more than 24h):**
  * The pending reservation changes to `CANCELLED`.
  * The entire pre-authorized deposit on Stripe is released.
  * No accounting charge is generated (amount of RD$ 0).
* **Late Cancellation (less than 24h notice):**
  * A fixed penalty equivalent to **1 day of rental** (`pricePerDay`) is charged.
  * For individual customers, that amount is captured from the Stripe pre-authorized hold.
  * A `CHARGE` or `PO_INVOICE` transaction is recorded in the ledger.
* **No-Show (2 Hours):**
  * If a rental in `PENDING` status exceeds the scheduled pickup date and time (`rentalDate`) by more than 2 hours, it is considered a "No-Show".
  * The system changes the rental status to `CANCELLED` and releases the vehicle to `AVAILABLE`.
  * The penalty equivalent to **1 day of rental** (`pricePerDay`) is automatically billed and charged.
