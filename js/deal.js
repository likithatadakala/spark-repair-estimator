// Pure deal / margin math. No DOM, no state — fully unit-tested.
const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

// Inputs are raw strings/numbers; repairs is the live repair total (number).
export function analyze({ arv, purchasePrice, holdingCosts, repairs }){
  const A = num(arv), P = num(purchasePrice), H = num(holdingCosts), R = num(repairs);
  const margin = A - P - R - H;            // projected profit
  const basis  = P + R + H;                // total cost basis
  const roi    = basis > 0 ? (margin / basis) * 100 : 0;
  const maxOffer = Math.round(0.7 * A - R); // 70% rule: 70% of ARV minus repairs
  return { margin, roi, maxOffer, overBudget: P > maxOffer, basis };
}
