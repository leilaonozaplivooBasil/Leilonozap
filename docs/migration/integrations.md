# Integrações externas — Leilão NoZap

## Functions agrupadas por integração

### ASAAS (16 functions)

- `asaasReconcilePayments`
- `asaasWebhook`
- `checkPartnerPlanPayment`
- `checkPaymentStatus`
- `createAsaasPayment`
- `createPartnerPlanPix`
- `dailyReport`
- `getAsaasReconciliation`
- `getAsaasTransactions`
- `linkPaymentToCatalogSale`
- `listAsaasPayments`
- `mercadoPagoWebhook`
- `registerAsaasWebhook`
- `releaseExpiredReservations`
- `repairWalletDeposit`
- `retryFailedWebhooks`

### BREVO (11 functions)

- `commissionPilot`
- `inspectAndFixUserCommissions`
- `notifyFavoriteBid`
- `previewCatalogCommission`
- `processAuctionInfluencerCommission`
- `processCatalogCommission`
- `sendAuctionReminder24h`
- `sendPasswordResetEmail`
- `sendWelcomeArrematante`
- `syncCommissionLogicProduction`
- `testBrevoEmail`

### MERCADOPAGO (15 functions)

- `createMPPayment`
- `debugCatalogCommission`
- `debugRealPayment`
- `manualPaymentApproval`
- `mergeAppUsers`
- `reconcileOrphanPayment`
- `registerMPWebhook`
- `reprocessMercadoPagoPayment`
- `showAppId`
- `testCardPayment`
- `testCatalogSaleE2E`
- `testRealToken`
- `trackCatalogSale`
- `trackPaymentFlow`
- `validateMPCredentials`

### OPENAI (1 functions)

- `transcribeAudio`

### SERPAPI (7 functions)

- `comparaiPrices`
- `extractGoogleShoppingImages`
- `extractMLImages`
- `precificaVivo`
- `scrapeWithFallback`
- `searchGoogleShopping`
- `searchProductByName`

## Variáveis de ambiente referenciadas em functions

| Variável | Usos |
|---|---:|
| `MP_ACCESS_TOKEN` | 8 |
| `ASAAS_API_KEY` | 7 |
| `SERPAPI_KEY` | 6 |
| `BREVO_API_KEY` | 5 |
| `BREVO_WHATSAPP_NUMBER` | 2 |
| `BASE44_APP_ID` | 2 |
| `ASAAS_WEBHOOK_TOKEN` | 1 |
| `ECOSYSTEM_CORE_URL` | 1 |
| `ECOSYSTEM_CORE_KEY` | 1 |
| `OPENAI_API_KEY` | 1 |
| `MP_PUBLIC_KEY` | 1 |
