-- Fix literal "undefined" values that break parseFloat in financial calculations
UPDATE "Settings" SET value = '0',       "updatedAt" = NOW() WHERE key = 'platformFee'        AND value = 'undefined';
UPDATE "Settings" SET value = '100',     "updatedAt" = NOW() WHERE key = 'minInvestmentAmount' AND value = 'undefined';
UPDATE "Settings" SET value = '1000000', "updatedAt" = NOW() WHERE key = 'maxInvestmentAmount' AND value = 'undefined';

-- Ensure base financial settings rows exist (do not overwrite valid existing values)
INSERT INTO "Settings" (id, key, value, category, "updatedAt", "createdAt")
VALUES
  (gen_random_uuid(), 'platformFee',        '0',       'general', NOW(), NOW()),
  (gen_random_uuid(), 'minInvestmentAmount','100',     'general', NOW(), NOW()),
  (gen_random_uuid(), 'maxInvestmentAmount','1000000', 'general', NOW(), NOW())
ON CONFLICT (key) DO NOTHING;

-- Feature flags — purchaseEnabled starts false (must be explicitly enabled by admin)
INSERT INTO "Settings" (id, key, value, category, description, "updatedAt", "createdAt")
VALUES
  (gen_random_uuid(), 'purchaseEnabled',    'false', 'features', 'تفعيل/إيقاف خدمة الاستثمار',  NOW(), NOW()),
  (gen_random_uuid(), 'depositEnabled',     'true',  'features', 'تفعيل/إيقاف خدمة الإيداع',    NOW(), NOW()),
  (gen_random_uuid(), 'withdrawalEnabled',  'true',  'features', 'تفعيل/إيقاف خدمة السحب',      NOW(), NOW()),
  (gen_random_uuid(), 'walletEnabled',      'true',  'features', 'تفعيل/إيقاف المحفظة',          NOW(), NOW()),
  (gen_random_uuid(), 'deedIssuanceEnabled','true',  'features', 'تفعيل/إيقاف إصدار الصكوك',    NOW(), NOW()),
  (gen_random_uuid(), 'deedExportEnabled',  'true',  'features', 'تفعيل/إيقاف تصدير الصكوك',    NOW(), NOW()),
  (gen_random_uuid(), 'blockchainEnabled',  'false', 'features', 'تفعيل/إيقاف البلوكشين',       NOW(), NOW()),
  (gen_random_uuid(), 'distributionEnabled','true',  'features', 'تفعيل/إيقاف التوزيعات',       NOW(), NOW()),
  (gen_random_uuid(), 'notificationsEnabled','false', 'features', 'تفعيل/إيقاف الإشعارات',      NOW(), NOW()),
  (gen_random_uuid(), 'maintenanceMode',    'false', 'features', 'وضع الصيانة',                  NOW(), NOW())
ON CONFLICT (key) DO NOTHING;
