const prisma = require('../lib/prisma');

function slugify(title) {
  return (
    String(title || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'campaign'
  );
}

function serialize(c, raised = 0, count = 0) {
  const goal = Number(c.goal);
  return {
    id: c.id,
    title: c.title,
    slug: c.slug,
    description: c.description,
    banner: c.banner || null,
    purpose: c.purpose || null,
    goal,
    currency: c.currency,
    status: c.status,
    featured: c.featured,
    raised: Math.round(raised * 100) / 100,
    donorsCount: count,
    fundedPercent: goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0,
    startsAt: c.startsAt ? c.startsAt.toISOString() : null,
    endsAt: c.endsAt ? c.endsAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString()
  };
}

async function progress(c) {
  const agg = await prisma.donation.aggregate({
    where: { campaignId: c.id, status: 'PAID' },
    _sum: { amount: true },
    _count: true
  });
  return [agg._sum.amount ? Number(agg._sum.amount) : 0, agg._count];
}

async function list({ includeInactive = false } = {}) {
  const where = includeInactive ? {} : { status: 'ACTIVE' };
  const campaigns = await prisma.campaign.findMany({ where, orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }] });
  const out = [];
  for (const c of campaigns) {
    const [raised, count] = await progress(c);
    out.push(serialize(c, raised, count));
  }
  return out;
}

async function getById(id) {
  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) {
    const err = new Error('Campaign not found.');
    err.status = 404;
    throw err;
  }
  const [raised, count] = await progress(campaign);
  return serialize(campaign, raised, count);
}

async function getBySlug(slug) {
  const campaign = await prisma.campaign.findUnique({ where: { slug } });
  if (!campaign || campaign.status !== 'ACTIVE') {
    const err = new Error('Campaign not found.');
    err.status = 404;
    throw err;
  }
  const [raised, count] = await progress(campaign);
  return serialize(campaign, raised, count);
}

async function create(body) {
  const title = String(body.title || '').trim();
  if (!title) {
    const err = new Error('Campaign title is required.');
    err.status = 400;
    throw err;
  }
  const goal = Number(body.goal);
  if (!goal || goal <= 0) {
    const err = new Error('A valid goal amount is required.');
    err.status = 400;
    throw err;
  }
  let slug = String(body.slug || '').trim().toLowerCase() || slugify(title);
  const existing = await prisma.campaign.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;
  const campaign = await prisma.campaign.create({
    data: {
      title,
      slug,
      description: String(body.description || ''),
      banner: body.banner || null,
      purpose: body.purpose || null,
      goal: body.goal,
      currency: body.currency || 'AED',
      status: ['ACTIVE', 'PAUSED', 'ENDED'].includes(body.status) ? body.status : 'ACTIVE',
      featured: Boolean(body.featured),
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null
    }
  });
  return getById(campaign.id);
}

async function update(id, body) {
  const existing = await prisma.campaign.findUnique({ where: { id } });
  if (!existing) {
    const err = new Error('Campaign not found.');
    err.status = 404;
    throw err;
  }
  let slug = existing.slug;
  if (body.slug) {
    const raw = String(body.slug).trim().toLowerCase();
    const candidate = raw || slugify(body.title || existing.title);
    const clash = await prisma.campaign.findUnique({ where: { slug: candidate } });
    if (clash && clash.id !== id) slug = `${candidate}-${Date.now().toString(36)}`;
    else slug = candidate;
  }
  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      title: body.title !== undefined ? String(body.title).trim() || existing.title : existing.title,
      slug,
      description: body.description !== undefined ? String(body.description) : existing.description,
      banner: body.banner !== undefined ? body.banner : existing.banner,
      purpose: body.purpose !== undefined ? body.purpose : existing.purpose,
      goal: body.goal !== undefined && Number(body.goal) > 0 ? body.goal : existing.goal,
      currency: body.currency || existing.currency,
      status: body.status !== undefined && ['ACTIVE', 'PAUSED', 'ENDED'].includes(body.status) ? body.status : existing.status,
      featured: body.featured !== undefined ? Boolean(body.featured) : existing.featured,
      startsAt: body.startsAt !== undefined ? (body.startsAt ? new Date(body.startsAt) : null) : existing.startsAt,
      endsAt: body.endsAt !== undefined ? (body.endsAt ? new Date(body.endsAt) : null) : existing.endsAt
    }
  });
  return getById(campaign.id);
}

async function remove(id) {
  await prisma.donation.updateMany({ where: { campaignId: id }, data: { campaignId: null } });
  const res = await prisma.campaign.delete({ where: { id } }).catch(() => null);
  return { ok: Boolean(res) };
}

module.exports = { list, getById, getBySlug, create, update, remove, slugify };