import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { env } from '@/lib/env'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[stripe/webhook] Signature verification failed:', message)
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  try {
    switch (event.type) {
      // ── Phase 1: Card setup ───────────────────────────────────────────
      case 'setup_intent.succeeded': {
        const setupIntent = event.data.object as Stripe.SetupIntent
        console.log('[webhook] setup_intent.succeeded', {
          setupIntentId: setupIntent.id,
          customer: setupIntent.customer,
          paymentMethod: setupIntent.payment_method,
        })

        const pmId = typeof setupIntent.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id

        if (!pmId) {
          console.warn('[webhook] No payment_method on SetupIntent — skipping')
          break
        }

        console.log('[webhook] Retrieving payment method:', pmId)
        const paymentMethod = await stripe.paymentMethods.retrieve(pmId)
        const card = paymentMethod.card
        console.log('[webhook] Payment method retrieved', {
          pmId,
          type: paymentMethod.type,
          hasCard: !!card,
          pmCustomer: paymentMethod.customer,
        })

        if (!card) {
          console.warn('[webhook] Payment method has no card data — skipping')
          break
        }

        // Customer may be null on the SetupIntent even when created with one.
        // Fall back to the payment method's customer.
        let customerId = typeof setupIntent.customer === 'string'
          ? setupIntent.customer
          : setupIntent.customer?.id

        if (!customerId) {
          console.log('[webhook] setupIntent.customer is null — falling back to paymentMethod.customer')
          customerId = typeof paymentMethod.customer === 'string'
            ? paymentMethod.customer
            : paymentMethod.customer?.id
        }

        if (!customerId) {
          console.error('[webhook] No customer found on SetupIntent or PaymentMethod — cannot save card')
          break
        }

        console.log('[webhook] Looking up user by stripeCustomerId:', customerId)
        const user = await prisma.user.findUnique({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        })

        if (!user) {
          console.error('[webhook] No user found for stripeCustomerId:', customerId)
          break
        }

        console.log('[webhook] Saving card to user:', user.id)
        await prisma.user.update({
          where: { stripeCustomerId: customerId },
          data: {
            stripePaymentMethodId: pmId,
            paymentMethodStatus: 'SAVED',
            cardLast4: card.last4,
            cardBrand: card.brand ?? 'card',
            cardExpiry: `${String(card.exp_month).padStart(2, '0')}/${String(card.exp_year).slice(-2)}`,
          },
        })
        console.log('[webhook] Card saved to DB')

        // Set as default payment method on the customer
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: pmId },
        })
        console.log('[webhook] Default PM set on Stripe customer:', customerId)
        break
      }

      // ── Phase 2: PaymentIntent lifecycle ────────────────────────────
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const paymentId = pi.metadata?.paymentId
        const metaType = pi.metadata?.type
        console.log('[webhook] payment_intent.succeeded', { piId: pi.id, paymentId, metaType })

        // ── Credit pack purchase (Scenario B — new card) ────────────
        if (metaType === 'credit_pack') {
          const packId = pi.metadata?.packId as string | undefined
          const userId = pi.metadata?.userId as string | undefined
          const credits = parseInt(pi.metadata?.credits ?? '0', 10)

          if (!packId || !userId || !credits) {
            console.error('[webhook] credit_pack missing metadata', pi.metadata)
            break
          }

          // Idempotent: check if Payment already exists for this PI
          const existingPayment = await prisma.payment.findUnique({
            where: { stripePaymentIntentId: pi.id },
          })

          if (existingPayment) {
            console.log('[webhook] credit_pack already processed:', pi.id)
            break
          }

          // Create ScreeningPackage + Payment in transaction
          await prisma.$transaction(async (tx) => {
            const sp = await tx.screeningPackage.create({
              data: {
                userId,
                packageType: packId as 'SINGLE' | 'TRIPLE' | 'SIXER' | 'TEN',
                totalCredits: credits,
                usedCredits: 0,
                pricePence: pi.amount,
                paymentStatus: 'PAID',
              },
            })

            await tx.payment.create({
              data: {
                userId,
                amountPence: pi.amount,
                reason: `CREDIT_PACK_${packId}`,
                status: 'succeeded',
                stripePaymentIntentId: pi.id,
                referenceId: sp.id,
                metadata: { packId, credits },
              },
            })
          })

          // Save card for future use if setup_future_usage was set
          const pmId = typeof pi.payment_method === 'string'
            ? pi.payment_method
            : (pi.payment_method as Stripe.PaymentMethod | null)?.id

          if (pmId) {
            const pm = await stripe.paymentMethods.retrieve(pmId)
            const card = pm.card
            if (card) {
              await prisma.user.update({
                where: { id: userId },
                data: {
                  stripePaymentMethodId: pmId,
                  paymentMethodStatus: 'SAVED',
                  cardLast4: card.last4,
                  cardBrand: card.brand ?? 'card',
                  cardExpiry: `${String(card.exp_month).padStart(2, '0')}/${String(card.exp_year).slice(-2)}`,
                },
              })

              // Set as default PM on customer
              const customerId = typeof pi.customer === 'string' ? pi.customer : null
              if (customerId) {
                await stripe.customers.update(customerId, {
                  invoice_settings: { default_payment_method: pmId },
                })
              }
              console.log('[webhook] Card saved from credit_pack purchase:', userId)
            }
          }

          console.log('[webhook] credit_pack fulfilled:', { userId, packId, credits, piId: pi.id })
          break
        }

        // ── Existing screening unlock flow ──────────────────────────
        if (!paymentId) break

        // Update Payment record
        await prisma.payment.updateMany({
          where: { id: paymentId, status: { not: 'succeeded' } },
          data: { status: 'succeeded', stripePaymentIntentId: pi.id },
        })

        // If screening reason: idempotent unlock
        const reason = pi.metadata?.reason
        const referenceId = pi.metadata?.referenceId
        if (
          referenceId &&
          (reason === 'SCREENING_FIRST' || reason === 'SCREENING_ADDITIONAL')
        ) {
          const report = await prisma.financialReport.findUnique({
            where: { id: referenceId },
            select: { id: true, isLocked: true, inviteId: true },
          })

          if (report?.isLocked) {
            await prisma.financialReport.update({
              where: { id: referenceId },
              data: { isLocked: false },
            })
            if (report.inviteId) {
              await prisma.screeningInvite.update({
                where: { id: report.inviteId },
                data: { status: 'PAID', updatedAt: new Date() },
              })
            }
            console.log('[webhook] Report unlocked via webhook:', referenceId)
          }
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const paymentId = pi.metadata?.paymentId
        console.log('[webhook] payment_intent.payment_failed', { piId: pi.id, paymentId })

        if (paymentId) {
          await prisma.payment.updateMany({
            where: { id: paymentId },
            data: { status: 'failed' },
          })
        }
        break
      }

      // ── Phase 2: Subscription lifecycle ─────────────────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        console.log('[webhook] customer.subscription.updated', { subId: sub.id, status: sub.status })

        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const subUser = await prisma.user.findUnique({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        })
        if (!subUser) {
          console.error('[webhook] No user for customer:', customerId)
          break
        }

        const dbStatus = mapStripeSubStatus(sub.status)
        const item = sub.items.data[0]
        const quantity = item?.quantity ?? 0
        const periodEnd = item?.current_period_end
          ? new Date(item.current_period_end * 1000)
          : null

        await prisma.user.update({
          where: { id: subUser.id },
          data: {
            subscriptionStatus: dbStatus,
            subscriptionPropertyCount: quantity + 1, // quantity = billable (extra) properties
            subscriptionMonthlyAmount: quantity * 1000, // £10/mo per extra property
            currentPeriodEnd: periodEnd,
          },
        })
        console.log('[webhook] Subscription synced for user:', subUser.id, dbStatus)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        console.log('[webhook] customer.subscription.deleted', { subId: sub.id })

        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const subUser = await prisma.user.findUnique({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        })
        if (!subUser) break

        await prisma.user.update({
          where: { id: subUser.id },
          data: {
            subscriptionStatus: 'CANCELLED',
            currentPeriodEnd: null,
            stripeSubscriptionId: null,
          },
        })
        console.log('[webhook] Subscription deleted for user:', subUser.id)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = getInvoiceSubscriptionId(invoice)
        console.log('[webhook] invoice.payment_failed', { invoiceId: invoice.id, subId })

        if (subId) {
          const subUser = await prisma.user.findUnique({
            where: { stripeSubscriptionId: subId },
            select: { id: true },
          })
          if (subUser) {
            await prisma.user.update({
              where: { id: subUser.id },
              data: { subscriptionStatus: 'PAST_DUE' },
            })
            console.log('[webhook] Subscription set PAST_DUE for user:', subUser.id)
          }
        }
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = getInvoiceSubscriptionId(invoice)
        console.log('[webhook] invoice.paid', { invoiceId: invoice.id, subId })

        if (subId) {
          // Restore to ACTIVE only if currently PAST_DUE
          await prisma.user.updateMany({
            where: {
              stripeSubscriptionId: subId,
              subscriptionStatus: 'PAST_DUE',
            },
            data: { subscriptionStatus: 'ACTIVE' },
          })
        }
        break
      }

      case 'checkout.session.completed': {
        console.log(`[stripe/webhook] checkout.session.completed (not handled — using PaymentIntent flow)`)
        break
      }

      default:
        console.log(`[stripe/webhook] Unhandled event: ${event.type}`)
    }
  } catch (err) {
    console.error(`[stripe/webhook] Error handling ${event.type}:`, err)
    // Return 200 anyway to prevent Stripe retries for handler errors
    // (Stripe would re-send on 5xx, causing duplicate processing)
  }

  return NextResponse.json({ received: true })
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | undefined {
  const subDetails = invoice.parent?.subscription_details
  if (!subDetails) return undefined
  return typeof subDetails.subscription === 'string'
    ? subDetails.subscription
    : subDetails.subscription?.id
}

function mapStripeSubStatus(
  status: Stripe.Subscription.Status,
): 'NONE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'ACTIVE'
    case 'past_due':
      return 'PAST_DUE'
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'CANCELLED'
    default:
      return 'ACTIVE'
  }
}
