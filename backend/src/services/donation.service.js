const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { store } = require('./store.service');

const METHOD_MAP = {
  card: 'CARD',
  bank: 'BANK_TRANSFER',
  'bank-transfer': 'BANK_TRANSFER',
  paypal: 'PAYPAL'
};

const RECURRING_PROVIDERS = ['stripe', 'paypal'];
const LARGE_DONATION_THRESHOLD = 500;

async function newDonationNumber() {
  const today = new Date();
  const day =
    today.getFullYear() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0');
  const prefix = `DON-${day}-`;
  const count = await prisma.donation.count({ where: { donationNumber: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(5, '0')}`;
}

function serialize(d, campaign, refundInfo) {
  return {
    id: d.id,
    donationNumber: d.donationNumber,
    amount: Number(d.amount),
    feesAmount: d.feesAmount ? Number(d.feesAmount) : null,
    coverFees: d.coverFees,
    currency: d.currency,
    status: d.status,
    paymentMethod: d.paymentMethod,
    provider: d.provider,
    transactionId: d.transactionId,
    donorName: d.isAnonymous ? 'Anonymous' : d.donorName || 'Guest',
    donorEmail: d.isAnonymous ? null : d.donorEmail,
    isAnonymous: d.isAnonymous,
    showOnWall: d.showOnWall,
    recurring: d.recurring,
    purpose: d.purpose || null,
    message: d.message || null,
    messageStatus: d.messageStatus,
    country: d.country || null,
    campaignId: d.campaignId || null,
    campaign: campaign
      ? { id: campaign.id, title: campaign.title, slug: campaign.slug, purpose: campaign.purpose }
      : null,
    refund: refundInfo
      ? {
          amount: Number(refundInfo.amount),
          reason: refundInfo.reason,
          actorName: refundInfo.actorName,
          refundedAt: refundInfo.refundedAt.toISOString()
        }
      : null,
    paidAt: d.paidAt ? d.paidAt.toISOString() : null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString()
  };
}

async function withCampaign(d) {
  let campaign = null;
  if (d.campaignId) {
    campaign = await prisma.campaign.findUnique({ where: { id: d.campaignId } });
  }
  const refundInfo =
    d.status === 'REFUNDED'
      ? await prisma.donationRefund.findFirst({ where: { donationId: d.id } })
      : null;
  return serialize(d, campaign, refundInfo);
}

/* Creates the donation in PENDING state. A donation is only moved to PAID by
   the payment confirmation endpoint — never by the browser itself. */
async function create(
  { amount, method, name, email, anonymous, provider, message, purpose, coverFees, recurring, campaignId, showOnWall, country },
  user
) {
  const amt = Number(amount) || 0;
  if (amt <= 0) {
    const err = new Error('A valid donation amount is required.');
    err.status = 400;
    throw err;
  }
  const settings = (store && store.settings && store.settings.donation) || {};
  if (!settings.enabled) {
    const err = new Error('Donations are currently disabled.');
    err.status = 403;
    throw err;
  }
  const isRecurring = Boolean(recurring);
  if (isRecurring && settings.allowMonthly === false) {
    const err = new Error('Monthly donations are currently disabled.');
    err.status = 403;
    throw err;
  }
  let campaign = null;
  if (campaignId) {
    campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      const err = new Error('Campaign not found.');
      err.status = 400;
      throw err;
    }
  }
  const hasMessage = !!(message && String(message).trim());
  const messageStatus = hasMessage
    ? settings.messageApproval
      ? 'pending'
      : 'approved'
    : 'none';
  const feesAmount = Boolean(coverFees) && !isRecurring ? Math.round(amt * 0.03 * 100) / 100 : null;
  const donation = await prisma.donation.create({
    data: {
      donationNumber: await newDonationNumber(),
      amount: amt,
      feesAmount,
      coverFees: Boolean(coverFees),
      recurring: isRecurring,
      purpose: purpose ? String(purpose).trim() : campaign?.purpose || null,
      message: hasMessage ? String(message).trim() : null,
      messageStatus,
      donorName: typeof name === 'string' && name.trim() && !anonymous ? String(name).trim() : null,
      donorEmail:
        typeof email === 'string' && email.trim() && !anonymous ? String(email).trim() : null,
      isAnonymous: Boolean(anonymous),
      showOnWall: Boolean(showOnWall) && !anonymous,
      country: country ? String(country).slice(0, 60) : null,
      paymentMethod: METHOD_MAP[String(method || 'card').toLowerCase()] || 'CARD',
      provider: provider ? String(provider).toLowerCase() : 'demo',
      campaignId: campaign ? campaign.id : null,
      userId: user ? user.id : null,
      status: 'PENDING'
    }
  });
  return {
    id: donation.id,
    donationNumber: donation.donationNumber,
    amount: Number(donation.amount),
    feesAmount: donation.feesAmount ? Number(donation.feesAmount) : 0,
    recurring: donation.recurring,
    status: donation.status,
    createdAt: donation.createdAt.toISOString()
  };
}

/* Server-side payment confirmation — stands in for the provider webhook. */
async function confirmDemoPayment(donationId, userId) {
  const donation = await prisma.donation.findUnique({ where: { id: donationId } });
  if (!donation) {
    const err = new Error('Donation not found.');
    err.status = 404;
    throw err;
  }
  if (donation.userId && donation.userId !== userId) {
    const err = new Error('You can only confirm your own donations.');
    err.status = 403;
    throw err;
  }
  if (donation.status === 'PAID') {
    const campaign = donation.campaignId ? await prisma.campaign.findUnique({ where: { id: donation.campaignId } }) : null;
    return serialize(donation, campaign);
  }
  if (donation.status !== 'PENDING') {
    const err = new Error('This donation cannot be confirmed.');
    err.status = 409;
    throw err;
  }
  const paid = await prisma.donation.update({
    where: { id: donation.id },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      transactionId: 'TXN-' + crypto.randomBytes(5).toString('hex').toUpperCase()
    }
  });
  const campaign = paid.campaignId ? await prisma.campaign.findUnique({ where: { id: paid.campaignId } }) : null;
  return serialize(paid, campaign);
}

async function list({ status, search, from, to, minAmount, maxAmount, campaignId, method, recurring, anonymous, country, page = 1, pageSize = 100 }) {
  const where = {};
  const st = String(status || '').trim().toUpperCase();
  if (st && st !== 'ALL') where.status = st;
  const q = String(search || '').trim();
  if (q) {
    where.OR = [
      { donorName: { contains: q, mode: 'insensitive' } },
      { donorEmail: { contains: q, mode: 'insensitive' } },
      { donationNumber: { contains: q, mode: 'insensitive' } }
    ];
  }
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) where.createdAt = { ...(where.createdAt || {}), gte: d };
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      where.createdAt = { ...(where.createdAt || {}), lte: d };
    }
  }
  if (Number(minAmount)) where.amount = { ...(where.amount || {}), gte: Number(minAmount) };
  if (Number(maxAmount)) where.amount = { ...(where.amount || {}), lte: Number(maxAmount) };
  if (campaignId) where.campaignId = campaignId;
  if (method) where.paymentMethod = String(method).toUpperCase();
  if (recurring !== undefined && recurring !== 'ALL' && recurring !== '') {
    where.recurring = recurring === 'true' || recurring === true;
  }
  if (anonymous !== undefined && anonymous !== 'ALL' && anonymous !== '') {
    where.isAnonymous = anonymous === 'true' || anonymous === true;
  }
  if (country && country !== 'ALL') where.country = country;

  const [donations, totalCount] = await Promise.all([
    prisma.donation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(pageSize) || 100, 500),
      skip: (Math.max(1, Number(page) || 1) - 1) * (Number(pageSize) || 100),
      include: { campaign: true, refunds: { orderBy: { refundedAt: 'desc' }, take: 1 } }
    }),
    prisma.donation.count({ where })
  ]);

  const all = await prisma.donation.findMany();
  const now = new Date();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sum = (list) => list.reduce((s, d) => s + Number(d.amount), 0);
  const totalAmount = sum(all);
  const monthAmount = sum(all.filter((d) => d.createdAt >= monthStart));
  const todayAmount = sum(all.filter((d) => d.createdAt >= today0));
  const donorsSet = new Set(all.map((d) => d.userId || (!d.isAnonymous && d.donorEmail) || d.donationNumber));
  const monthlyDonors = new Set(all.filter((d) => d.recurring).map((d) => d.userId || (!d.isAnonymous && d.donorEmail) || d.donationNumber));
  const byStatus = {};
  for (const d of all) byStatus[d.status] = (byStatus[d.status] || 0) + 1;

  return {
    stats: {
      totalDonations: Math.round(totalAmount * 100) / 100,
      totalCount: all.length,
      thisMonth: Math.round(monthAmount * 100) / 100,
      thisMonthCount: all.filter((d) => d.createdAt >= monthStart).length,
      today: Math.round(todayAmount * 100) / 100,
      donors: donorsSet.size,
      monthlyDonors: monthlyDonors.size,
      average: all.length ? Math.round((totalAmount / all.length) * 100) / 100 : 0
    },
    byStatus,
    totalCount,
    donations: donations.map((d) => serialize(d, d.campaign, d.refunds[0]))
  };
}

async function refund({ donationNumber, reason, actorId, actorName }) {
  const existing = await prisma.donation.findUnique({ where: { donationNumber } });
  if (!existing) {
    const err = new Error('Donation not found.');
    err.status = 404;
    throw err;
  }
  if (existing.status === 'REFUNDED') {
    const err = new Error('This donation has already been refunded.');
    err.status = 409;
    throw err;
  }
  if (existing.status !== 'PAID') {
    const err = new Error('Only paid donations can be refunded.');
    err.status = 409;
    throw err;
  }
  await prisma.donationRefund.create({
    data: {
      donationId: existing.id,
      donationNumber: existing.donationNumber,
      amount: existing.amount,
      reason: reason ? String(reason).slice(0, 500) : '',
      actorId: actorId || null,
      actorName: actorName || 'Admin'
    }
  });
  const donation = await prisma.donation.update({
    where: { id: existing.id },
    data: { status: 'REFUNDED' }
  });
  return withCampaign(donation);
}

async function refundHistory({ limit = 50 } = {}) {
  const refunds = await prisma.donationRefund.findMany({
    orderBy: { refundedAt: 'desc' },
    take: Math.min(Number(limit) || 50, 200)
  });
  return refunds.map((r) => ({
    id: r.id,
    donationNumber: r.donationNumber,
    amount: Number(r.amount),
    reason: r.reason,
    actorName: r.actorName,
    refundedAt: r.refundedAt.toISOString()
  }));
}

/* Public aggregate numbers (no donor data) used for the progress/goal indicator. */
async function summary() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const paid = await prisma.donation.findMany({
    where: { status: 'PAID' },
    select: { amount: true, createdAt: true, campaignId: true, userId: true, donorName: true, donorEmail: true, isAnonymous: true }
  });
  const totalAmount = paid.reduce((s, d) => s + Number(d.amount), 0);
  const monthAmount = paid.filter((d) => d.createdAt >= monthStart).reduce((s, d) => s + Number(d.amount), 0);
  const donorSet = new Set(
    paid.filter((d) => !d.isAnonymous && (d.userId || d.donorEmail || d.donorName)).map((d) => d.userId || String(d.donorEmail || d.donorName))
  );
  const campaigns = await prisma.campaign.findMany({
    where: { status: 'ACTIVE' },
    include: { donations: { where: { status: 'PAID' }, select: { amount: true } } }
  });
  const campaignProgress = campaigns.map((c) => {
    const raised = c.donations.reduce((s, d) => s + Number(d.amount), 0);
    return {
      id: c.id,
      title: c.title,
      slug: c.slug,
      goal: Number(c.goal),
      raised: Math.round(raised * 100) / 100,
      fundedPercent: Number(c.goal) > 0 ? Math.min(100, Math.round((raised / Number(c.goal)) * 100)) : 0
    };
  });
  return {
    totalRaised: Math.round(totalAmount * 100) / 100,
    totalDonors: donorSet.size,
    thisMonth: Math.round(monthAmount * 100) / 100,
    campaigns: campaignProgress
  };
}

/* Supporters for the public donor wall — only donors who opted in via showOnWall,
   anonymous donors stay anonymous and appear as "Anonymous". */
async function supporters() {
  const paid = await prisma.donation.findMany({
    where: { status: 'PAID' },
    include: { campaign: true },
    orderBy: { createdAt: 'desc' },
    take: 1500
  });

  const recents = paid
    .filter((d) => d.showOnWall && !d.isAnonymous)
    .slice(0, 12)
    .map((d) => ({
      name: d.donorName || 'Guest',
      amount: Number(d.amount),
      currency: d.currency,
      purpose: d.purpose || d.campaign?.purpose || null,
      campaign: d.campaign ? d.campaign.title : null,
      at: d.createdAt.toISOString()
    }));

  const byDonor = new Map();
  for (const d of paid) {
    if (d.isAnonymous) continue;
    const key = d.userId || String(d.donorEmail || d.donorName);
    const cur = byDonor.get(key) || { name: d.donorName || 'Guest', total: 0, count: 0, recurring: false, at: d.createdAt };
    cur.total += Number(d.amount) + (d.feesAmount ? Number(d.feesAmount) : 0);
    cur.count += 1;
    cur.recurring = cur.recurring || d.recurring;
    if (d.createdAt > cur.at) cur.at = d.createdAt;
    byDonor.set(key, cur);
  }

  function badges(d) {
    const list = [];
    if (d.count === 1) list.push('🌱 First Donation');
    list.push('💛 Supporter');
    if (d.recurring) list.push('⭐ Monthly Supporter');
    if (d.total >= 250) list.push('🏆 Champion');
    if (d.education) list.push('📚 Education Supporter');
    return list;
  }

  const top = [...byDonor.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((d) => ({ name: d.name, total: Math.round(d.total * 100) / 100, count: d.count, badges: badges(d) }));

  const monthly = [...byDonor.values()]
    .filter((d) => d.recurring)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map((d) => ({ name: d.name, total: Math.round(d.total * 100) / 100, count: d.count, badges: badges(d) }));

  const anonymous = paid
    .filter((d) => d.isAnonymous)
    .slice(0, 10)
    .map((d) => ({ amount: Number(d.amount), currency: d.currency, purpose: d.purpose || null, at: d.createdAt.toISOString() }));

  const messages = paid
    .filter((d) => d.message && d.messageStatus === 'approved' && !d.isAnonymous && d.showOnWall)
    .slice(0, 12)
    .map((d) => ({
      name: d.donorName || 'Guest',
      message: d.message,
      amount: Number(d.amount),
      at: d.createdAt.toISOString()
    }));

  return { recent: recents, top, monthly, anonymous, messages };
}

/* Donor management — distinct donors with totals and flags. */
async function donors({ search = '', sort = 'total' } = {}) {
  const paid = await prisma.donation.findMany({ where: { status: 'PAID' } });
  const map = new Map();
  for (const d of paid) {
    const key = d.userId || String(d.donorEmail || d.donorName || d.donationNumber);
    const cur = map.get(key) || {
      userId: d.userId || null,
      name: d.donorName || 'Guest',
      email: d.donorEmail || null,
      isAnonymous: d.isAnonymous && !d.userId,
      total: 0,
      count: 0,
      recurring: false,
      lastDonation: d.createdAt,
      firstDonation: d.createdAt
    };
    cur.total += Number(d.amount) + (d.feesAmount ? Number(d.feesAmount) : 0);
    cur.count += 1;
    cur.recurring = cur.recurring || d.recurring;
    if (d.createdAt > cur.lastDonation) cur.lastDonation = d.createdAt;
    if (d.createdAt < cur.firstDonation) cur.firstDonation = d.createdAt;
    map.set(key, cur);
  }
  let list = [...map.values()];
  const s = String(search || '').trim().toLowerCase();
  if (s) list = list.filter((d) => (d.name || '').toLowerCase().includes(s) || (d.email || '').toLowerCase().includes(s));
  if (sort === 'name') list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  else if (sort === 'recent') list.sort((a, b) => b.lastDonation - a.lastDonation);
  else list.sort((a, b) => b.total - a.total);
  return list.map((d) => ({
    ...d,
    total: Math.round(d.total * 100) / 100,
    lastDonation: d.lastDonation.toISOString(),
    firstDonation: d.firstDonation.toISOString()
  }));
}

/* Analytics used by the admin Reports view. */
async function reports() {
  const now = new Date();
  const paid = await prisma.donation.findMany({ where: { status: 'PAID' }, include: { campaign: true } });
  const attempted = await prisma.donation.findMany({ select: { status: true } });
  const sum = (list) => list.reduce((s, d) => s + Number(d.amount) + (d.feesAmount ? Number(d.feesAmount) : 0), 0);

  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const dayKey = (d) => d.toISOString().slice(0, 10);

  const byDay = new Map();
  const byMonth = new Map();
  for (const d of paid) {
    const dk = dayKey(d.createdAt);
    byDay.set(dk, (byDay.get(dk) || 0) + Number(d.amount));
    const mk = monthKey(d.createdAt);
    const cur = byMonth.get(mk) || { amount: 0, donors: new Set() };
    cur.amount += Number(d.amount);
    if (!d.isAnonymous) cur.donors.add(d.userId || String(d.donorEmail || d.donorName));
    byMonth.set(mk, cur);
  }
  const daily = [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-30)
    .map(([date, amount]) => ({ date, amount: Math.round(amount * 100) / 100 }));

  const monthly = [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-12)
    .map(([month, v]) => ({ month, amount: Math.round(v.amount * 100) / 100, donors: v.donors.size }));

  const byCampaign = new Map();
  for (const d of paid) {
    const key = d.campaign ? d.campaign.title : 'General Fund';
    byCampaign.set(key, (byCampaign.get(key) || 0) + Number(d.amount));
  }
  const campaignPerformance = [...byCampaign.entries()].map(([name, amount]) => ({
    name,
    amount: Math.round(amount * 100) / 100
  }));

  const currency = store?.settings?.store?.currency || 'AED';
  let largest = paid[0] || null;
  for (const d of paid) if (Number(d.amount) > Number(largest.amount)) largest = d;

  const recurringRevenue = sum(paid.filter((d) => d.recurring));
  const monthlyDonors = new Set(paid.filter((d) => d.recurring).map((d) => d.userId || String(d.donorEmail || d.donorName))).size;
  const totalDonors = new Set(paid.filter((d) => !d.isAnonymous).map((d) => d.userId || String(d.donorEmail || d.donorName))).size;
  const totalAmount = sum(paid);
  const paidCount = attempted.filter((d) => d.status === 'PAID').length;
  const filtered = attempted.filter((d) => ['PAID', 'FAILED', 'PENDING'].includes(d.status));
  const conversionRate = filtered.length ? Math.round((paidCount / filtered.length) * 100) : 0;

  const byAmount = [
    { label: 'Under AED 25', value: 0 },
    { label: 'AED 25–99', value: 0 },
    { label: 'AED 100–249', value: 0 },
    { label: 'AED 250+', value: 0 }
  ];
  for (const d of paid) {
    const amt = Number(d.amount);
    if (amt < 25) byAmount[0].value++;
    else if (amt < 100) byAmount[1].value++;
    else if (amt < 250) byAmount[2].value++;
    else byAmount[3].value++;
  }

  const oneTimeIfMonthly = {
    oneTime: paid.filter((d) => !d.recurring).length,
    monthly: paid.filter((d) => d.recurring).length
  };

  const byCountry = new Map();
  for (const d of paid) {
    const c = d.country || 'UAE';
    byCountry.set(c, (byCountry.get(c) || 0) + Number(d.amount));
  }

  const byStatus = { PAID: paidCount, PENDING: attempted.filter((d) => d.status === 'PENDING').length, FAILED: attempted.filter((d) => d.status === 'FAILED').length, REFUNDED: attempted.filter((d) => d.status === 'REFUNDED').length };

  return {
    currency,
    label: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    totalAmount: Math.round(totalAmount * 100) / 100,
    donors: totalDonors,
    average: totalDonors ? Math.round((totalAmount / totalDonors) * 100) / 100 : 0,
    monthlyDonors,
    largest: largest ? Math.round(Number(largest.amount) * 100) / 100 : 0,
    largestDonor: largest && !largest.isAnonymous ? largest.donorName || 'Guest' : null,
    recurringRevenue: Math.round(recurringRevenue * 100) / 100,
    conversionRate,
    daily,
    monthly,
    campaignPerformance,
    byAmount,
    oneTimeIfMonthly,
    byCountry: [...byCountry.entries()].map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 })),
    byStatus
  };
}

/* ---------------- Donor account ---------------- */

async function listForUser(userId) {
  const donations = await prisma.donation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { campaign: true }
  });
  return donations.map((d) => serialize(d, d.campaign));
}

async function getOwned(id, userId) {
  const donation = await prisma.donation.findUnique({ where: { id }, include: { campaign: true } });
  if (!donation) {
    const err = new Error('Donation not found.');
    err.status = 404;
    throw err;
  }
  if (donation.userId !== userId) {
    const err = new Error('You can only view your own donations.');
    err.status = 403;
    throw err;
  }
  return serialize(donation, donation.campaign);
}

async function updateDonor(id, userId, body) {
  const donation = await prisma.donation.findUnique({ where: { id } });
  if (!donation) {
    const err = new Error('Donation not found.');
    err.status = 404;
    throw err;
  }
  if (donation.userId !== userId) {
    const err = new Error('You can only update your own donations.');
    err.status = 403;
    throw err;
  }
  const anonymous = body.isAnonymous !== undefined ? Boolean(body.isAnonymous) : donation.isAnonymous;
  const showOnWall = anonymous
    ? false
    : body.showOnWall !== undefined
      ? Boolean(body.showOnWall)
      : donation.showOnWall;
  const updated = await prisma.donation.update({
    where: { id },
    data: {
      donorName:
        body.donorName !== undefined
          ? anonymous
            ? null
            : String(body.donorName).trim() || null
          : donation.donorName,
      donorEmail:
        body.donorEmail !== undefined
          ? anonymous
            ? null
            : String(body.donorEmail).trim() || null
          : donation.donorEmail,
      isAnonymous: anonymous,
      showOnWall
    }
  });
  return serialize(updated);
}

async function setRecurring(id, userId, recurring) {
  const donation = await prisma.donation.findUnique({ where: { id } });
  if (!donation) {
    const err = new Error('Donation not found.');
    err.status = 404;
    throw err;
  }
  if (donation.userId !== userId) {
    const err = new Error('You can only manage your own donations.');
    err.status = 403;
    throw err;
  }
  const updated = await prisma.donation.update({
    where: { id },
    data: { recurring: Boolean(recurring) }
  });
  return serialize(updated);
}

async function receipt(id, userId) {
  const donation = await prisma.donation.findUnique({ where: { id }, include: { campaign: true } });
  if (!donation) {
    const err = new Error('Donation not found.');
    err.status = 404;
    throw err;
  }
  if (donation.userId !== userId) {
    const err = new Error('You can only view your own receipts.');
    err.status = 403;
    throw err;
  }
  return serialize(donation, donation.campaign);
}

/* Simulates sending the receipt by email (demo mailer). */
async function emailReceipt(id, userId) {
  const donation = await prisma.donation.findUnique({ where: { id }, include: { campaign: true } });
  if (!donation) {
    const err = new Error('Donation not found.');
    err.status = 404;
    throw err;
  }
  if (donation.userId !== userId) {
    const err = new Error('You can only email your own receipts.');
    err.status = 403;
    throw err;
  }
  return {
    ok: true,
    emailed: donation.donorEmail,
    donationId: donation.donationNumber,
    at: new Date().toISOString()
  };
}

async function setMessageStatus(donationNumber, messageStatus, actorName) {
  const donation = await prisma.donation.findUnique({ where: { donationNumber } });
  if (!donation) {
    const err = new Error('Donation not found.');
    err.status = 404;
    throw err;
  }
  const status = ['approved', 'hidden', 'pending'].includes(messageStatus) ? messageStatus : 'pending';
  const updated = await prisma.donation.update({
    where: { id: donation.id },
    data: { messageStatus: status, updatedAt: new Date() }
  });
  return withCampaign(updated);
}

async function donationSettings(fields) {
  const allowed = [
    'enabled',
    'minAmount',
    'maxAmount',
    'suggestedAmounts',
    'monthlyAmounts',
    'purposes',
    'allowAnonymous',
    'allowMonthly',
    'allowMessages',
    'allowCampaigns',
    'sendEmailReceipt',
    'showProgress',
    'message',
    'showOnHomepage',
    'showSupporterWall',
    'messageApproval',
    'messageDisplay',
    'notifications'
  ];
  const prefix = 'donation.';
  const out = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) out[key] = fields[key];
  }
  return out;
}

function adminDonationSettings() {
  return (store && store.settings && store.settings.donation) || {};
}

module.exports = {
  create,
  confirmDemoPayment,
  list,
  refund,
  refundHistory,
  summary,
  supporters,
  donors,
  reports,
  listForUser,
  getOwned,
  updateDonor,
  setRecurring,
  receipt,
  emailReceipt,
  setMessageStatus,
  donationSettings,
  adminDonationSettings
};