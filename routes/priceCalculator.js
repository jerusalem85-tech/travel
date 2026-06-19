import { Router } from 'express';
const router = Router();

router.post('/calculate', async (req, res) => {
  const { service_type, persons, days, base_price, addons = [] } = req.body;

  let total = Number(base_price) || 0;
  let breakdown = [{ label: 'السعر الأساسي', amount: total }];

  if (persons > 1) {
    const personCost = total * (persons - 1) * 0.6;
    total += personCost;
    breakdown.push({ label: `تكلفة ${persons - 1} أشخاص إضافيين`, amount: personCost });
  }

  if (days > 1) {
    const dayCost = total * (days - 1) * 0.8;
    total += dayCost;
    breakdown.push({ label: `${days - 1} أيام إضافية`, amount: dayCost });
  }

  if (addons.length > 0) {
    for (const addon of addons) {
      total += Number(addon.price) || 0;
      breakdown.push({ label: addon.name, amount: Number(addon.price) || 0 });
    }
  }

  res.json({ total, breakdown });
});

export default router;
