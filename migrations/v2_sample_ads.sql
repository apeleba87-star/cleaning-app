-- Sample ad campaign for V2 testing (run after v2_initial_schema.sql)
INSERT INTO v2_ad_advertisers (id, name, contact_name)
VALUES ('a0000000-0000-4000-8000-000000000001', '무플 파트너', '데모')
ON CONFLICT DO NOTHING;

INSERT INTO v2_ad_campaigns (
  id, advertiser_id, name, status, slot_key, priority,
  start_at, interstitial_seconds, target_roles
)
VALUES (
  'c0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  'V2 런치 프로모',
  'active',
  'staff_home',
  10,
  now() - interval '1 day',
  3,
  ARRAY['staff'::v2_user_role, 'business_owner'::v2_user_role]
)
ON CONFLICT DO NOTHING;

INSERT INTO v2_ad_creatives (campaign_id, title, body, link_url)
VALUES (
  'c0000000-0000-4000-8000-000000000001',
  '청소 용품 특가',
  '지역 업체 직거래 — 무플 무료 회원 전용',
  'https://mupl.co.kr'
)
ON CONFLICT DO NOTHING;
